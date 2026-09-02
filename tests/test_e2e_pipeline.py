import os
import pytest
from backend.app.parser.pdf_parser import PDFDocumentParser
from backend.app.agents.supervisor import build_financial_analyzer_graph


def test_end_to_end_sample_pdf_pipeline():
    sample_pdf_path = "eval/data/sample_q3_fy26.pdf"
    assert os.path.exists(sample_pdf_path), "Sample PDF should exist"

    # 1. Parse PDF pages
    parser = PDFDocumentParser(sample_pdf_path)
    extracted = parser.extract_pages()
    assert extracted["total_pages"] == 3
    pages_data = extracted["pages"]
    pages_dict = {p["page_number"]: p["text"] for p in pages_data}
    chunks = parser.create_overlapping_chunks(pages_data, chunk_size=15, overlap=2)

    # 2. Setup Initial Graph State
    initial_state = {
        "document_id": "test-doc-123",
        "file_path": sample_pdf_path,
        "uploaded_by": "test_user_id",
        "access_level": "owner",
        "total_pages": 3,
        "pages_dict": pages_dict,
        "chunks": chunks,
        "company_name": None,
        "fiscal_period": None,
        "filing_type": "10-Q",
        "period_normalized": None,
        "section_map": {},
        "financial_candidates": [],
        "guidance_candidates": [],
        "risk_candidates": [],
        "metrics": [],
        "retry_count": 0,
        "validation_errors": [],
        "interpretation_summary": None,
        "claims": [],
        "final_result": None,
        "pages_processed": 3,
        "num_chunks_processed": 1,
        "relevant_chunks": 1,
        "agent_retries": 0,
        "conflicts_detected": 0,
        "ocr_applied_pages": [],
        "total_latency_ms": 0,
        "total_llm_cost_usd": 0.0
    }

    # 3. Execute LangGraph workflow
    graph = build_financial_analyzer_graph()
    final_state = graph.invoke(initial_state)

    final_result = final_state.get("final_result")
    assert final_result is not None
    assert "document_meta" in final_result
    assert "metrics" in final_result
    assert "interpretation" in final_result
    assert "chart_data" in final_result
    assert "coverage_report" in final_result

    # 4. Verify 8 Target Metrics
    metrics = final_result["metrics"]
    assert len(metrics) == 8

    # Check Total Revenue metric
    rev = next((m for m in metrics if m["field"] == "total_revenue"), None)
    assert rev is not None
    assert rev["status"] in ["FOUND", "NOT_DISCLOSED"]
    if rev["status"] == "FOUND":
        assert rev["source"]["page"] is not None
        assert rev["source"]["quote"] is not None

    # Check Chart Data
    chart_data = final_result["chart_data"]
    assert len(chart_data["quarters"]) == 4
    assert len(chart_data["revenue"]) == 4

    # Check Coverage Report
    coverage = final_result["coverage_report"]
    assert coverage["fields_found"] >= 1
    assert coverage["overall_extraction_confidence"] > 0.0
