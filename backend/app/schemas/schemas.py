from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


# -------------------------------------------------------------
# Metric Status & Enums
# -------------------------------------------------------------
class ExtractionStatus(str, Enum):
    FOUND = "FOUND"
    NOT_DISCLOSED = "NOT_DISCLOSED"
    AMBIGUOUS = "AMBIGUOUS"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class ConfidenceLevel(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NOT_DISCLOSED = "not_disclosed"


class ExtractionMethod(str, Enum):
    DIRECT_STATEMENT = "direct_statement"
    COMPUTED = "computed"
    NOT_FOUND = "not_found"


class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"
    CUSTOMER = "customer"


# -------------------------------------------------------------
# Strict Output Contract (Section 3)
# -------------------------------------------------------------
class DocumentMeta(BaseModel):
    company_name: str
    fiscal_period: str
    filing_type: str = "10-Q"  # 10-Q | 10-K | earnings_release | other
    total_pages: int
    processed_at: str
    uploaded_by: str
    access_level: str = "owner"  # owner | shared_viewer
    period_normalized: Optional[Dict[str, Any]] = None  # { fiscal_year, quarter, period_end }


class MetricSource(BaseModel):
    page: Optional[int] = None
    quote: Optional[str] = None


class MetricItem(BaseModel):
    field: str
    value: Optional[str] = None
    numeric_value: Optional[float] = None
    unit: Optional[str] = None
    confidence: ConfidenceLevel = ConfidenceLevel.HIGH
    status: ExtractionStatus = ExtractionStatus.FOUND
    source: MetricSource
    extraction_method: ExtractionMethod = ExtractionMethod.DIRECT_STATEMENT
    calculation_details: Optional[str] = None
    raw_occurrences: Optional[List[Dict[str, Any]]] = None


class InterpretationClaim(BaseModel):
    claim: str
    supporting_metric_fields: List[str] = []
    supporting_quote: str
    source_page: int


class ExecutiveInterpretation(BaseModel):
    summary_text: str
    claims: List[InterpretationClaim] = []


class ChartData(BaseModel):
    quarters: List[str] = Field(default_factory=list)
    revenue: List[float] = Field(default_factory=list)
    net_income: List[float] = Field(default_factory=list)
    gross_margin_pct: List[float] = Field(default_factory=list)
    operating_cash_flow: List[float] = Field(default_factory=list)
    source_page_distribution: Optional[Dict[int, int]] = Field(default_factory=dict)


class CoverageReport(BaseModel):
    fields_found: int
    fields_not_disclosed: List[str] = []
    low_confidence_fields: List[str] = []
    overall_extraction_confidence: float = 0.0


class ProcessingMeta(BaseModel):
    num_chunks_processed: int = 1
    total_latency_ms: int = 0
    total_llm_cost_usd: float = 0.0
    pages_processed: int = 0
    relevant_chunks: int = 0
    agent_retries: int = 0
    conflicts_detected: int = 0
    ocr_applied_pages: List[int] = []


class AnalysisResult(BaseModel):
    document_meta: DocumentMeta
    metrics: List[MetricItem]
    interpretation: ExecutiveInterpretation
    chart_data: ChartData
    coverage_report: CoverageReport
    processing_meta: ProcessingMeta


# -------------------------------------------------------------
# API Request / Response Schemas
# -------------------------------------------------------------
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: UserRole = UserRole.ANALYST


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_admin: bool = False
    provider: str = "local"
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    last_active: Optional[datetime] = None
    created_at: datetime
    has_subscription: bool = False
    plan_key: Optional[str] = None
    plan_name: Optional[str] = None
    credits_balance: Optional[int] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DocumentSummary(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    total_pages: int
    version: Optional[int] = 1
    document_version: Optional[str] = "v1"
    company_name: Optional[str] = None
    fiscal_period: Optional[str] = None
    status: str
    uploaded_at: datetime
    uploaded_by: str
    is_org_shared: Optional[bool] = False
    organization_name: Optional[str] = None
    blockchain_seal: Optional[Dict[str, Any]] = None
    integrity_hash: Optional[Dict[str, Any]] = None
    prev_hash: Optional[str] = None
    chain_hash: Optional[str] = None


class DocumentShareRequest(BaseModel):
    user_email: Optional[str] = None
    permission: str = "view"
    share_with_org: Optional[bool] = False


class InviteUserRequest(BaseModel):
    email: str
    role: UserRole = UserRole.ANALYST
    full_name: Optional[str] = None


class AskQuestionRequest(BaseModel):
    question: str


class CitationRegion(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float


class CitationItem(BaseModel):
    citation_id: str
    document_id: str
    document_version: str = "v1"
    evidence_id: Optional[str] = None
    physical_page_index: int = 0  # 0-indexed
    physical_page_number: int = 1  # 1-indexed
    printed_page_label: Optional[str] = None
    content_type: str = "text"  # text, table, chart, image, ocr, financial_metric
    quote: str = ""
    region: Optional[CitationRegion] = None
    verification_status: str = "verified"

    # Compatibility fields for existing tests and UI
    page: Optional[int] = None
    page_label: Optional[str] = None
    snippet: Optional[str] = None
    score: Optional[float] = 1.0
    redirect_url: Optional[str] = None
    page_anchor: Optional[str] = None


class VerificationReport(BaseModel):
    citations_validated: bool = True
    financial_values_validated: bool = True
    warnings: List[str] = []


class AskQuestionResponse(BaseModel):
    answer: str
    document_id: Optional[str] = None
    document_version: Optional[str] = "v1"
    citations: List[Dict[str, Any]] = []
    verification: Optional[Dict[str, Any]] = None
    grounded: bool = True
    confidence: float = 1.0


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    document_id: Optional[str]
    ip_address: Optional[str]
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


# -------------------------------------------------------------
# SaaS Subscription, Credit & Payment Schemas
# -------------------------------------------------------------
class PlanResponse(BaseModel):
    id: str
    key: str
    name: str
    price: int
    currency: str = "INR"
    billing_interval: str = "month"
    max_documents: int
    monthly_credits: int
    questions_per_doc_limit: int
    upload_credit_cost: int
    question_credit_cost: int
    visual_credit_cost: int
    can_download_reports: bool
    can_compare_years: bool
    priority_processing: bool
    is_active: bool


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_id: str
    status: str
    current_period_start: datetime
    current_period_end: datetime
    plan: PlanResponse
    active_documents_count: int = 0
    max_documents: int = 2


class CreditAccountResponse(BaseModel):
    balance: int
    period_allowance: int
    period_used: int
    period_start: datetime
    period_end: datetime
    plan_key: Optional[str] = "basic"
    warning_level: Optional[str] = "none"  # "none", "warning_20", "warning_10", "exhausted"


class CreditTransactionResponse(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    transaction_type: str
    amount: int
    balance_before: int
    balance_after: int
    reason: str
    reference: Optional[str] = None
    created_at: datetime


class SelectPlanRequest(BaseModel):
    plan_key: str


class PaymentCheckoutRequest(BaseModel):
    plan_key: str


class PaymentCheckoutResponse(BaseModel):
    order_id: str
    amount: int
    currency: str = "INR"
    key_id: Optional[str] = None
    plan_key: str
    plan_name: str
    test_mode: bool = True


class PaymentVerifyRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    plan_key: str


class CreditAdjustRequest(BaseModel):
    amount: int
    reason: str


class AdminPlanChangeRequest(BaseModel):
    plan_key: str


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_subscriptions: int
    plan_distribution: Dict[str, int]
    mrr_inr: int
    successful_payments: int
    failed_payments: int
    total_documents: int
    total_questions: int
    total_credits_consumed: int
    recent_events: List[Dict[str, Any]]

