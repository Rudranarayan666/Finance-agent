import os
import hashlib
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.models import User, Document, DocumentAccess, EvidenceRecord
from backend.app.schemas.schemas import DocumentSummary, DocumentShareRequest
from backend.app.auth.auth import get_current_user, check_document_access, require_role
from backend.app.core.audit import log_audit_event
from backend.app.core.security_scanner import SecurityScanner
from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError
from backend.app.parser.document_parser import DocumentParser, DocumentParserError
from backend.app.rag.rag_service import rag_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentSummary)
async def upload_financial_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(["admin", "analyst"])),
    db: Session = Depends(get_db)
):
    # 1. Rate limit / sanity checks
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    recent_uploads = db.query(Document).filter(
        Document.uploaded_by_id == current_user.id,
        Document.uploaded_at >= one_hour_ago
    ).count()

    if recent_uploads >= settings.MAX_UPLOADS_PER_HOUR and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Upload rate limit exceeded ({settings.MAX_UPLOADS_PER_HOUR} uploads/hour)."
        )

    # 2. Read contents and run SecurityScanner
    contents = await file.read()

    is_safe, reason, blockchain_seal = SecurityScanner.inspect_document(contents, file.filename)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason
        )

    file_size = len(contents)
    file_hash = blockchain_seal["sha256_hash"]
    
    # 3. Save securely to upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    saved_filename = f"{file_hash}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)

    # 4. Parse pages count and verify integrity
    try:
        parser = DocumentParser(file_path)
        extracted = parser.extract_pages()
        total_pages = extracted["total_pages"]
        if total_pages <= 0:
            raise DocumentParserError("Uploaded document contains 0 pages.")
    except (DocumentParserError, PDFParserError, Exception) as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document Validation Error: {str(e)}"
        )

    # 5. Compute SHA-256 Hash Chain and Create DB record
    prev_doc = None
    if current_user.organization_id:
        prev_doc = db.query(Document).filter(
            Document.organization_id == current_user.organization_id
        ).order_by(Document.uploaded_at.desc()).first()
    else:
        prev_doc = db.query(Document).order_by(Document.uploaded_at.desc()).first()

    prev_hash = prev_doc.chain_hash if (prev_doc and prev_doc.chain_hash) else ("0" * 64)
    chain_hash = hashlib.sha256(f"{prev_hash}:{file_hash}".encode()).hexdigest()

    retention_until = datetime.utcnow() + timedelta(days=settings.DATA_RETENTION_DAYS)
    new_doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        file_hash=file_hash,
        prev_hash=prev_hash,
        chain_hash=chain_hash,
        total_pages=total_pages,
        version=1,
        document_version="v1",
        status="ready",
        uploaded_by_id=current_user.id,
        organization_id=current_user.organization_id,
        is_org_shared=False,
        data_retention_until=retention_until
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Persist normalized multimodal evidence records
    for p_data in extracted["pages"]:
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

    # Also associate rag_service index with document ID and version
    rag_service.index_document_chunks(new_doc.id, extracted["pages"], document_version="v1")

    log_audit_event(
        db, 
        action="upload", 
        user=current_user, 
        document_id=new_doc.id, 
        request=request,
        details={
            "filename": file.filename,
            "size_bytes": file_size,
            "pages": total_pages,
            "sha256_hash": file_hash,
            "prev_hash": prev_hash,
            "chain_hash": chain_hash,
            "version": new_doc.version,
            "document_version": new_doc.document_version,
            "integrity_receipt": blockchain_seal.get("receipt") or blockchain_seal.get("block_receipt")
        }
    )

    return DocumentSummary(
        id=new_doc.id,
        filename=new_doc.filename,
        file_size_bytes=new_doc.file_size_bytes,
        total_pages=new_doc.total_pages,
        version=new_doc.version,
        document_version=new_doc.document_version,
        company_name=new_doc.company_name,
        fiscal_period=new_doc.fiscal_period,
        status=new_doc.status,
        uploaded_at=new_doc.uploaded_at,
        uploaded_by=current_user.email,
        is_org_shared=new_doc.is_org_shared,
        blockchain_seal=blockchain_seal,
        integrity_hash=blockchain_seal,
        prev_hash=prev_hash,
        chain_hash=chain_hash
    )


