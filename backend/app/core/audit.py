from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import Request
from backend.app.models.models import AuditLog, User


def log_audit_event(
    db: Session,
    action: str,
    user: Optional[User] = None,
    user_email: Optional[str] = None,
    document_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    request: Optional[Request] = None,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    ip_address = None
    if request:
        ip_address = request.client.host if request.client else None
        if "x-forwarded-for" in request.headers:
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()

    email_to_record = user.email if user else (user_email or "anonymous")
    org_id_to_record = user.organization_id if user else organization_id

    audit_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=email_to_record,
        action=action,
        document_id=document_id,
        organization_id=org_id_to_record,
        ip_address=ip_address,
        details=details
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
