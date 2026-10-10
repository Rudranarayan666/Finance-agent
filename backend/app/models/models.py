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
    is_admin = Column(Boolean, default=False, nullable=False)
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
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credit_account = relationship("CreditAccount", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credit_transactions = relationship("CreditTransaction", back_populates="user", cascade="all, delete-orphan")
    usage_records = relationship("UsageRecord", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")


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
    prev_hash = Column(String, nullable=True)
    chain_hash = Column(String, index=True, nullable=True)
    total_pages = Column(Integer, default=0)
    version = Column(Integer, default=1)
    document_version = Column(String, default="v1")
    company_name = Column(String, nullable=True)
    fiscal_period = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, uploaded, queued, processing, indexing, completed, ready, failed
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
    evidence_records = relationship("EvidenceRecord", back_populates="document", cascade="all, delete-orphan")
    metrics = relationship("Metric", back_populates="document", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="document", cascade="all, delete-orphan")


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    document_version = Column(String, default="v1", nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    physical_page_index = Column(Integer, nullable=False)  # 0-indexed
    physical_page_number = Column(Integer, nullable=False)  # 1-indexed
    printed_page_label = Column(String, nullable=True)
    section_title = Column(String, nullable=True)
    content_type = Column(String, default="text")  # text, table, chart, image, ocr, financial_metric
    raw_text = Column(Text, nullable=False)
    normalized_text = Column(Text, nullable=True)
    table_data = Column(JSON, nullable=True)  # {headers: [], rows: [], units: "", currency: ""}
    bounding_boxes = Column(JSON, nullable=True)  # [{x0, y0, x1, y1, label}]
    source_asset_reference = Column(String, nullable=True)
    extraction_method = Column(String, default="pymupdf")
    extraction_confidence = Column(Float, default=1.0)
    content_hash = Column(String, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="evidence_records")


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


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, index=True, nullable=False)  # basic, pro, premium
    name = Column(String, nullable=False)
    price = Column(Integer, nullable=False, default=0)  # in INR (0, 299, 799)
    currency = Column(String, default="INR", nullable=False)
    billing_interval = Column(String, default="month", nullable=False)
    max_documents = Column(Integer, nullable=False, default=2)  # Active document allowance
    monthly_credits = Column(Integer, nullable=False, default=100)
    questions_per_doc_limit = Column(Integer, nullable=False, default=5)
    upload_credit_cost = Column(Integer, nullable=False, default=10)
    question_credit_cost = Column(Integer, nullable=False, default=15)
    visual_credit_cost = Column(Integer, nullable=False, default=10)
    can_download_reports = Column(Boolean, default=False, nullable=False)
    can_compare_years = Column(Boolean, default=False, nullable=False)
    priority_processing = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String, default="active", nullable=False)  # active, canceled, expired, past_due
    current_period_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    provider_subscription_id = Column(String, nullable=True)
    provider_order_id = Column(String, nullable=True)
    provider_payment_id = Column(String, nullable=True)
    canceled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class CreditAccount(Base):
    __tablename__ = "credit_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    balance = Column(Integer, default=100, nullable=False)
    period_allowance = Column(Integer, default=100, nullable=False)
    period_used = Column(Integer, default=0, nullable=False)
    period_start = Column(DateTime, default=datetime.utcnow, nullable=False)
    period_end = Column(DateTime, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="credit_account")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    transaction_type = Column(String, nullable=False)  # grant, upload_debit, question_debit, visual_debit, refund, admin_adjustment
    amount = Column(Integer, nullable=False)  # positive for grant/refund, negative for debit
    balance_before = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="credit_transactions")
    document = relationship("Document")


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True, index=True)
    operation_type = Column(String, nullable=False)  # upload, question, visual_analysis, report_download
    status = Column(String, default="success", nullable=False)  # success, failed
    credits_charged = Column(Integer, default=0, nullable=False)
    billing_period_start = Column(DateTime, nullable=True)
    idempotency_key = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="usage_records")
    document = relationship("Document")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=True)
    provider = Column(String, default="razorpay", nullable=False)
    order_id = Column(String, nullable=False, index=True)
    payment_id = Column(String, nullable=True, index=True)
    signature = Column(String, nullable=True)
    amount = Column(Integer, nullable=False)  # amount in paise or INR
    currency = Column(String, default="INR", nullable=False)
    status = Column(String, default="created", nullable=False)  # created, captured, failed
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")

