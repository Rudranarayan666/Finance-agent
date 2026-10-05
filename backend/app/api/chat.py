import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.models import User, Document, ChatSession, ChatMessage
from backend.app.auth.auth import get_current_user, check_document_access
from backend.app.core.audit import log_audit_event
from backend.app.core.security_scanner import SecurityScanner
from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError
from backend.app.rag.rag_service import rag_service

router = APIRouter(prefix="/chat", tags=["Grounded Chat & Attachments"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[dict]
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
    creates SHA-256 seal, indexes for RAG chat immediately.
    """
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
        parser = PDFDocumentParser(file_path)
        extracted = parser.extract_pages()
        total_pages = extracted["total_pages"]
    except PDFParserError as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))

    new_doc = Document(
        filename=file.filename,
        file_path=file_path,
        file_size_bytes=file_size,
        file_hash=file_hash,
        total_pages=total_pages,
        status="uploaded",
        uploaded_by_id=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    rag_service.index_document_chunks(new_doc.id, extracted["pages"])

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

    # Prompt Injection Sanitization
    untrusted_msg = chat_req.message.strip()
    forbidden_injection_terms = ["ignore previous instructions", "reveal system prompt", "call a tool", "access another document"]
    for term in forbidden_injection_terms:
        if term in untrusted_msg.lower():
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
        citations=result["citations"],
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
