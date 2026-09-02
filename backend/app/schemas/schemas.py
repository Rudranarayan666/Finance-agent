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
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DocumentSummary(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    total_pages: int
    company_name: Optional[str] = None
    fiscal_period: Optional[str] = None
    status: str
    uploaded_at: datetime
    uploaded_by: str
    blockchain_seal: Optional[Dict[str, Any]] = None


class DocumentShareRequest(BaseModel):
    user_email: str
    permission: str = "view"


class AskQuestionRequest(BaseModel):
    question: str


class AskQuestionResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]] = []
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
