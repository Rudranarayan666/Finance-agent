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


class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    permission = Column(String, default="view")  # view, edit
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="access_grants")
    user = relationship("User", back_populates="shared_access")


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


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user_email = Column(String, nullable=True)
    action = Column(String, nullable=False)  # upload, analyze, view, share, delete, query_rag
    document_id = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
