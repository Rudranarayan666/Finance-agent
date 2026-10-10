import pytest
import uuid
from backend.app.rag.rag_service import AgenticRAGService

def test_hybrid_retrieval_synonyms_and_scoring():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages_data = [
        {
            "physical_page_number": 1,
            "physical_page_index": 0,
            "printed_page_label": "1",
            "text": "The company reported Total Revenue of $1,200 Million for FY2026. Growth of 12% YoY was recorded.",
            "tables": [],
            "visual_regions": [],
            "text_blocks": [
                {"bbox": (50.0, 100.0, 400.0, 150.0), "text": "The company reported Total Revenue of $1,200 Million for FY2026."}
            ]
        },
        {
            "physical_page_number": 2,
            "physical_page_index": 1,
            "printed_page_label": "2",
            "text": "Profit After Tax (PAT) stood at $180 Million. Net cash flow generated from operating activities was $240 Million.",
            "tables": [],
            "visual_regions": [],
            "text_blocks": [
                {"bbox": (60.0, 120.0, 450.0, 160.0), "text": "Profit After Tax (PAT) stood at $180 Million."}
            ]
        }
    ]

    rag.index_document_chunks(doc_id, pages_data, document_version="v1")

    # 1. Test synonym expansion: PAT -> Profit After Tax
    res_pat = rag.answer_question(doc_id, "What is the PAT for FY2026?")
    assert res_pat["grounded"] is True
    assert "$180 Million" in res_pat["answer"]
    assert len(res_pat["citations"]) > 0
    assert res_pat["citations"][0]["physical_page_number"] == 2
    assert res_pat["verification"]["citations_validated"] is True

    # 2. Test synonym expansion: operating cash flow -> Net cash flow generated from operating activities
    res_ocf = rag.answer_question(doc_id, "What was the operating cash flow?")
    assert res_ocf["grounded"] is True
    assert "$240 Million" in res_ocf["answer"]
    assert res_ocf["citations"][0]["physical_page_number"] == 2

    # 3. Test Revenue query
    res_rev = rag.answer_question(doc_id, "What was the total revenue?")
    assert res_rev["grounded"] is True
    assert "$1,200 Million" in res_rev["answer"]
    assert res_rev["citations"][0]["physical_page_number"] == 1


def test_hybrid_retrieval_structured_table_and_visual():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages_data = [
        {
            "physical_page_number": 5,
            "physical_page_index": 4,
            "printed_page_label": "5",
            "text": "Segment Performance Overview",
            "tables": [
                {
                    "table_id": "tbl_seg_1",
                    "title": "Segment Revenue Breakdown",
                    "headers": ["Segment", "Revenue (FY26)", "Revenue (FY25)"],
                    "rows": [
                        ["Enterprise Cloud", "$650M", "$500M"],
                        ["Consumer Devices", "$350M", "$320M"]
                    ],
                    "bbox": (50.0, 200.0, 500.0, 350.0)
                }
            ],
            "visual_regions": [
                {
                    "region_id": "vis_chart_1",
                    "type": "chart",
                    "caption": "Quarterly Operating Margin Trend Line",
                    "bbox": (50.0, 400.0, 500.0, 600.0)
                }
            ],
            "text_blocks": []
        }
    ]

    rag.index_document_chunks(doc_id, pages_data, document_version="v1")

    # 1. Query structured table
    res_table = rag.answer_question(doc_id, "Show me the table breakdown of segment revenue")
    assert res_table["grounded"] is True
    assert "Enterprise Cloud" in res_table["answer"]
    assert len(res_table["citations"]) > 0
    assert res_table["citations"][0]["content_type"] == "table"
    assert res_table["citations"][0]["region"] == (50.0, 200.0, 500.0, 350.0)

    # 2. Query visual chart
    res_chart = rag.answer_question(doc_id, "Is there a visual chart of operating margin trend?")
    assert res_chart["grounded"] is True
    assert "Quarterly Operating Margin Trend Line" in res_chart["answer"]
    assert len(res_chart["citations"]) > 0
    assert res_chart["citations"][0]["content_type"] == "chart"
    assert res_chart["citations"][0]["region"] == (50.0, 400.0, 500.0, 600.0)


def test_hybrid_retrieval_safe_abstention():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages_data = [
        {
            "physical_page_number": 1,
            "physical_page_index": 0,
            "printed_page_label": "1",
            "text": "FinanceCorp balance sheet details.",
            "tables": [],
            "visual_regions": [],
            "text_blocks": []
        }
    ]
    rag.index_document_chunks(doc_id, pages_data, document_version="v1")

    # Query with unsupported topic -> Must abstain deterministically
    res_unsupported = rag.answer_question(doc_id, "What is the secret recipe for quantum cold fusion?")
    assert res_unsupported["grounded"] is False
    assert "could not find direct verifiable evidence" in res_unsupported["answer"].lower()
    assert res_unsupported["citations"] == []
    assert res_unsupported["verification"]["citations_validated"] is False
