import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="FinanceCorp Global")
    domain = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization")
    documents = relationship("Document", back_populates="organization")
    invitations = relationship("Invitation", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="analyst", nullable=False)  # admin, analyst, viewer
    is_active = Column(Boolean, default=True)
    provider = Column(String, default="local", nullable=False)  # local, google
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    documents = relationship("Document", back_populates="uploader", foreign_keys="Document.uploaded_by_id")
    shared_access = relationship("DocumentAccess", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    sent_invitations = relationship("Invitation", back_populates="invited_by", foreign_keys="Invitation.invited_by_id")
    chat_sessions = relationship("ChatSession", back_populates="user")


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, nullable=False, index=True)
    role = Column(String, default="analyst", nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    invited_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_accepted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="invitations")
    invited_by = relationship("User", back_populates="sent_invitations", foreign_keys=[invited_by_id])


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash = Column(String, index=True, nullable=False)
    total_pages = Column(Integer, default=0)
    company_name = Column(String, nullable=True)
    fiscal_period = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    is_org_shared = Column(Boolean, default=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    data_retention_until = Column(DateTime, nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="documents")
    uploader = relationship("User", back_populates="documents", foreign_keys=[uploaded_by_id])
    access_grants = relationship("DocumentAccess", back_populates="document", cascade="all, delete-orphan")
    analysis = relationship("AnalysisRecord", back_populates="document", uselist=False, cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="document", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="document", cascade="all, delete-orphan")


class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    permission = Column(String, default="view")  # view, edit
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="access_grants")
    user = relationship("User", back_populates="shared_access")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_start = Column(Integer, nullable=False)
    page_end = Column(Integer, nullable=False)
    section = Column(String, nullable=True)
    subsection = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # Store vector embedding float list
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    metric_key = Column(String, index=True, nullable=False)
    metric_value = Column(String, nullable=False)
    unit = Column(String, nullable=True)
    period = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    verbatim_quote = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="metrics")


class AnalysisRecord(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), unique=True, nullable=False)
    result_json = Column(JSON, nullable=False)
    status = Column(String, default="completed")
    latency_ms = Column(Integer, default=0)
    llm_cost_usd = Column(Float, default=0.0)
    overall_confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="analysis")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="Financial Analysis Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chat_sessions")
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)  # upload, analyze, view, share, delete, query_rag, login
    document_id = Column(String, nullable=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    ip_address = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
    organization = relationship("Organization", back_populates="audit_logs")
