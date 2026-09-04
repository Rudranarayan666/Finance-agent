import os
import hashlib
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.models import User, Document, DocumentAccess
from backend.app.schemas.schemas import DocumentSummary, DocumentShareRequest
from backend.app.auth.auth import get_current_user, check_document_access, require_role
from backend.app.core.audit import log_audit_event
from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError

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
    
    from backend.app.core.security_scanner import SecurityScanner
    from backend.app.rag.rag_service import rag_service

    is_safe, reason, blockchain_seal = SecurityScanner.inspect_pdf(contents, file.filename)
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
        parser = PDFDocumentParser(file_path)
        extracted = parser.extract_pages()
        total_pages = extracted["total_pages"]
        # Instant RAG indexing for chat
        rag_service.index_document_chunks(file_hash, extracted["pages"])
    except PDFParserError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"PDF Validation Error: {str(e)}"
        )

    # 5. Create DB record
    retention_until = datetime.utcnow() + timedelta(days=settings.DATA_RETENTION_DAYS)
    new_doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        file_hash=file_hash,
        total_pages=total_pages,
        status="uploaded",
        uploaded_by_id=current_user.id,
        organization_id=current_user.organization_id,
        is_org_shared=False,
        data_retention_until=retention_until
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Also associate rag_service index with document ID
    rag_service.index_document_chunks(new_doc.id, extracted["pages"])

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
            "blockchain_receipt": blockchain_seal.get("block_receipt")
        }
    )

    return DocumentSummary(
        id=new_doc.id,
        filename=new_doc.filename,
        file_size_bytes=new_doc.file_size_bytes,
        total_pages=new_doc.total_pages,
        company_name=new_doc.company_name,
        fiscal_period=new_doc.fiscal_period,
        status=new_doc.status,
        uploaded_at=new_doc.uploaded_at,
        uploaded_by=current_user.email,
        is_org_shared=new_doc.is_org_shared,
        blockchain_seal=blockchain_seal
    )


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
