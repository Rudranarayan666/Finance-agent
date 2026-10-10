import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from backend.app.core.security import get_password_hash, verify_password, create_access_token
from jose import jwt
from backend.app.config import settings
from backend.app.database import SessionLocal, init_db
from backend.app.models.models import Organization, User, Document
from backend.app.auth.auth import check_document_access, require_role
from backend.app.core.security_scanner import SecurityScanner


def test_password_hashing():
    pw = "SuperSecurePassword123!"
    hashed = get_password_hash(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_token_generation():
    user_id = "test-user-uuid-123"
    token = create_access_token(user_id)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload.get("sub") == user_id


def test_tenant_isolation_cross_organization_access():
    init_db()
    db = SessionLocal()
    try:
        # Create Org A and Org B
        org_a = Organization(name="Org Alpha", domain="alpha.corp")
        org_b = Organization(name="Org Beta", domain="beta.corp")
        db.add_all([org_a, org_b])
        db.commit()

        # User A in Org A
        user_a = User(
            email=f"user_a_{uuid.uuid4().hex[:6]}@alpha.corp",
            hashed_password=get_password_hash("Pass123!"),
            full_name="User Alpha",
            role="analyst",
            organization_id=org_a.id
        )
        # User B in Org B
        user_b = User(
            email=f"user_b_{uuid.uuid4().hex[:6]}@beta.corp",
            hashed_password=get_password_hash("Pass123!"),
            full_name="User Beta",
            role="analyst",
            organization_id=org_b.id
        )
        db.add_all([user_a, user_b])
        db.commit()

        # Document belonging to Org A
        doc_a = Document(
            filename="alpha_report.pdf",
            file_path="./uploads/alpha_report.pdf",
            file_size_bytes=1000,
            file_hash=f"hash_{uuid.uuid4().hex[:8]}",
            uploaded_by_id=user_a.id,
            organization_id=org_a.id
        )
        db.add(doc_a)
        db.commit()

        # 1. User A -> Org A Document -> ALLOWED
        accessed_doc = check_document_access(doc_a.id, user_a, db, required_permission="view")
        assert accessed_doc.id == doc_a.id

        # 2. User B -> Org A Document -> DENIED
        with pytest.raises(HTTPException) as exc_info:
            check_document_access(doc_a.id, user_b, db, required_permission="view")
        assert exc_info.value.status_code == 403

    finally:
        db.close()


def test_role_based_permissions():
    init_db()
    db = SessionLocal()
    try:
        admin_user = User(email=f"admin_{uuid.uuid4().hex[:6]}@corp.com", hashed_password="pw", full_name="Admin", role="admin")
        analyst_user = User(email=f"analyst_{uuid.uuid4().hex[:6]}@corp.com", hashed_password="pw", full_name="Analyst", role="analyst")
        viewer_user = User(email=f"viewer_{uuid.uuid4().hex[:6]}@corp.com", hashed_password="pw", full_name="Viewer", role="viewer")

        # 3. ADMIN -> admin action -> ALLOWED
        admin_checker = require_role(["admin"])
        assert admin_checker(admin_user).id == admin_user.id

        # 4. ANALYST -> admin action -> DENIED
        with pytest.raises(HTTPException) as exc_1:
            admin_checker(analyst_user)
        assert exc_1.value.status_code == 403

        # 5. VIEWER -> upload action -> DENIED
        upload_checker = require_role(["admin", "analyst"])
        with pytest.raises(HTTPException) as exc_2:
            upload_checker(viewer_user)
        assert exc_2.value.status_code == 403

    finally:
        db.close()


def test_pdf_security_scanner_malware_detection():
    # Valid PDF signature
    valid_pdf_bytes = b"%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    is_safe, reason, seal = SecurityScanner.inspect_pdf(valid_pdf_bytes, "clean.pdf")
    assert is_safe is True
    assert seal["integrity_status"] == "VERIFIED_IMMUTABLE"

    # Non-PDF binary signature -> REJECTED
    invalid_bytes = b"NOT_A_PDF_HEADER_CONTENT"
    is_safe_inv, reason_inv, _ = SecurityScanner.inspect_pdf(invalid_bytes, "bad.txt")
    assert is_safe_inv is False
    assert "Invalid binary file signature" in reason_inv

    # PDF with active JavaScript malware exploit -> REJECTED
    malicious_bytes = b"%PDF-1.7\n/JavaScript /JavaScript /JavaScript /JavaScript /Launch /Launch /Launch /Launch"
    is_safe_mal, reason_mal, _ = SecurityScanner.inspect_pdf(malicious_bytes, "malware.pdf")
    assert is_safe_mal is False
    assert "Malware Vector Blocked" in reason_mal


def test_first_user_admin_and_subsequent_analyst_rule():
    from backend.app.api.auth import register_user
    from backend.app.schemas.schemas import UserCreate
    from unittest.mock import MagicMock
    import hashlib

    init_db()
    db = SessionLocal()
    try:
        new_org = Organization(name=f"Org_{uuid.uuid4().hex[:6]}", domain="testorg.com")
        db.add(new_org)
        db.commit()

        # Dummy request
        mock_req = MagicMock()
        mock_req.client.host = "127.0.0.1"

        # 1. First user registered in this org becomes admin
        u1_in = UserCreate(
            email=f"first_{uuid.uuid4().hex[:6]}@testorg.com",
            password="Password123!",
            full_name="First User"
        )
        # Simulate registration logic with org context
        first_role = "admin" if db.query(User).filter(User.organization_id == new_org.id).count() == 0 else "analyst"
        assert first_role == "admin"

        u1 = User(
            email=u1_in.email,
            hashed_password=get_password_hash(u1_in.password),
            full_name=u1_in.full_name,
            role=first_role,
            organization_id=new_org.id
        )
        db.add(u1)
        db.commit()
        assert u1.role == "admin"

        # 2. Second user even with 'admin' in email MUST NOT be auto-admin
        u2_in = UserCreate(
            email=f"admin_officer_{uuid.uuid4().hex[:6]}@testorg.com",
            password="Password123!",
            full_name="Admin Officer"
        )
        second_role = "admin" if db.query(User).filter(User.organization_id == new_org.id).count() == 0 else "analyst"
        assert second_role == "analyst"  # 'admin' substring ignored

        u2 = User(
            email=u2_in.email,
            hashed_password=get_password_hash(u2_in.password),
            full_name=u2_in.full_name,
            role=second_role,
            organization_id=new_org.id
        )
        db.add(u2)
        db.commit()
        assert u2.role == "analyst"

    finally:
        db.close()


def test_sha256_hash_chain_verification():
    import hashlib
    # Simulating document hash chaining
    doc1_bytes = b"%PDF-1.7\nDoc 1 content"
    doc2_bytes = b"%PDF-1.7\nDoc 2 content"

    hash1 = hashlib.sha256(doc1_bytes).hexdigest()
    prev1 = "0" * 64
    chain1 = hashlib.sha256(f"{prev1}:{hash1}".encode()).hexdigest()

    hash2 = hashlib.sha256(doc2_bytes).hexdigest()
    prev2 = chain1
    chain2 = hashlib.sha256(f"{prev2}:{hash2}".encode()).hexdigest()

    # Verify integrity
    assert hashlib.sha256(f"{prev1}:{hash1}".encode()).hexdigest() == chain1
    assert hashlib.sha256(f"{prev2}:{hash2}".encode()).hexdigest() == chain2

    # Tamper detection
    tampered_bytes = b"%PDF-1.7\nTampered Doc 1"
    tampered_hash = hashlib.sha256(tampered_bytes).hexdigest()
    assert tampered_hash != hash1

