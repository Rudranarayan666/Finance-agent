import os
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.models import (
    User, Organization, AuditLog, Document, Subscription, Plan,
    CreditAccount, CreditTransaction, UsageRecord, Payment, EvidenceRecord
)
from backend.app.schemas.schemas import (
    UserResponse, AuditLogResponse, UserRole, InviteUserRequest,
    AdminOverviewResponse, CreditAdjustRequest, AdminPlanChangeRequest
)
from backend.app.auth.auth import require_role
from backend.app.core.security import get_password_hash
from backend.app.core.audit import log_audit_event
from backend.app.services.credit_service import CreditService
from backend.app.parser.document_parser import DocumentParser
from backend.app.rag.rag_service import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin Operations"])


def _format_admin_user_resp(u: User, db: Session) -> Dict[str, Any]:
    sub = db.query(Subscription).filter(
        Subscription.user_id == u.id,
        Subscription.status == "active"
    ).first()
    cred = db.query(CreditAccount).filter(CreditAccount.user_id == u.id).first()
    doc_count = db.query(Document).filter(Document.uploaded_by_id == u.id).count()

    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_admin": bool(u.is_admin or u.role == "admin"),
        "is_active": u.is_active,
        "provider": u.provider or "local",
        "organization_id": u.organization_id,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "last_active": u.last_active.isoformat() if u.last_active else None,
        "plan_key": sub.plan.key if (sub and sub.plan) else ("premium" if u.is_admin else "none"),
        "plan_name": sub.plan.name if (sub and sub.plan) else ("Enterprise Admin" if u.is_admin else "No Plan"),
        "subscription_status": sub.status if sub else ("active" if u.is_admin else "none"),
        "credits_balance": cred.balance if cred else (10000 if u.is_admin else 0),
        "document_count": doc_count
    }


