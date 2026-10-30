import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.models import User, Document, ChatSession, ChatMessage, EvidenceRecord
from backend.app.auth.auth import get_current_user, check_document_access
from backend.app.core.audit import log_audit_event
from backend.app.core.security_scanner import SecurityScanner
from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError
from backend.app.parser.document_parser import DocumentParser, DocumentParserError
from backend.app.rag.rag_service import rag_service
from backend.app.services.credit_service import CreditService
from backend.app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/chat", tags=["Grounded Chat & Attachments"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    document_id: Optional[str] = None
    document_version: Optional[str] = "v1"
    citations: List[dict]
    verification: Optional[dict] = None
    grounded: bool
    confidence: float
    timestamp: str


@router.post("/attach")
async def attach_pdf_in_chat(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Direct in-chat paperclip attachment: uploads PDF, validates security,
    creates SHA-256 seal, creates EvidenceRecords, and indexes for RAG chat immediately.
    """
    # SaaS Plan Verification & Active Document Capacity Limit Check
    SubscriptionService.check_active_document_limit(db, current_user)

    upload_cost = getattr(settings, "UPLOAD_CREDIT_COST", 10)
    if not (current_user.is_admin or current_user.role == "admin"):
        if not CreditService.check_available_credits(db, current_user.id, upload_cost):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "INSUFFICIENT_CREDITS",
                    "message": f"Attaching and indexing a document requires {upload_cost} credits. Please upgrade or renew your plan.",
                    "required_credits": upload_cost,
                    "upgrade_available": True
                }
            )

    contents = await file.read()
    is_safe, reason, blockchain_seal = SecurityScanner.inspect_pdf(contents, file.filename)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )

    file_size = len(contents)
    file_hash = blockchain_seal["sha256_hash"]

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{file_hash}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        parser = DocumentParser(file_path)
        extracted = parser.extract_pages()
        total_pages = extracted.get("total_pages", 0)
        if total_pages <= 0:
            raise DocumentParserError("Document contains 0 pages.")
    except (DocumentParserError, PDFParserError, Exception) as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))

    new_doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        file_hash=file_hash,
        total_pages=total_pages,
        version=1,
        document_version="v1",
        status="ready",
        uploaded_by_id=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Persist normalized evidence records for index persistence across restarts
    for p_data in extracted.get("pages", []):
        p_num = p_data.get("page_number", 1)
        p_idx = p_data.get("physical_page_index", p_num - 1)
        ev_rec = EvidenceRecord(
            document_id=new_doc.id,
            document_version="v1",
            organization_id=current_user.organization_id,
            physical_page_index=p_idx,
            physical_page_number=p_num,
            printed_page_label=p_data.get("printed_page_label"),
            section_title=None,
            content_type=p_data.get("extraction_method", "text"),
            raw_text=p_data.get("text", ""),
            table_data=p_data.get("tables"),
            bounding_boxes=p_data.get("text_blocks") or p_data.get("visual_regions"),
            extraction_method=p_data.get("extraction_method", "pymupdf"),
            extraction_confidence=p_data.get("extraction_confidence", 1.0)
        )
        db.add(ev_rec)
    db.commit()

    rag_service.index_document_chunks(new_doc.id, extracted["pages"], document_version="v1")

    # Debit upload credits upon successful completion
    if not (current_user.is_admin or current_user.role == "admin"):
        CreditService.debit_credits(
            db,
            user_id=current_user.id,
            amount=upload_cost,
            transaction_type="upload_debit",
            reason=f"In-chat document attachment: {file.filename}",
            document_id=new_doc.id,
            reference=f"attach_{new_doc.id}"
        )
        SubscriptionService.record_usage(
            db,
            user_id=current_user.id,
            operation_type="upload",
            credits_charged=upload_cost,
            document_id=new_doc.id,
            status="success",
            idempotency_key=f"attach_{new_doc.id}"
        )

    log_audit_event(
        db, action="in_chat_attach", user=current_user, document_id=new_doc.id, request=request,
        details={"filename": file.filename, "sha256_hash": file_hash}
    )

    return {
        "document_id": new_doc.id,
        "filename": new_doc.filename,
        "total_pages": new_doc.total_pages,
        "status": "ready_for_chat",
        "blockchain_seal": blockchain_seal
    }


def is_prompt_injection(message: str) -> bool:
    """Detects prompt injection and system override attempts."""
    forbidden = [
        "ignore previous instructions",
        "reveal system prompt",
        "call a tool",
        "access another document",
        "system prompt",
        "drop table",
        "override directives"
    ]
    msg_l = message.lower()
    return any(t in msg_l for t in forbidden)


@router.post("/{document_id}", response_model=ChatResponse)
def query_grounded_chat(
    document_id: str,
    chat_req: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Document-scoped grounded RAG chat endpoint with RBAC enforcement,
    Google source logging, prompt-injection defense, and exact page citation links.
    """
    # 1. RBAC Clearance: Viewer cannot query chatbot
    if current_user.role == "viewer":
        log_audit_event(
            db, action="chatbot_query_denied_role", user=current_user, document_id=document_id, request=request,
            details={"reason": "Viewer role has read-only privileges", "provider": current_user.provider or "local"}
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: AI Chatbot research queries require Analyst or Admin role clearance. Viewer role has read-only privileges."
        )

    check_document_access(document_id, current_user, db, required_permission="view")

    # 2. SaaS Document Question Cap Check (per-document allowance per billing cycle)
    SubscriptionService.check_question_limit(db, current_user, document_id)

    # 3. SaaS Credit Availability Check (15 credits per successful question)
    question_cost = getattr(settings, "QUESTION_CREDIT_COST", 15)
    if not (current_user.is_admin or current_user.role == "admin"):
        if not CreditService.check_available_credits(db, current_user.id, question_cost):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "INSUFFICIENT_CREDITS",
                    "message": f"Asking a question requires {question_cost} credits, but you do not have enough credits remaining. Please upgrade or renew your plan.",
                    "required_credits": question_cost,
                    "upgrade_available": True
                }
            )

    # Prompt Injection Sanitization
    untrusted_msg = chat_req.message.strip()
    if is_prompt_injection(untrusted_msg):
        log_audit_event(
            db, action="prompt_injection_blocked", user=current_user, document_id=document_id, request=request,
            details={"attempted_input": untrusted_msg[:100], "provider": current_user.provider or "local"}
        )
        return ChatResponse(
            session_id=chat_req.session_id or "blocked",
            answer="Security Warning: Prompt injection pattern detected and blocked. The system will answer questions strictly scoped to financial disclosures within this document.",
            citations=[],
            grounded=False,
            confidence=0.0,
            timestamp=datetime.utcnow().isoformat()
        )

    # Get or create chat session
    session = None
    if chat_req.session_id:
        session = db.query(ChatSession).filter(
            ChatSession.id == chat_req.session_id,
            ChatSession.user_id == current_user.id
        ).first()

    if not session:
        session = ChatSession(
            document_id=document_id,
            user_id=current_user.id,
            title=f"Chat: {untrusted_msg[:30]}..."
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # Query RAG Service with user role
    result = rag_service.answer_question(
        document_id=document_id,
        question=untrusted_msg,
        user_role=current_user.role
    )

    # Debit credits and record usage ONLY on successful answer generation
    if not (current_user.is_admin or current_user.role == "admin"):
        CreditService.debit_credits(
            db,
            user_id=current_user.id,
            amount=question_cost,
            transaction_type="question_debit",
            reason=f"Chatbot question on document: {untrusted_msg[:60]}",
            document_id=document_id
        )
        SubscriptionService.record_usage(
            db,
            user_id=current_user.id,
            operation_type="question",
            credits_charged=question_cost,
            document_id=document_id,
            status="success"
        )

    # Store user and assistant messages in session
    user_msg = ChatMessage(session_id=session.id, role="user", content=untrusted_msg)
    asst_msg = ChatMessage(session_id=session.id, role="assistant", content=result["answer"], citations=result["citations"])
    db.add_all([user_msg, asst_msg])
    db.commit()

    # Security logging with Google source attribution
    log_audit_event(
        db, action="chat_query", user=current_user, document_id=document_id, request=request,
        details={
            "session_id": session.id,
            "grounded": result["grounded"],
            "provider": current_user.provider or "local",
            "role": current_user.role,
            "user_email": current_user.email,
            "user_name": current_user.full_name,
            "question": untrusted_msg[:120],
            "confidence": result["confidence"],
            "citation_pages": [c.get("page") for c in result.get("citations", [])]
        }
    )

    return ChatResponse(
        session_id=session.id,
        answer=result["answer"],
        document_id=result.get("document_id", document_id),
        document_version=result.get("document_version", "v1"),
        citations=result["citations"],
        verification=result.get("verification"),
        grounded=result["grounded"],
        confidence=result["confidence"],
        timestamp=datetime.utcnow().isoformat()
    )


@router.get("/security/feed")
def get_security_chat_audit_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns live chatbot security audit feed for administrator inspection.
    Includes user identity, auth provider (Google vs local), question, and citations.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required to inspect security chat feed.")

    from backend.app.models.models import AuditLog
    logs = db.query(AuditLog).filter(
        AuditLog.action.in_(["chat_query", "prompt_injection_blocked", "chatbot_query_denied_role", "google_login"])
    ).order_by(AuditLog.timestamp.desc()).limit(50).all()

    feed = []
    for l in logs:
        feed.append({
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "action": l.action,
            "user_email": l.user_email,
            "ip_address": l.ip_address,
            "details": l.details or {}
        })
    return feed


@router.get("/sessions/{document_id}")
def list_chat_sessions(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    check_document_access(document_id, current_user, db, required_permission="view")
    sessions = db.query(ChatSession).filter(
        ChatSession.document_id == document_id,
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()

    return [
        {"id": s.id, "title": s.title, "created_at": s.created_at, "updated_at": s.updated_at}
        for s in sessions
    ]


@router.get("/messages/{session_id}")
def get_chat_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.timestamp.asc()).all()

    return [
        {"id": m.id, "role": m.role, "content": m.content, "citations": m.citations, "timestamp": m.timestamp}
        for m in messages
    ]
