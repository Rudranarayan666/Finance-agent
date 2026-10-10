import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.database import SessionLocal, init_db
from backend.app.models.models import User, Plan, Subscription, CreditAccount, CreditTransaction, Document
from backend.app.core.security import get_password_hash, create_access_token
from backend.app.services.credit_service import CreditService
from backend.app.services.subscription_service import SubscriptionService
from backend.app.services.payment_service import PaymentService

client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_db():
    init_db()


def create_test_user(email_prefix: str, role: str = "customer", is_admin: bool = False) -> tuple[User, str]:
    db = SessionLocal()
    try:
        email = f"{email_prefix}_{uuid.uuid4().hex[:6]}@saas-test.com"
        user = User(
            email=email,
            hashed_password=get_password_hash("TestPass123!"),
            full_name=f"User {email_prefix}",
            role=role,
            is_admin=is_admin,
            provider="local",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token(user.id)
        return user, token
    finally:
        db.close()


# -------------------------------------------------------------
# 1. Auth & Admin Security Tests
# -------------------------------------------------------------
def test_public_signup_cannot_create_admin():
    email = f"customer_{uuid.uuid4().hex[:6]}@corp.com"
    resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Standard Customer"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "customer"
    assert data["is_admin"] is False


def test_admin_routes_reject_non_admin_customers():
    user, token = create_test_user("cust", role="customer", is_admin=False)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/admin/overview", headers=headers)
    assert resp.status_code == 403

    resp = client.get("/api/v1/admin/users", headers=headers)
    assert resp.status_code == 403


def test_admin_routes_accessible_by_admin():
    admin, token = create_test_user("admin", role="admin", is_admin=True)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/admin/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "active_subscriptions" in data
    assert "mrr_inr" in data
    assert "plan_distribution" in data


# -------------------------------------------------------------
# 2. Subscription Plans & Plan Selection
# -------------------------------------------------------------
def test_list_plans_returns_three_plans_with_correct_limits():
    resp = client.get("/api/v1/plans")
    assert resp.status_code == 200
    plans = {p["key"]: p for p in resp.json()}

    assert "basic" in plans
    assert "pro" in plans
    assert "premium" in plans

    assert plans["basic"]["price"] == 0
    assert plans["basic"]["monthly_credits"] == 100
    assert plans["basic"]["max_documents"] == 2
    assert plans["basic"]["questions_per_doc_limit"] == 5
    assert plans["basic"]["can_download_reports"] is False

    assert plans["pro"]["price"] == 299
    assert plans["pro"]["monthly_credits"] == 500
    assert plans["pro"]["max_documents"] == 10
    assert plans["pro"]["questions_per_doc_limit"] == 10
    assert plans["pro"]["can_download_reports"] is True

    assert plans["premium"]["price"] == 799
    assert plans["premium"]["monthly_credits"] == 2000
    assert plans["premium"]["max_documents"] == 50
    assert plans["premium"]["questions_per_doc_limit"] == 20
    assert plans["premium"]["can_download_reports"] is True


def test_select_free_basic_plan_and_credits_grant():
    user, token = create_test_user("newbie")
    headers = {"Authorization": f"Bearer {token}"}

    # Select Basic free plan
    resp = client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "basic"}, headers=headers)
    assert resp.status_code == 200
    sub_data = resp.json()
    assert sub_data["plan"]["key"] == "basic"
    assert sub_data["status"] == "active"
    assert sub_data["max_documents"] == 2

    # Verify credit account was granted 100 credits
    cred_resp = client.get("/api/v1/credits/me", headers=headers)
    assert cred_resp.status_code == 200
    assert cred_resp.json()["balance"] == 100
    assert cred_resp.json()["period_allowance"] == 100


def test_select_paid_plan_via_free_endpoint_rejected():
    user, token = create_test_user("free_cheat")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "pro"}, headers=headers)
    assert resp.status_code == 400


# -------------------------------------------------------------
# 3. Credit System, Ledger & Warnings
# -------------------------------------------------------------
def test_credit_warning_levels():
    assert CreditService.get_warning_level(100, 100) == "none"
    assert CreditService.get_warning_level(20, 100) == "warning_20"
    assert CreditService.get_warning_level(10, 100) == "warning_10"
    assert CreditService.get_warning_level(0, 100) == "exhausted"


