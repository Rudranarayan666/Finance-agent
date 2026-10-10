import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, CreditAccount, CreditTransaction, UsageRecord, Subscription
from backend.app.schemas.schemas import (
    CreditAccountResponse,
    CreditTransactionResponse
)
from backend.app.auth.auth import get_current_user
from backend.app.services.credit_service import CreditService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Credits & Usage"])


@router.get("/credits/me", response_model=CreditAccountResponse)
def get_user_credit_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns current user's available credits, monthly allowance, used credits,
    billing period metadata, and warning levels (20%, 10%, exhausted).
    """
    if current_user.is_admin or current_user.role == "admin":
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        return CreditAccountResponse(
            balance=10000,
            period_allowance=10000,
            period_used=0,
            period_start=now,
            period_end=now + timedelta(days=365),
            plan_key="premium",
            warning_level="none"
        )

    account = CreditService.get_or_create_account(db, current_user.id)

    # Determine plan key
    sub = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == "active"
    ).first()
    plan_key = sub.plan.key if (sub and sub.plan) else "basic"

    warning_level = CreditService.get_warning_level(account.balance, account.period_allowance)

    return CreditAccountResponse(
        balance=account.balance,
        period_allowance=account.period_allowance,
        period_used=account.period_used,
        period_start=account.period_start,
        period_end=account.period_end,
        plan_key=plan_key,
        warning_level=warning_level
    )


@router.get("/credits/transactions", response_model=List[CreditTransactionResponse])
def get_credit_transactions(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns paginated audit trail of credit transactions for the authenticated user.
    """
    txs = db.query(CreditTransaction).filter(
        CreditTransaction.user_id == current_user.id
    ).order_by(CreditTransaction.created_at.desc()).limit(limit).all()

    return [
        CreditTransactionResponse(
            id=t.id,
            user_id=t.user_id,
            document_id=t.document_id,
            transaction_type=t.transaction_type,
            amount=t.amount,
            balance_before=t.balance_before,
            balance_after=t.balance_after,
            reason=t.reason,
            reference=t.reference,
            created_at=t.created_at
        )
        for t in txs
    ]


@router.get("/usage/me")
def get_user_usage_records(
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns detailed operation usage records for the authenticated user.
    """
    records = db.query(UsageRecord).filter(
        UsageRecord.user_id == current_user.id
    ).order_by(UsageRecord.created_at.desc()).limit(limit).all()

    return [
        {
            "id": r.id,
            "document_id": r.document_id,
            "operation_type": r.operation_type,
            "status": r.status,
            "credits_charged": r.credits_charged,
            "created_at": r.created_at.isoformat()
        }
        for r in records
    ]
