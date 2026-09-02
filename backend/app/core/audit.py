from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from backend.app.models.models import AuditLog, User


def log_audit_event(
    db: Session,
    action: str,
    user: Optional[User] = None,
    document_id: Optional[str] = None,
    request: Optional[Request] = None,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None
        if "x-forwarded-for" in request.headers:
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()

    audit_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "anonymous",
        action=action,
        document_id=document_id,
        ip_address=ip_address,
        details=details
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