@router.get("/overview", response_model=AdminOverviewResponse)
def get_admin_overview(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Returns platform-wide metrics: users, subscriptions, calculated MRR,
    payments, documents, questions, credits consumed, and recent events.
    """
    total_users = db.query(User).count()
    active_subs = db.query(Subscription).filter(Subscription.status == "active").all()
    active_subscriptions = len(active_subs)

    # Plan distribution
    plan_dist = {"basic": 0, "pro": 0, "premium": 0}
    mrr_inr = 0

    for s in active_subs:
        if s.plan:
            k = s.plan.key.lower()
            plan_dist[k] = plan_dist.get(k, 0) + 1
            mrr_inr += s.plan.price

    # Payments
    successful_payments = db.query(Payment).filter(Payment.status == "captured").count()
    failed_payments = db.query(Payment).filter(Payment.status == "failed").count()

    # Documents & Usage
    total_documents = db.query(Document).count()
    total_questions = db.query(UsageRecord).filter(
        UsageRecord.operation_type == "question",
        UsageRecord.status == "success"
    ).count()

    total_credits_consumed = db.query(func.sum(UsageRecord.credits_charged)).scalar() or 0

    # Recent security and app events
    recent_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
    recent_events = [
        {
            "id": l.id,
            "action": l.action,
            "user_email": l.user_email,
            "timestamp": l.timestamp.isoformat(),
            "details": l.details
        }
        for l in recent_logs
    ]

    return AdminOverviewResponse(
        total_users=total_users,
        active_subscriptions=active_subscriptions,
        plan_distribution=plan_dist,
        mrr_inr=mrr_inr,
        successful_payments=successful_payments,
        failed_payments=failed_payments,
        total_documents=total_documents,
        total_questions=total_questions,
        total_credits_consumed=int(total_credits_consumed),
        recent_events=recent_events
    )


@router.get("/users")
def list_admin_users(
    query: Optional[str] = None,
    plan_key: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Lists users across the application with subscription, plan, and credit details.
    """
    q = db.query(User)
    if query and query.strip():
        term = f"%{query.strip().lower()}%"
        q = q.filter((User.email.ilike(term)) | (User.full_name.ilike(term)))

    users = q.order_by(User.created_at.desc()).all()
    results = [_format_admin_user_resp(u, db) for u in users]

    if plan_key and plan_key.strip():
        results = [r for r in results if r["plan_key"] == plan_key.strip().lower()]

    return results


@router.get("/users/{user_id}")
def get_admin_user_details(
    user_id: str,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Inspects user account metadata, usage history, transactions, and documents.
    Protects user password hashes and API secrets.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_info = _format_admin_user_resp(user, db)

    # Documents owned
    docs = db.query(Document).filter(Document.uploaded_by_id == user_id).order_by(Document.uploaded_at.desc()).all()
    documents_data = [
        {
            "id": d.id,
            "filename": d.filename,
            "file_size_bytes": d.file_size_bytes,
            "total_pages": d.total_pages,
            "status": d.status,
            "uploaded_at": d.uploaded_at.isoformat()
        }
        for d in docs
    ]

    # Recent credit transactions
    txs = db.query(CreditTransaction).filter(CreditTransaction.user_id == user_id).order_by(CreditTransaction.created_at.desc()).limit(20).all()
    transactions_data = [
        {
            "id": t.id,
            "transaction_type": t.transaction_type,
            "amount": t.amount,
            "balance_after": t.balance_after,
            "reason": t.reason,
            "created_at": t.created_at.isoformat()
        }
        for t in txs
    ]

    # Recent usage records
    usage = db.query(UsageRecord).filter(UsageRecord.user_id == user_id).order_by(UsageRecord.created_at.desc()).limit(20).all()
    usage_data = [
        {
            "id": u.id,
            "operation_type": u.operation_type,
            "credits_charged": u.credits_charged,
            "status": u.status,
            "created_at": u.created_at.isoformat()
        }
        for u in usage
    ]

    return {
        "user": user_info,
        "documents": documents_data,
        "transactions": transactions_data,
        "usage_records": usage_data
    }


@router.post("/users/{user_id}/credits/adjust")
def adjust_user_credits(
    user_id: str,
    adj_req: CreditAdjustRequest,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Audited administrative credit adjustment. Appends compensating transaction to ledger.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if adj_req.amount == 0:
        raise HTTPException(status_code=400, detail="Adjustment amount cannot be zero.")

    account = CreditService.get_or_create_account(db, user_id)
    balance_before = account.balance
    account.balance = max(0, account.balance + adj_req.amount)
    account.version = (account.version or 1) + 1
    account.updated_at = datetime.utcnow()

    tx = CreditTransaction(
        user_id=user_id,
        transaction_type="admin_adjustment",
        amount=adj_req.amount,
        balance_before=balance_before,
        balance_after=account.balance,
        reason=f"Admin adjustment by {current_user.email}: {adj_req.reason}",
        reference=f"admin_adj_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    )
    db.add(tx)
    db.commit()
    db.refresh(account)

    log_audit_event(
        db, action="admin_adjust_credits", user=current_user, request=request,
        details={"target_user_id": user_id, "amount": adj_req.amount, "reason": adj_req.reason}
    )

    return {
        "status": "success",
        "message": f"Successfully adjusted credits by {adj_req.amount}. New balance: {account.balance}",
        "new_balance": account.balance
    }


@router.post("/users/{user_id}/plan")
def change_user_plan_admin(
    user_id: str,
    plan_req: AdminPlanChangeRequest,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Controlled administrative workflow to update a user's subscription plan.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    target_plan = db.query(Plan).filter(Plan.key == plan_req.plan_key, Plan.is_active == True).first()
    if not target_plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_req.plan_key}' not found.")

    from datetime import timedelta
    now = datetime.utcnow()
    sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not sub:
        sub = Subscription(
            user_id=user_id,
            plan_id=target_plan.id,
            status="active",
            current_period_start=now,
            current_period_end=now + timedelta(days=30)
        )
        db.add(sub)
    else:
        old_plan_id = sub.plan_id
        sub.plan_id = target_plan.id
        sub.status = "active"
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=30)
        sub.updated_at = now

    db.commit()
    db.refresh(sub)

    # Sync CreditAccount
    acc = db.query(CreditAccount).filter(CreditAccount.user_id == user_id).first()
    if acc:
        acc.period_allowance = target_plan.monthly_credits
        acc.balance = max(acc.balance, target_plan.monthly_credits)
        db.commit()

    log_audit_event(
        db, action="admin_change_user_plan", user=current_user, request=request,
        details={"target_user_id": user_id, "new_plan_key": target_plan.key}
    )

    return {
        "status": "success",
        "message": f"User plan successfully updated to {target_plan.name}.",
        "plan_key": target_plan.key
    }


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Suspends a user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot suspend your own admin account.")

    user.is_active = False
    db.commit()

    log_audit_event(db, action="admin_suspend_user", user=current_user, request=request, details={"target_user_id": user_id})
    return {"status": "success", "message": f"Account for {user.email} suspended."}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Reactivates a suspended user account.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    db.commit()

    log_audit_event(db, action="admin_activate_user", user=current_user, request=request, details={"target_user_id": user_id})
    return {"status": "success", "message": f"Account for {user.email} reactivated."}


@router.get("/documents")
def list_admin_documents(
    query: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Lists documents across all users for operational administration.
    """
    q = db.query(Document)
    if query and query.strip():
        term = f"%{query.strip().lower()}%"
        q = q.filter(Document.filename.ilike(term))
    if status_filter and status_filter.strip():
        q = q.filter(Document.status == status_filter.strip())

    docs = q.order_by(Document.uploaded_at.desc()).all()
    results = []
    for d in docs:
        uploader = db.query(User).filter(User.id == d.uploaded_by_id).first()
        results.append({
            "id": d.id,
            "filename": d.filename,
            "file_size_bytes": d.file_size_bytes,
            "total_pages": d.total_pages,
            "status": d.status,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None,
            "uploaded_by_email": uploader.email if uploader else "unknown",
            "uploaded_by_name": uploader.full_name if uploader else "unknown"
        })
    return results


@router.post("/documents/{document_id}/reindex")
def admin_reindex_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin action to retry/reindex a document safely across all users.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found on disk")

    parser = DocumentParser(doc.file_path)
    extracted = parser.extract_pages()

    # Clear old evidence records
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
    log_audit_event(db, action="admin_reindex", user=current_user, document_id=doc.id, request=request)

    return {"status": "success", "message": f"Document reindexed across {len(extracted['pages'])} pages."}


@router.delete("/documents/{document_id}")
def admin_delete_document(
    document_id: str,
    request: Request,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin operation to delete any document with audited logging and index purge.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    rag_service.delete_document_index(document_id)

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    log_audit_event(
        db, action="admin_delete_document", user=current_user, document_id=document_id, request=request,
        details={"filename": doc.filename, "owner_id": doc.uploaded_by_id}
    )

    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted by administrator."}


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = Query(100, le=300),
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    document_id: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Searchable audit logs filterable by action, email, document, and date.
    """
    query = db.query(AuditLog)
    if action and action.strip():
        query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))
    if user_email and user_email.strip():
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email.strip()}%"))
    if document_id and document_id.strip():
        query = query.filter(AuditLog.document_id.ilike(f"%{document_id.strip()}%"))

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return logs
