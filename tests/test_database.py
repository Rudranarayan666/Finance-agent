import uuid
import pytest
from backend.app.database import SessionLocal, init_db
from backend.app.models.models import (
    Organization, User, Invitation, Document, DocumentChunk, Metric, ChatSession, ChatMessage, AuditLog
)


def test_database_models_crud():
    init_db()
    db = SessionLocal()
    unique_id = str(uuid.uuid4())[:8]
    test_email = f"testuser_{unique_id}@test.corp"
    invite_email = f"invited_{unique_id}@test.corp"
    try:
        # Create Organization
        org = Organization(name=f"Test Corp {unique_id}", domain=f"test_{unique_id}.corp")
        db.add(org)
        db.commit()
        db.refresh(org)
        assert org.id is not None

        # Create User inside Organization
        user = User(
            email=test_email,
            hashed_password="hashed_pass_123",
            full_name="Test User",
            role="analyst",
            organization_id=org.id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None
        assert user.organization_id == org.id

        # Create Invitation
        invitation = Invitation(
            email=invite_email,
            role="analyst",
            organization_id=org.id,
            token=f"token_{unique_id}",
            invited_by_id=user.id
        )
        db.add(invitation)
        db.commit()
        db.refresh(invitation)
        assert invitation.id is not None
        assert invitation.token == f"token_{unique_id}"

        # Create Document
        doc = Document(
            filename="test_report.pdf",
            file_path="./uploads/test_report.pdf",
            file_size_bytes=1024,
            file_hash=f"hash_{unique_id}",
            uploaded_by_id=user.id,
            organization_id=org.id
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        assert doc.id is not None

        # Create DocumentChunk
        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            page_start=1,
            page_end=1,
            section="Executive Summary",
            content="Sample text content for chunking."
        )
        db.add(chunk)

        # Create Metric
        metric = Metric(
            document_id=doc.id,
            metric_key="Revenue",
            metric_value="$100M",
            unit="USD",
            period="Q3 2026",
            page_number=1,
            verbatim_quote="Revenue was $100M in Q3 2026."
        )
        db.add(metric)

        # Create ChatSession and Message
        session = ChatSession(
            document_id=doc.id,
            user_id=user.id,
            title="Q3 Revenue Chat"
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        msg = ChatMessage(
            session_id=session.id,
            role="user",
            content="What was Q3 revenue?"
        )
        db.add(msg)

        # Create AuditLog
        audit = AuditLog(
            user_id=user.id,
            user_email=user.email,
            action="CREATE_TEST_MODEL",
            document_id=doc.id,
            organization_id=org.id
        )
        db.add(audit)
        db.commit()

        # Query verification
        queried_org = db.query(Organization).filter(Organization.id == org.id).first()
        assert len(queried_org.users) >= 1
        assert len(queried_org.documents) >= 1
        assert len(queried_org.invitations) >= 1

    finally:
        db.close()