def test_credit_transactions_ledger_and_atomic_debit():
    user, token = create_test_user("ledger_user")
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "basic"}, headers=headers)

    db = SessionLocal()
    try:
        # Debit 15 credits
        CreditService.debit_credits(
            db, user_id=user.id, amount=15, transaction_type="question_debit",
            reason="Test question debit", reference="ref_test_1"
        )
        # Idempotent call with same reference should NOT debit twice
        CreditService.debit_credits(
            db, user_id=user.id, amount=15, transaction_type="question_debit",
            reason="Test question debit", reference="ref_test_1"
        )
    finally:
        db.close()

    cred_resp = client.get("/api/v1/credits/me", headers=headers)
    assert cred_resp.json()["balance"] == 85

    # Check ledger
    tx_resp = client.get("/api/v1/credits/transactions", headers=headers)
    assert tx_resp.status_code == 200
    txs = tx_resp.json()
    assert len(txs) >= 2  # initial grant + debit
    assert txs[0]["transaction_type"] == "question_debit"
    assert txs[0]["amount"] == -15


def test_insufficient_credits_exception():
    user, token = create_test_user("poor_user")
    db = SessionLocal()
    try:
        acc = CreditService.get_or_create_account(db, user.id)
        acc.balance = 5  # less than 10 or 15
        db.commit()

        with pytest.raises(Exception):
            CreditService.debit_credits(db, user.id, 10, "upload_debit", "Upload attempt")
    finally:
        db.close()


# -------------------------------------------------------------
# 4. Active Document Limits & Lifecycle
# -------------------------------------------------------------
def test_active_document_limit_enforcement_and_release():
    user, token = create_test_user("doc_limit_user")
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "basic"}, headers=headers)

    db = SessionLocal()
    try:
        # Create 2 documents for user (Basic limit = 2)
        doc1 = Document(
            filename="doc1.pdf", file_path="dummy1.pdf", file_size_bytes=100,
            file_hash="hash1", uploaded_by_id=user.id, status="ready"
        )
        doc2 = Document(
            filename="doc2.pdf", file_path="dummy2.pdf", file_size_bytes=100,
            file_hash="hash2", uploaded_by_id=user.id, status="ready"
        )
        db.add_all([doc1, doc2])
        db.commit()

        # 3rd document check should raise limit reached 403
        with pytest.raises(Exception) as excinfo:
            SubscriptionService.check_active_document_limit(db, user)
        assert "DOCUMENT_LIMIT_REACHED" in str(excinfo.value.detail)

        # Delete doc1 to release slot
        db.delete(doc1)
        db.commit()

        # Now active limit check should pass
        active_count, max_allowed = SubscriptionService.check_active_document_limit(db, user)
        assert active_count == 1
        assert max_allowed == 2
    finally:
        db.close()


# -------------------------------------------------------------
# 5. Question Cap Enforcement
# -------------------------------------------------------------
def test_question_cap_per_document():
    user, token = create_test_user("question_cap_user")
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "basic"}, headers=headers)

    db = SessionLocal()
    doc_id = f"test_doc_{uuid.uuid4().hex[:8]}"
    try:
        # Record 5 successful questions on this document (Basic cap = 5)
        for i in range(5):
            SubscriptionService.record_usage(
                db, user_id=user.id, operation_type="question",
                credits_charged=15, document_id=doc_id, status="success"
            )

        # 6th question check should raise cap reached 403
        with pytest.raises(Exception) as excinfo:
            SubscriptionService.check_question_limit(db, user, doc_id)
        assert "QUESTION_CAP_REACHED" in str(excinfo.value.detail)
    finally:
        db.close()


