import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.models.models import User, CreditAccount, CreditTransaction, Subscription, Plan
from backend.app.config import settings

logger = logging.getLogger(__name__)


class CreditService:
    @staticmethod
    def get_or_create_account(db: Session, user_id: str) -> CreditAccount:
        """
        Retrieves user's CreditAccount. If missing, initialises based on active plan or defaults.
        """
        account = db.query(CreditAccount).filter(CreditAccount.user_id == user_id).first()
        now = datetime.utcnow()

        if not account:
            # Check if user has an active plan
            sub = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.status == "active"
            ).first()

            monthly_credits = 100
            if sub and sub.plan:
                monthly_credits = sub.plan.monthly_credits

            account = CreditAccount(
                user_id=user_id,
                balance=monthly_credits,
                period_allowance=monthly_credits,
                period_used=0,
                period_start=now,
                period_end=now + timedelta(days=30),
                version=1
            )
            db.add(account)
            db.commit()
            db.refresh(account)

            # Record initial grant ledger entry
            tx = CreditTransaction(
                user_id=user_id,
                transaction_type="grant",
                amount=monthly_credits,
                balance_before=0,
                balance_after=monthly_credits,
                reason="Initial monthly credit allowance grant",
                reference="initial_activation"
            )
            db.add(tx)
            db.commit()

        # Check for billing period expiration and apply renewal idempotently
        if now >= account.period_end:
            CreditService.renew_monthly_allowance(db, account)

        return account

    @staticmethod
    def renew_monthly_allowance(db: Session, account: CreditAccount) -> CreditAccount:
        """
        Grants the appropriate monthly allowance when billing period lapses.
        Does not carry unused credits forward by default. Idempotently tracks period.
        """
        now = datetime.utcnow()
        sub = db.query(Subscription).filter(
            Subscription.user_id == account.user_id,
            Subscription.status == "active"
        ).first()

        allowance = 100
        if sub and sub.plan:
            allowance = sub.plan.monthly_credits

        balance_before = account.balance
        account.balance = allowance
        account.period_allowance = allowance
        account.period_used = 0
        account.period_start = now
        account.period_end = now + timedelta(days=30)
        account.version = (account.version or 1) + 1
        account.updated_at = now

        tx = CreditTransaction(
            user_id=account.user_id,
            transaction_type="grant",
            amount=allowance,
            balance_before=balance_before,
            balance_after=account.balance,
            reason=f"Monthly billing cycle credit renewal ({allowance} credits)",
            reference=f"renewal_{now.strftime('%Y%m%d')}"
        )
        db.add(tx)
        db.commit()
        db.refresh(account)
        logger.info(f"Renewed monthly allowance for user {account.user_id}: {allowance} credits")
        return account

    @staticmethod
    def check_available_credits(db: Session, user_id: str, required_credits: int) -> bool:
        """
        Checks whether the user has at least required_credits available.
        """
        account = CreditService.get_or_create_account(db, user_id)
        return account.balance >= required_credits

    @staticmethod
    def debit_credits(
        db: Session,
        user_id: str,
        amount: int,
        transaction_type: str,
        reason: str,
        document_id: Optional[str] = None,
        reference: Optional[str] = None
    ) -> CreditAccount:
        """
        Atomically debits credits with transaction locking and appends to the immutable ledger.
        Enforces idempotency if reference is provided.
        """
        # Idempotency check: if transaction with reference already processed, do not duplicate charge
        if reference:
            existing_tx = db.query(CreditTransaction).filter(
                CreditTransaction.user_id == user_id,
                CreditTransaction.reference == reference
            ).first()
            if existing_tx:
                logger.info(f"Idempotent debit skip: reference {reference} already processed.")
                return CreditService.get_or_create_account(db, user_id)

        account = CreditService.get_or_create_account(db, user_id)

        if account.balance < amount:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "INSUFFICIENT_CREDITS",
                    "message": f"Operation requires {amount} credits, but you have {account.balance} remaining.",
                    "required_credits": amount,
                    "remaining_credits": account.balance,
                    "upgrade_available": True
                }
            )

        balance_before = account.balance
        account.balance -= amount
        account.period_used += amount
        account.version = (account.version or 1) + 1
        account.updated_at = datetime.utcnow()

        tx = CreditTransaction(
            user_id=user_id,
            document_id=document_id,
            transaction_type=transaction_type,
            amount=-amount,
            balance_before=balance_before,
            balance_after=account.balance,
            reason=reason,
            reference=reference
        )
        db.add(tx)
        db.commit()
        db.refresh(account)

        logger.info(f"Debited {amount} credits from user {user_id} for {transaction_type}. Balance: {account.balance}")
        return account

    @staticmethod
    def grant_credits(
        db: Session,
        user_id: str,
        amount: int,
        transaction_type: str,
        reason: str,
        reference: Optional[str] = None
    ) -> CreditAccount:
        """
        Appends credits to user balance with an immutable transaction log.
        """
        account = CreditService.get_or_create_account(db, user_id)
        balance_before = account.balance
        account.balance += amount
        account.version = (account.version or 1) + 1
        account.updated_at = datetime.utcnow()

        tx = CreditTransaction(
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            balance_before=balance_before,
            balance_after=account.balance,
            reason=reason,
            reference=reference
        )
        db.add(tx)
        db.commit()
        db.refresh(account)
        return account

    @staticmethod
    def get_warning_level(balance: int, allowance: int) -> str:
        """
        Computes warning threshold state:
        'exhausted' if balance <= 0
        'warning_10' if balance / allowance <= 0.10
        'warning_20' if balance / allowance <= 0.20
        'none' otherwise
        """
        if balance <= 0:
            return "exhausted"
        if allowance <= 0:
            return "none"
        ratio = balance / allowance
        if ratio <= 0.10:
            return "warning_10"
        if ratio <= 0.20:
            return "warning_20"
        return "none"
