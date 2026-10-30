"""
Pydantic v2 models for Golden Dataset schema.
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict


EvaluationCategory = Literal[
    "numeric_lookup",
    "table_based",
    "multi_hop_yoy",
    "prior_year_trap",
    "unit_trap",
    "unanswerable",
    "prompt_injection",
    "scanned_or_chart"
]

DatasetSplit = Literal["dev", "test"]
VerificationStatus = Literal["unverified", "verified"]
DifficultyLevel = Literal["easy", "medium", "hard"]


class GoldenItem(BaseModel):
    """
    Schema for a single golden evaluation dataset item.
    Enforces strict extraction grounding and provenance fields.
    """
    id: str = Field(description="Unique identifier for the item (e.g., gold_001)")
    doc_id: str = Field(description="Document ID or filename this question is grounded in")
    question: str = Field(description="Natural language question")
    category: EvaluationCategory = Field(description="Category of evaluation task / trap")
    answerable: bool = Field(default=True, description="Whether the document contains sufficient facts to answer")
    expected_value: Optional[float] = Field(default=None, description="Numeric answer normalized to base units")
    unit: Optional[str] = Field(default=None, description="Unit of the expected value (e.g., USD Millions, INR Crores, %)")
    period: Optional[str] = Field(default=None, description="Fiscal period (e.g., Q3 FY2026, FY2024, Three months ended Sep 30, 2026)")
    expected_text: Optional[str] = Field(default=None, description="Expected text phrase or regex target for non-numeric answers")
    gold_pages: List[int] = Field(default_factory=list, description="List of physical 1-indexed pages containing the ground truth")
    gold_quote: Optional[str] = Field(default=None, description="Verbatim quote from the source page supporting the expected answer")
    difficulty: DifficultyLevel = Field(default="medium", description="Question complexity")
    split: DatasetSplit = Field(default="dev", description="Train/dev/test partition")
    status: VerificationStatus = Field(default="unverified", description="Human verification status: unverified or verified")
    notes: Optional[str] = Field(default=None, description="Optional annotations, trap explanations, or reasoning")

    model_config = ConfigDict(extra="ignore")