# -------------------------------------------------------------
# 6. Customer Data Isolation
# -------------------------------------------------------------
def test_customer_cannot_access_or_delete_other_user_document():
    user_a, token_a = create_test_user("user_a")
    user_b, token_b = create_test_user("user_b")

    db = SessionLocal()
    try:
        doc_a = Document(
            filename="private_a.pdf", file_path="dummy_a.pdf", file_size_bytes=500,
            file_hash="hash_a", uploaded_by_id=user_a.id, status="ready"
        )
        db.add(doc_a)
        db.commit()
        db.refresh(doc_a)
        doc_a_id = doc_a.id
    finally:
        db.close()

    # User B tries to delete User A's document
    headers_b = {"Authorization": f"Bearer {token_b}"}
    del_resp = client.delete(f"/api/v1/documents/{doc_a_id}", headers=headers_b)
    assert del_resp.status_code in [403, 404]

    # User B tries to query chat on User A's document
    chat_resp = client.post(f"/api/v1/chat/{doc_a_id}", json={"message": "What is revenue?"}, headers=headers_b)
    assert chat_resp.status_code in [403, 404]


# -------------------------------------------------------------
# 7. Report Download Protection
# -------------------------------------------------------------
def test_report_download_gating_basic_vs_paid():
    user_basic, token_basic = create_test_user("cust_basic")
    headers_basic = {"Authorization": f"Bearer {token_basic}"}
    client.post("/api/v1/subscriptions/select-plan", json={"plan_key": "basic"}, headers=headers_basic)

    db = SessionLocal()
    try:
        doc = Document(
            filename="report_test.pdf", file_path="eval/data/sample_q3_fy26.pdf",
            file_size_bytes=1000, file_hash="hash_rep", uploaded_by_id=user_basic.id, status="ready"
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id
    finally:
        db.close()

    # Basic plan user download should be rejected
    dl_resp = client.get(f"/api/v1/documents/{doc_id}/report/download", headers=headers_basic)
    assert dl_resp.status_code == 403
    assert "PLAN_RESTRICTION" in str(dl_resp.json()["detail"])


# -------------------------------------------------------------
# 8. Payment Verification & Activation
# -------------------------------------------------------------
def test_payment_checkout_order_creation():
    user, token = create_test_user("pay_user")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/v1/subscriptions/checkout", json={"plan_key": "pro"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "order_id" in data
    assert data["amount"] == 29900  # 299 * 100 paise
    assert data["currency"] == "INR"


def test_payment_verification_and_subscription_activation():
    user, token = create_test_user("verified_buyer")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Checkout order
    chk = client.post("/api/v1/subscriptions/checkout", json={"plan_key": "pro"}, headers=headers).json()
    order_id = chk["order_id"]

    # 2. Invalid signature rejection
    fake_verify = client.post("/api/v1/subscriptions/verify-payment", json={
        "order_id": order_id,
        "payment_id": "pay_fake_123",
        "signature": "bad_sig",
        "plan_key": "pro"
    }, headers=headers)
    assert fake_verify.status_code == 400

    # 3. Valid test sandbox signature activation
    valid_verify = client.post("/api/v1/subscriptions/verify-payment", json={
        "order_id": order_id,
        "payment_id": "pay_test_998877",
        "signature": "test_sig_valid_hash_12345678",
        "plan_key": "pro"
    }, headers=headers)
    assert valid_verify.status_code == 200
    sub_data = valid_verify.json()
    assert sub_data["plan"]["key"] == "pro"
    assert sub_data["status"] == "active"

    # 4. Check credit account received 500 credits for Pro plan
    cred = client.get("/api/v1/credits/me", headers=headers).json()
    assert cred["balance"] == 500
    assert cred["period_allowance"] == 500


# -------------------------------------------------------------
# 9. Admin Credit Adjustment & Plan Change
# -------------------------------------------------------------
def test_admin_adjust_credits_and_change_plan():
    admin, admin_token = create_test_user("master_admin", role="admin", is_admin=True)
    customer, _ = create_test_user("target_cust")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin adjust credits +250
    adj_resp = client.post(
        f"/api/v1/admin/users/{customer.id}/credits/adjust",
        json={"amount": 250, "reason": "Support compensation"},
        headers=admin_headers
    )
    assert adj_resp.status_code == 200
    assert adj_resp.json()["new_balance"] >= 250

    # Admin change plan to Premium
    plan_resp = client.post(
        f"/api/v1/admin/users/{customer.id}/plan",
        json={"plan_key": "premium"},
        headers=admin_headers
    )
    assert plan_resp.status_code == 200
    assert plan_resp.json()["plan_key"] == "premium"
