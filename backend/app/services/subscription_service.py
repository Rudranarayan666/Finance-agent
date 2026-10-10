import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.models import User, Plan, Subscription, CreditAccount, Document, UsageRecord, CreditTransaction
from backend.app.services.credit_service import CreditService

logger = logging.getLogger(__name__)


class SubscriptionService:
    @staticmethod
    def get_user_subscription(db: Session, user_id: str) -> Optional[Subscription]:
        """
        Retrieves user's active subscription and validates expiration status.
        """
        sub = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status == "active"
        ).first()

        if sub and sub.current_period_end and datetime.utcnow() > sub.current_period_end:
            # Check grace period policy: if past due, mark expired or renew if basic
            if sub.plan and sub.plan.price == 0:
                # Basic free tier auto-renews period
                sub.current_period_start = datetime.utcnow()
                sub.current_period_end = datetime.utcnow() + timedelta(days=30)
                sub.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(sub)
                # Also renew monthly credits
                acc = db.query(CreditAccount).filter(CreditAccount.user_id == user_id).first()
                if acc:
                    CreditService.renew_monthly_allowance(db, acc)
            else:
                sub.status = "past_due"
                db.commit()
                db.refresh(sub)

        return sub

    @staticmethod
    def activate_plan(db: Session, user: User, plan_key: str) -> Subscription:
        """
        Activates any plan tier (Basic, Pro, Premium) and grants the respective monthly allowance and limits.
        Allows instant tier activation without requiring live payment credentials.
        """
        clean_key = plan_key.strip().lower()
        plan = db.query(Plan).filter(
            (Plan.key == clean_key) | (Plan.id == plan_key),
            Plan.is_active == True
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_key}' not found.")

        now = datetime.utcnow()
        period_end = now + timedelta(days=30)

        existing_sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if not existing_sub:
            sub = Subscription(
                user_id=user.id,
                plan_id=plan.id,
                status="active",
                current_period_start=now,
                current_period_end=period_end
            )
            db.add(sub)
        else:
            existing_sub.plan_id = plan.id
            existing_sub.status = "active"
            existing_sub.current_period_start = now
            existing_sub.current_period_end = period_end
            existing_sub.updated_at = now
            sub = existing_sub

        db.commit()
        db.refresh(sub)

        # Initialize or synchronize Credit Account
        acc = db.query(CreditAccount).filter(CreditAccount.user_id == user.id).first()
        if not acc:
            acc = CreditAccount(
                user_id=user.id,
                balance=plan.monthly_credits,
                period_allowance=plan.monthly_credits,
                period_used=0,
                period_start=now,
                period_end=period_end
            )
            db.add(acc)
            db.commit()
            db.refresh(acc)

            tx = CreditTransaction(
                user_id=user.id,
                transaction_type="grant",
                amount=plan.monthly_credits,
                balance_before=0,
                balance_after=plan.monthly_credits,
                reason=f"Initial {plan.name} allowance grant",
                reference=f"plan_activation_{plan.key}"
            )
            db.add(tx)
            db.commit()
        else:
            old_balance = acc.balance
            # Ensure user balance meets plan allowance on upgrade
            if acc.balance < plan.monthly_credits:
                acc.balance = plan.monthly_credits
                diff = plan.monthly_credits - old_balance
                tx = CreditTransaction(
                    user_id=user.id,
                    transaction_type="grant",
                    amount=diff,
                    balance_before=old_balance,
                    balance_after=acc.balance,
                    reason=f"{plan.name} allowance activation grant",
                    reference=f"plan_upgrade_{plan.key}"
                )
                db.add(tx)
            acc.period_allowance = plan.monthly_credits
            acc.period_start = now
            acc.period_end = period_end
            db.commit()

        return sub

    @staticmethod
    def select_free_plan(db: Session, user: User, plan_key: str = "basic") -> Subscription:
        """
        Activates a free tier subscription (Basic) for a newly registered or existing user.
        Rejects paid tier via this specific endpoint to preserve strict tier verification tests.
        """
        clean_key = plan_key.strip().lower()
        plan = db.query(Plan).filter(
            (Plan.key == clean_key) | (Plan.id == plan_key),
            Plan.is_active == True
        ).first()
        if not plan:
            raise HTTPException(status_code=404, detail=f"Plan '{plan_key}' not found.")
        
        if plan.price > 0:
            raise HTTPException(status_code=400, detail="Cannot select a paid plan via free activation endpoint.")

        return SubscriptionService.activate_plan(db, user, plan_key=plan.key)

    @staticmethod
    def check_active_document_limit(db: Session, user: User) -> Tuple[int, int]:
        """
        Verifies active document slot capacity.
        Returns: (current_active_count, max_allowed_limit)
        Raises HTTPException 403 if limit reached.
        """
        if user.is_admin or user.role == "admin":
            return (0, 1000)

        sub = SubscriptionService.get_user_subscription(db, user.id)
        if not sub or not sub.plan:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "SUBSCRIPTION_REQUIRED",
                    "message": "An active subscription plan is required to upload documents. Please select a plan.",
                    "requires_plan_selection": True
                }
            )

        active_count = db.query(Document).filter(
            Document.uploaded_by_id == user.id
        ).count()

        max_allowed = sub.plan.max_documents
        if active_count >= max_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "DOCUMENT_LIMIT_REACHED",
                    "message": f"Active document limit reached ({active_count}/{max_allowed}) for your {sub.plan.name} plan. Delete existing documents or upgrade your subscription.",
                    "active_documents": active_count,
                    "max_documents": max_allowed,
                    "current_plan": sub.plan.name,
                    "upgrade_available": True
                }
            )

        return (active_count, max_allowed)

    @staticmethod
    def check_question_limit(db: Session, user: User, document_id: str) -> Tuple[int, int]:
        """
        Enforces per-document question allowances per billing period.
        Returns: (current_questions_used, questions_cap)
        Raises HTTPException 403 if cap reached.
        """
        if user.is_admin or user.role == "admin":
            return (0, 1000)

        sub = SubscriptionService.get_user_subscription(db, user.id)
        if not sub or not sub.plan:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "SUBSCRIPTION_REQUIRED",
                    "message": "An active subscription plan is required. Please choose a plan.",
                    "requires_plan_selection": True
                }
            )

        period_start = sub.current_period_start or (datetime.utcnow() - timedelta(days=30))
        questions_used = db.query(UsageRecord).filter(
            UsageRecord.user_id == user.id,
            UsageRecord.document_id == document_id,
            UsageRecord.operation_type == "question",
            UsageRecord.status == "success",
            UsageRecord.created_at >= period_start
        ).count()

        question_cap = sub.plan.questions_per_doc_limit
        if questions_used >= question_cap:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "QUESTION_CAP_REACHED",
                    "message": f"Question allowance reached ({questions_used}/{question_cap}) for this document in the current billing cycle. Upgrade to Pro or Premium for higher question caps.",
                    "questions_used": questions_used,
                    "question_cap": question_cap,
                    "current_plan": sub.plan.name,
                    "upgrade_available": True
                }
            )

        return (questions_used, question_cap)

    @staticmethod
    def record_usage(
        db: Session,
        user_id: str,
        operation_type: str,
        credits_charged: int,
        document_id: Optional[str] = None,
        status: str = "success",
        idempotency_key: Optional[str] = None
    ) -> UsageRecord:
        """
        Records billable or non-billable operation usage persistently.
        """
        record = UsageRecord(
            user_id=user_id,
            document_id=document_id,
            operation_type=operation_type,
            status=status,
            credits_charged=credits_charged,
            billing_period_start=datetime.utcnow(),
            idempotency_key=idempotency_key
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record
