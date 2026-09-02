from typing import List, Dict, Any, Optional, Annotated
from typing_extensions import TypedDict
import operator


class AgentState(TypedDict):
    # Input metadata
    document_id: str
    file_path: str
    uploaded_by: str
    access_level: str
    total_pages: int
    
    # Preprocessed raw text and chunks
    pages_dict: Dict[int, str]  # page_num -> text
    chunks: List[Dict[str, Any]]
    
    # Document Metadata
    company_name: Optional[str]
    fiscal_period: Optional[str]
    filing_type: Optional[str]
    period_normalized: Optional[Dict[str, Any]]

    # Section routing info
    section_map: Dict[str, List[int]]  # section_name -> list of page numbers / chunk_ids

    # Candidate extractions from agents
    financial_candidates: Annotated[List[Dict[str, Any]], operator.add]
    guidance_candidates: Annotated[List[Dict[str, Any]], operator.add]
    risk_candidates: Annotated[List[Dict[str, Any]], operator.add]

    # Reconciled & Grounded Metrics
    metrics: List[Dict[str, Any]]
    
    # Retry management
    retry_count: int
    validation_errors: List[str]
    
    # Interpretation & Claims
    interpretation_summary: Optional[str]
    claims: List[Dict[str, Any]]
    
    # Visualizations & Chart Data
    chart_data: Optional[Dict[str, Any]]

    # Final structured output
    final_result: Optional[Dict[str, Any]]
    
    # Observability & Meta
    pages_processed: int
    num_chunks_processed: int
    relevant_chunks: int
    agent_retries: int
    conflicts_detected: int
    ocr_applied_pages: List[int]
    total_latency_ms: int
    total_llm_cost_usd: float