@router.get("/{document_id}/verify")
def verify_document_integrity(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cryptographically verifies document file bytes and SHA-256 integrity hash chain.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Underlying document file not found on disk")

    with open(doc.file_path, "rb") as f:
        file_bytes = f.read()

    actual_file_hash = hashlib.sha256(file_bytes).hexdigest()
    file_intact = (actual_file_hash == doc.file_hash)

    # Verify chain hash
    prev_h = doc.prev_hash or ("0" * 64)
    expected_chain_hash = hashlib.sha256(f"{prev_h}:{doc.file_hash}".encode()).hexdigest()
    chain_intact = (doc.chain_hash is None) or (doc.chain_hash == expected_chain_hash)

    verified = file_intact and chain_intact
    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "verified": verified,
        "status": "VERIFIED_INTEGRITY" if verified else "INTEGRITY_COMPROMISED",
        "file_hash_match": file_intact,
        "chain_hash_match": chain_intact,
        "recorded_file_hash": doc.file_hash,
        "computed_file_hash": actual_file_hash,
        "prev_hash": doc.prev_hash,
        "chain_hash": doc.chain_hash,
        "verified_at": datetime.utcnow().isoformat()
    }


@router.get("", response_model=List[DocumentSummary])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        if current_user.organization_id:
            docs = db.query(Document).filter(
                (Document.organization_id == current_user.organization_id) | (Document.organization_id.is_(None))
            ).order_by(Document.uploaded_at.desc()).all()
        else:
            docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    else:
        # Owned documents + individually shared documents + org-wide shared documents
        owned = db.query(Document).filter(Document.uploaded_by_id == current_user.id).all()
        
        shared_ids = [
            access.document_id 
            for access in db.query(DocumentAccess).filter(DocumentAccess.user_id == current_user.id).all()
        ]
        shared = db.query(Document).filter(Document.id.in_(shared_ids)).all() if shared_ids else []
        
        # Org-wide shared
        org_shared = []
        if current_user.organization_id:
            org_shared = db.query(Document).filter(
                Document.is_org_shared == True,
                Document.organization_id == current_user.organization_id
            ).all()
        else:
            org_shared = db.query(Document).filter(Document.is_org_shared == True).all()
        
        # Combine unique
        doc_map = {d.id: d for d in owned + shared + org_shared}
        docs = sorted(doc_map.values(), key=lambda d: d.uploaded_at, reverse=True)

    results = []
    for d in docs:
        uploader = db.query(User).filter(User.id == d.uploaded_by_id).first()
        results.append(DocumentSummary(
            id=d.id,
            filename=d.filename,
            file_size_bytes=d.file_size_bytes,
            total_pages=d.total_pages,
            company_name=d.company_name,
            fiscal_period=d.fiscal_period,
            status=d.status,
            uploaded_at=d.uploaded_at,
            uploaded_by=uploader.email if uploader else "unknown",
            is_org_shared=bool(d.is_org_shared)
        ))
    return results


