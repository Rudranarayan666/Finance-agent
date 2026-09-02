import time
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from sqlalchemy.orm import Session

from backend.app.database import get_db, SessionLocal
from backend.app.models.models import User, Document, AnalysisRecord
from backend.app.schemas.schemas import AnalysisResult, AskQuestionRequest, AskQuestionResponse
from backend.app.auth.auth import get_current_user, check_document_access
from backend.app.core.audit import log_audit_event
from backend.app.parser.pdf_parser import PDFDocumentParser
from backend.app.agents.supervisor import build_financial_analyzer_graph
from backend.app.rag.rag_service import rag_service

router = APIRouter(prefix="/analyze", tags=["Analysis & RAG"])

# In-memory job status tracking for live progress bar updates
PROCESSING_JOBS: Dict[str, Dict[str, Any]] = {}


def run_analysis_pipeline_task(document_id: str, file_path: str, user_id: str):
    """
    Background worker running the LangGraph supervisor workflow.
    """
    db = SessionLocal()
    start_time = time.time()
    try:
        PROCESSING_JOBS[document_id] = {
            "status": "processing",
            "progress_pct": 10,
            "step": "Parsing PDF pages and checking OCR requirements..."
        }

        # 1. Parse pages
        parser = PDFDocumentParser(file_path)
        extracted = parser.extract_pages()
        pages_data = extracted["pages"]
        total_pages = extracted["total_pages"]
        ocr_pages = extracted["ocr_applied_pages"]

        pages_dict = {p["page_number"]: p["text"] for p in pages_data}
        chunks = parser.create_overlapping_chunks(pages_data, chunk_size=15, overlap=2)

        PROCESSING_JOBS[document_id]["progress_pct"] = 30
        PROCESSING_JOBS[document_id]["step"] = f"Created {len(chunks)} overlapping chunks. Routing sections..."

        # 2. Index into ChromaDB for RAG
        rag_service.index_document_chunks(document_id, pages_data)

        # 3. Assemble initial graph state
        initial_state = {
            "document_id": document_id,
            "file_path": file_path,
            "uploaded_by": user_id,
            "access_level": "owner",
            "total_pages": total_pages,
            "pages_dict": pages_dict,
            "chunks": chunks,
            "company_name": None,
            "fiscal_period": None,
            "filing_type": "10-Q",
            "period_normalized": None,
            "section_map": {},
            "financial_candidates": [],
            "guidance_candidates": [],
            "risk_candidates": [],
            "metrics": [],
            "retry_count": 0,
            "validation_errors": [],
            "interpretation_summary": None,
            "claims": [],
            "final_result": None,
            "pages_processed": total_pages,
            "num_chunks_processed": len(chunks),
            "relevant_chunks": len(chunks),
            "agent_retries": 0,
            "conflicts_detected": 0,
            "ocr_applied_pages": ocr_pages,
            "total_latency_ms": 0,
            "total_llm_cost_usd": 0.0
        }

        PROCESSING_JOBS[document_id]["progress_pct"] = 55
        PROCESSING_JOBS[document_id]["step"] = "Running specialized multi-agent extraction..."

        # 4. Execute LangGraph workflow
        app_graph = build_financial_analyzer_graph()
        final_state = app_graph.invoke(initial_state)

        total_latency = int((time.time() - start_time) * 1000)
        final_result = final_state.get("final_result", {})
        final_result["processing_meta"]["total_latency_ms"] = total_latency

        PROCESSING_JOBS[document_id]["progress_pct"] = 90
        PROCESSING_JOBS[document_id]["step"] = "Saving verified analysis record..."

        # Update Document metadata
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "completed"
            doc.company_name = final_result.get("document_meta", {}).get("company_name")
            doc.fiscal_period = final_result.get("document_meta", {}).get("fiscal_period")

        # Save or update AnalysisRecord
        existing_rec = db.query(AnalysisRecord).filter(AnalysisRecord.document_id == document_id).first()
        if existing_rec:
            existing_rec.result_json = final_result
            existing_rec.latency_ms = total_latency
            existing_rec.status = "completed"
        else:
            new_rec = AnalysisRecord(
                document_id=document_id,
                result_json=final_result,
                latency_ms=total_latency,
                status="completed",
                overall_confidence=final_result.get("coverage_report", {}).get("overall_extraction_confidence", 1.0)
            )
            db.add(new_rec)

        db.commit()

        PROCESSING_JOBS[document_id] = {
            "status": "completed",
            "progress_pct": 100,
            "step": "Analysis complete.",
            "result": final_result
        }

    except Exception as e:
        db.rollback()
        PROCESSING_JOBS[document_id] = {
            "status": "failed",
            "progress_pct": 0,
            "step": f"Error: {str(e)}"
        }
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/{document_id}", status_code=status.HTTP_202_ACCEPTED)
def trigger_analysis(
    document_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db, required_permission="view")

    # Set document status to processing
    doc.status = "processing"
    db.commit()

    PROCESSING_JOBS[document_id] = {
        "status": "queued",
        "progress_pct": 5,
        "step": "Job queued for processing..."
    }

    background_tasks.add_task(
        run_analysis_pipeline_task,
        document_id=doc.id,
        file_path=doc.file_path,
        user_id=current_user.id
    )

    log_audit_event(db, action="analyze_start", user=current_user, document_id=document_id, request=request)

    return {
        "status": "accepted",
        "message": "Analysis job submitted successfully.",
        "document_id": document_id
    }


@router.get("/{document_id}")
def get_analysis_result(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db, required_permission="view")

    # Check if analysis record exists in DB
    record = db.query(AnalysisRecord).filter(AnalysisRecord.document_id == document_id).first()
    if record and record.result_json:
        # Determine user access level to pass in document_meta
        access_level = "owner" if doc.uploaded_by_id == current_user.id else "shared_viewer"
        res = dict(record.result_json)
        res["document_meta"]["access_level"] = access_level

        log_audit_event(db, action="view_analysis", user=current_user, document_id=document_id, request=request)
        return res

    # Check in-memory job status if still processing
    job_info = PROCESSING_JOBS.get(document_id)
    if job_info:
        return {
            "status": job_info.get("status"),
            "progress_pct": job_info.get("progress_pct"),
            "step": job_info.get("step")
        }

    return {
        "status": doc.status,
        "progress_pct": 0,
        "step": "Awaiting analysis trigger"
    }


@router.post("/{document_id}/ask", response_model=AskQuestionResponse)
def ask_document_question(
    document_id: str,
    ask_req: AskQuestionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_document_access(document_id, current_user, db, required_permission="view")

    result = rag_service.answer_question(
        document_id=document_id,
        question=ask_req.question
    )

    log_audit_event(
        db, 
        action="query_rag", 
        user=current_user, 
        document_id=document_id, 
        request=request,
        details={"question": ask_req.question, "grounded": result["grounded"]}
    )

    return AskQuestionResponse(
        answer=result["answer"],
        citations=result["citations"],
        grounded=result["grounded"],
        confidence=result["confidence"]
    )
