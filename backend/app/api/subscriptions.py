import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import User, Plan, Subscription, Document, CreditAccount
from backend.app.schemas.schemas import (
    PlanResponse,
    SubscriptionResponse,
    SelectPlanRequest,
    PaymentCheckoutRequest,
    PaymentCheckoutResponse,
    PaymentVerifyRequest
)
from backend.app.auth.auth import get_current_user
from backend.app.services.subscription_service import SubscriptionService
from backend.app.services.payment_service import PaymentService
from backend.app.core.audit import log_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Plans & Subscriptions"])


def _format_plan_response(p: Plan) -> PlanResponse:
    return PlanResponse(
        id=p.id,
        key=p.key,
        name=p.name,
        price=p.price,
        currency=p.currency,
        billing_interval=p.billing_interval,
        max_documents=p.max_documents,
        monthly_credits=p.monthly_credits,
        questions_per_doc_limit=p.questions_per_doc_limit,
        upload_credit_cost=p.upload_credit_cost,
        question_credit_cost=p.question_credit_cost,
        visual_credit_cost=p.visual_credit_cost,
        can_download_reports=p.can_download_reports,
        can_compare_years=p.can_compare_years,
        priority_processing=p.priority_processing,
        is_active=p.is_active
    )


@router.get("/plans", response_model=List[PlanResponse])
def list_available_plans(db: Session = Depends(get_db)):
    """
    Public listing of available subscription plans with complete limits and credit allowances.
    """
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price.asc()).all()
    return [_format_plan_response(p) for p in plans]


@router.get("/subscriptions/me", response_model=Optional[SubscriptionResponse])
def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves the authenticated user's current subscription, active document usage, and plan details.
    """
    if current_user.is_admin or current_user.role == "admin":
        # Admin virtual enterprise subscription
        plan = db.query(Plan).filter(Plan.key == "premium").first()
        if not plan:
            plan = db.query(Plan).first()
        
        now = datetime.utcnow()
        return SubscriptionResponse(
            id="admin-subscription",
            user_id=current_user.id,
            plan_id=plan.id if plan else "admin",
            status="active",
            current_period_start=now,
            current_period_end=now,
            plan=_format_plan_response(plan) if plan else PlanResponse(
                id="admin", key="premium", name="Enterprise Admin", price=0, currency="INR",
                billing_interval="month", max_documents=1000, monthly_credits=10000,
                questions_per_doc_limit=1000, upload_credit_cost=10, question_credit_cost=15,
                visual_credit_cost=10, can_download_reports=True, can_compare_years=True,
                priority_processing=True, is_active=True
            ),
            active_documents_count=0,
            max_documents=1000
        )

    sub = SubscriptionService.get_user_subscription(db, current_user.id)
    if not sub:
        return None

    active_docs_count = db.query(Document).filter(Document.uploaded_by_id == current_user.id).count()

    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        plan=_format_plan_response(sub.plan),
        active_documents_count=active_docs_count,
        max_documents=sub.plan.max_documents
    )


@router.post("/subscriptions/select-plan", response_model=SubscriptionResponse)
def select_subscription_plan(
    plan_req: SelectPlanRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Onboarding or customer plan selection for free tier (Basic).
    Paid tiers must use /subscriptions/checkout and /subscriptions/verify-payment.
    """
    plan = db.query(Plan).filter(Plan.key == plan_req.plan_key, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Requested plan not found.")

    if plan.price > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{plan.name} is a paid tier. Please complete checkout to activate this plan."
        )

    sub = SubscriptionService.select_free_plan(db, current_user, plan_key=plan_req.plan_key)
    log_audit_event(
        db, action="select_plan", user=current_user, request=request,
        details={"plan_key": plan_req.plan_key, "plan_name": plan.name}
    )

    active_docs_count = db.query(Document).filter(Document.uploaded_by_id == current_user.id).count()

    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        plan=_format_plan_response(plan),
        active_documents_count=active_docs_count,
        max_documents=plan.max_documents
    )


@router.post("/subscriptions/activate-tier", response_model=SubscriptionResponse)
def instant_activate_tier(
    plan_req: SelectPlanRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Directly activates any plan tier (Basic, Pro, Premium) for instant testing without requiring payment gateway credentials.
    Grants the full monthly credit allowance and updates active document capacity.
    """
    clean_key = plan_req.plan_key.strip().lower()
    plan = db.query(Plan).filter(
        (Plan.key == clean_key) | (Plan.id == plan_req.plan_key),
        Plan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Requested plan not found.")

    sub = SubscriptionService.activate_plan(db, current_user, plan_key=plan.key)
    log_audit_event(
        db, action="activate_tier_instant", user=current_user, request=request,
        details={"plan_key": plan.key, "plan_name": plan.name}
    )

    active_docs_count = db.query(Document).filter(Document.uploaded_by_id == current_user.id).count()

    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        plan=_format_plan_response(plan),
        active_documents_count=active_docs_count,
        max_documents=plan.max_documents
    )


@router.post("/subscriptions/checkout", response_model=PaymentCheckoutResponse)
def checkout_paid_plan(
    checkout_req: PaymentCheckoutRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Razorpay payment order for Pro or Premium subscription checkout.
    """
    order_data = PaymentService.create_order(db, current_user, plan_key=checkout_req.plan_key)
    log_audit_event(
        db, action="checkout_order_created", user=current_user, request=request,
        details={"order_id": order_data["order_id"], "plan_key": checkout_req.plan_key}
    )
    return PaymentCheckoutResponse(**order_data)


@router.post("/subscriptions/verify-payment", response_model=SubscriptionResponse)
def verify_payment_and_activate(
    verify_req: PaymentVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifies Razorpay payment signature and activates the paid subscription.
    Enforces idempotency and prevents client-only status falsification.
    """
    sub = PaymentService.activate_verified_subscription(
        db,
        user=current_user,
        order_id=verify_req.order_id,
        payment_id=verify_req.payment_id,
        signature=verify_req.signature,
        plan_key=verify_req.plan_key
    )

    log_audit_event(
        db, action="payment_verified_subscription_activated", user=current_user, request=request,
        details={
            "order_id": verify_req.order_id,
            "payment_id": verify_req.payment_id,
            "plan_key": verify_req.plan_key,
            "status": "success"
        }
    )

    active_docs_count = db.query(Document).filter(Document.uploaded_by_id == current_user.id).count()

    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_id=sub.plan_id,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        plan=_format_plan_response(sub.plan),
        active_documents_count=active_docs_count,
        max_documents=sub.plan.max_documents
    )


@router.post("/subscriptions/cancel")
def cancel_subscription(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancels current active paid subscription. Downgrades account safely to Basic.
    """
    sub = SubscriptionService.get_user_subscription(db, current_user.id)
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    sub.status = "canceled"
    sub.canceled_at = datetime.utcnow()
    db.commit()

    # Fallback to Basic free tier
    basic_plan = db.query(Plan).filter(Plan.key == "basic").first()
    if basic_plan:
        SubscriptionService.select_free_plan(db, current_user, plan_key="basic")

    log_audit_event(db, action="subscription_canceled", user=current_user, request=request)
    return {"status": "success", "message": "Subscription canceled. Account moved to Basic plan."}


@router.post("/webhooks/razorpay")
async def razorpay_webhook_listener(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verified Razorpay webhook receiver with HMAC signature validation.
    """
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    return PaymentService.verify_and_process_webhook(db, body_bytes, signature)