@router.post("/{document_id}/share")
def share_document(
    document_id: str,
    share_req: DocumentShareRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db, required_permission="edit")

    # If sharing with the entire organization:
    if share_req.share_with_org:
        doc.is_org_shared = True
        if not doc.organization_id and current_user.organization_id:
            doc.organization_id = current_user.organization_id
        db.commit()

        log_audit_event(
            db, action="share_org", user=current_user, document_id=document_id, request=request,
            details={"scope": "entire_org", "permission": "view"}
        )
        return {"status": "success", "message": "Document shared with entire organization (Viewer access)"}

    # Otherwise sharing with specific user email:
    if not share_req.user_email:
        raise HTTPException(status_code=400, detail="Must provide user_email or set share_with_org to True")

    target_user = db.query(User).filter(User.email == share_req.user_email.strip()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user with given email not found")

    existing_access = db.query(DocumentAccess).filter(
        DocumentAccess.document_id == document_id,
        DocumentAccess.user_id == target_user.id
    ).first()

    if existing_access:
        existing_access.permission = share_req.permission
    else:
        new_access = DocumentAccess(
            document_id=document_id,
            user_id=target_user.id,
            permission=share_req.permission
        )
        db.add(new_access)

    db.commit()
    log_audit_event(
        db, action="share", user=current_user, document_id=document_id, request=request,
        details={"shared_with": share_req.user_email, "permission": share_req.permission}
    )
    return {"status": "success", "message": f"Document shared with {share_req.user_email}"}


from fastapi.responses import FileResponse, Response


@router.get("/{document_id}/status")
def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns real document processing & indexing status.
    States: uploaded, queued, processing, indexing, ready, failed.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    evidence_count = db.query(EvidenceRecord).filter(EvidenceRecord.document_id == document_id).count()
    return {
        "document_id": doc.id,
        "version": getattr(doc, "version", 1),
        "document_version": getattr(doc, "document_version", "v1"),
        "status": doc.status,
        "total_pages": doc.total_pages,
        "evidence_records_count": evidence_count,
        "file_hash": doc.file_hash,
        "error_message": doc.error_message
    }


@router.get("/{document_id}/page/{page_number}")
def get_document_page_content(
    document_id: str,
    page_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns exact page content and metadata for direct citation verification.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Underlying PDF file not found on disk")

    try:
        parser = DocumentParser(doc.file_path)
        extracted = parser.extract_pages()
        pages = extracted["pages"]
        
        target_page = next((p for p in pages if p["page_number"] == page_number), None)
        if not target_page:
            raise HTTPException(status_code=404, detail=f"Page {page_number} not found in document")

        return {
            "document_id": doc.id,
            "document_version": getattr(doc, "document_version", "v1"),
            "filename": doc.filename,
            "page_number": page_number,
            "physical_page_index": target_page.get("physical_page_index", page_number - 1),
            "physical_page_number": page_number,
            "printed_page_label": target_page.get("printed_page_label"),
            "total_pages": doc.total_pages,
            "text": target_page["text"],
            "char_count": target_page["char_count"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract page: {str(e)}")


@router.get("/{document_id}/page/{page_number}/image")
def get_document_page_image(
    document_id: str,
    page_number: int,
    dpi: int = 150,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Renders authenticated physical page / spreadsheet grid as a high-resolution PNG image.
    Enables click-to-verify interactive source inspector with bounding box overlays.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    try:
        parser = DocumentParser(doc.file_path)
        img_bytes = parser.render_page_image(page_number=page_number, dpi=min(dpi, 300))
        return Response(content=img_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to render page image: {str(e)}")


@router.get("/{document_id}/page/{page_number}/evidence")
def get_document_page_evidence(
    document_id: str,
    page_number: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns structured layout evidence on the page: text blocks with bounding boxes,
    extracted tables, charts, visual regions, and dimensions.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    try:
        parser = DocumentParser(doc.file_path)
        extracted = parser.extract_pages()
        pages = extracted["pages"]
        target = next((p for p in pages if p["page_number"] == page_number), None)
        if not target:
            raise HTTPException(status_code=404, detail=f"Page {page_number} not found in document")

        return {
            "document_id": doc.id,
            "document_version": getattr(doc, "document_version", "v1"),
            "page_number": page_number,
            "physical_page_index": target.get("physical_page_index", page_number - 1),
            "printed_page_label": target.get("printed_page_label"),
            "width": target.get("width"),
            "height": target.get("height"),
            "text": target.get("text"),
            "text_blocks": target.get("text_blocks", []),
            "tables": target.get("tables", []),
            "visual_regions": target.get("visual_regions", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract page evidence: {str(e)}")


@router.post("/{document_id}/reindex")
def reindex_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Idempotent re-indexing of an authorized document from disk into evidence records and RAG index.
    """
    doc = check_document_access(document_id, current_user, db, required_permission="edit")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    parser = DocumentParser(doc.file_path)
    extracted = parser.extract_pages()

    # Clear old evidence records to guarantee idempotency
    db.query(EvidenceRecord).filter(EvidenceRecord.document_id == document_id).delete()

    for p_data in extracted["pages"]:
        p_num = p_data.get("page_number", 1)
        p_idx = p_data.get("physical_page_index", p_num - 1)
        ev_rec = EvidenceRecord(
            document_id=doc.id,
            document_version=getattr(doc, "document_version", "v1"),
            organization_id=doc.organization_id,
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

    doc.status = "ready"
    db.commit()

    rag_service.index_document_chunks(doc.id, extracted["pages"], document_version=getattr(doc, "document_version", "v1"))
    log_audit_event(db, action="reindex", user=current_user, document_id=doc.id, request=request)

    return {
        "status": "success",
        "message": f"Document reindexed successfully across {len(extracted['pages'])} pages.",
        "total_pages": doc.total_pages,
        "document_version": getattr(doc, "document_version", "v1")
    }


@router.get("/{document_id}/file")
def stream_document_pdf(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Streams PDF directly to client with inline header for browser PDF page navigation (#page=X).
    """
    doc = check_document_access(document_id, current_user, db, required_permission="view")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        path=doc.file_path,
        media_type="application/pdf",
        filename=doc.filename,
        headers={"Content-Disposition": f'inline; filename="{doc.filename}"'}
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db, required_permission="edit")
    
    # Delete file from disk
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    log_audit_event(db, action="delete", user=current_user, document_id=document_id, request=request)
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted successfully"}
