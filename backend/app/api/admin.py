from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, AuditLog
from backend.app.schemas.schemas import UserResponse, AuditLogResponse, UserRole
from backend.app.auth.auth import require_role
from backend.app.core.audit import log_audit_event

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


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
    limit: int = Query(50, le=200),
    action: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
