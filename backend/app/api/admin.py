import os
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, Organization, AuditLog
from backend.app.schemas.schemas import UserResponse, AuditLogResponse, UserRole, InviteUserRequest
from backend.app.auth.auth import require_role
from backend.app.core.security import get_password_hash
from backend.app.core.audit import log_audit_event

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


def _format_user_resp(u: User, db: Session) -> UserResponse:
    org_name = None
    if u.organization_id:
        org = db.query(Organization).filter(Organization.id == u.organization_id).first()
        if org:
            org_name = org.name
    if not org_name:
        org_name = "FinanceCorp Global"

    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role=u.role,
        provider=u.provider or "local",
        organization_id=u.organization_id,
        organization_name=org_name,
        last_active=u.last_active or u.created_at,
        created_at=u.created_at
    )


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if current_user.organization_id:
        query = query.filter(User.organization_id == current_user.organization_id)
    users = query.order_by(User.created_at.desc()).all()
    return [_format_user_resp(u, db) for u in users]


@router.post("/invite", response_model=UserResponse)
def invite_teammate(
    invite_req: InviteUserRequest,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    clean_email = invite_req.email.lower().strip()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"User with email '{clean_email}' already exists in the organization."
        )

    full_name = invite_req.full_name or clean_email.split('@')[0].replace('.', ' ').title()
    temp_pass = os.urandom(16).hex()

    new_user = User(
        email=clean_email,
        hashed_password=get_password_hash(temp_pass),
        full_name=full_name,
        role=invite_req.role.value,
        provider="local",
        organization_id=current_user.organization_id,
        last_active=datetime.utcnow(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db,
        action="invite_teammate",
        user=current_user,
        request=request,
        details={"invited_email": clean_email, "role": invite_req.role.value}
    )

    return _format_user_resp(new_user, db)


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    new_role: UserRole,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_role = user.role
    user.role = new_role.value
    db.commit()

    log_audit_event(
        db, action="admin_change_role", user=current_user, request=request,
        details={"target_user_id": user_id, "old_role": old_role, "new_role": new_role.value}
    )
    return {"status": "success", "message": f"User role updated to {new_role.value}"}


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(100, le=300),
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    document_id: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action and action.strip():
        query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))
    if user_email and user_email.strip():
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email.strip()}%"))
    if document_id and document_id.strip():
        query = query.filter(AuditLog.document_id.ilike(f"%{document_id.strip()}%"))
        
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
