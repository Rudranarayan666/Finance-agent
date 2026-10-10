import os
import uuid
import pytest
from fastapi import Request, HTTPException
from fastapi.testclient import TestClient

from backend.app.rag.rag_service import AgenticRAGService
from backend.app.engine.citation_validator import CitationValidator
from backend.app.engine.arithmetic import (
    compute_gross_margin,
    compute_operating_margin,
    compute_net_margin,
    compute_yoy_growth
)
from backend.app.models.models import Organization, User, Document, EvidenceRecord
from backend.app.database import SessionLocal, init_db
from backend.app.core.security import get_password_hash
from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError
from backend.app.parser.document_parser import DocumentParser, DocumentParserError
from backend.app.main import app


# 1. Known revenue question retrieves correct passage and page
def test_known_revenue_question_retrieves_correct_page():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages = [
        {"physical_page_number": 1, "physical_page_index": 0, "text": "Corporate Overview and General Information."},
        {"physical_page_number": 2, "physical_page_index": 1, "text": "Consolidated Statement: Total Revenue was $2,450 Million for FY2026."}
    ]
    rag.index_document_chunks(doc_id, pages)

    res = rag.answer_question(doc_id, "What was the Total Revenue for FY2026?")
    assert res["grounded"] is True
    assert "$2,450 Million" in res["answer"]
    assert len(res["citations"]) > 0
    assert res["citations"][0]["physical_page_number"] == 2
    assert res["citations"][0]["physical_page_index"] == 1


# 2. Financial synonym (PAT -> Profit After Tax)
def test_financial_synonym_pat_retrieval():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages = [
        {"physical_page_number": 1, "text": "Operating commentary."},
        {"physical_page_number": 2, "text": "Profit After Tax for the year ended was $320 Million."}
    ]
    rag.index_document_chunks(doc_id, pages)

    res = rag.answer_question(doc_id, "How much was PAT?")
    assert res["grounded"] is True
    assert "$320 Million" in res["answer"]
    assert res["citations"][0]["physical_page_number"] == 2


# 3. Question about final page of a multi-page document
def test_long_document_final_page_retrieval():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages = [{"physical_page_number": i, "text": f"Page {i} regular financial commentary."} for i in range(1, 10)]
    pages.append({
        "physical_page_number": 10,
        "physical_page_index": 9,
        "printed_page_label": "Appendix-X",
        "text": "Note 42: Capital expenditure commitment was $850 Million."
    })
    rag.index_document_chunks(doc_id, pages)

    res = rag.answer_question(doc_id, "What was the capital expenditure commitment in Note 42?")
    assert res["grounded"] is True
    assert "$850 Million" in res["answer"]
    assert res["citations"][0]["physical_page_number"] == 10
    assert res["citations"][0]["printed_page_label"] == "Appendix-X"


# 4. Unsupported question produces controlled abstention
def test_unsupported_question_produces_abstention():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages = [{"physical_page_number": 1, "text": "Annual report details regarding commercial operations."}]
    rag.index_document_chunks(doc_id, pages)

    res = rag.answer_question(doc_id, "What is the secret recipe for interstellar dark matter fuel?")
    assert res["grounded"] is False
    assert "could not find direct verifiable evidence" in res["answer"].lower()
    assert res["citations"] == []
    assert res["confidence"] == 0.0


# 5. Empty or malformed PDF fails safely without indexing
def test_empty_or_malformed_pdf_fails_safely():
    # Non-existent file
    with pytest.raises((PDFParserError, DocumentParserError)):
        DocumentParser("non_existent_file_xyz.pdf")

    # Invalid header file
    dummy_path = "uploads/temp_invalid.pdf"
    os.makedirs("uploads", exist_ok=True)
    with open(dummy_path, "wb") as f:
        f.write(b"NOT A VALID PDF HEADER")

    try:
        with pytest.raises(PDFParserError):
            parser = PDFDocumentParser(dummy_path)
    finally:
        if os.path.exists(dummy_path):
            os.remove(dummy_path)


# 6. Citations preserve physical page indices and printed labels
def test_citations_preserve_physical_index_and_labels():
    rag = AgenticRAGService()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    pages = [
        {
            "physical_page_number": 4,
            "physical_page_index": 3,
            "printed_page_label": "IV",
            "text": "Net income reached $95 Million for the third quarter."
        }
    ]
    rag.index_document_chunks(doc_id, pages, document_version="v2")

    res = rag.answer_question(doc_id, "What was net income?")
    assert res["grounded"] is True
    cit = res["citations"][0]
    assert cit["physical_page_number"] == 4
    assert cit["physical_page_index"] == 3
    assert cit["printed_page_label"] == "IV"
    assert cit["document_version"] == "v2"


# 7. Citation validation rejects incorrect doc IDs and invalid pages
def test_citation_validator_rejects_tampered_metadata():
    pages_dict = {1: "Revenue was $100 Million."}
    
    # Wrong doc ID
    invalid_doc_cite = {
        "citation_id": "c1",
        "document_id": "wrong_doc_id",
        "document_version": "v1",
        "physical_page_number": 1,
        "physical_page_index": 0,
        "quote": "Revenue was $100 Million."
    }
    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="correct_doc_id",
        doc_version="v1",
        total_pages=1,
        citation=invalid_doc_cite,
        page_text=pages_dict[1]
    )
    assert is_valid is False
    assert "Cross-document violation" in msg

    # Page out of range
    invalid_page_cite = {
        "citation_id": "c2",
        "document_id": "correct_doc_id",
        "document_version": "v1",
        "physical_page_number": 55,
        "physical_page_index": 54,
        "quote": "Revenue was $100 Million."
    }
    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="correct_doc_id",
        doc_version="v1",
        total_pages=5,
        citation=invalid_page_cite,
        page_text=""
    )
    assert is_valid is False
    assert "outside valid PDF range" in msg


# 8. Re-indexing / Database Persistence on Restart Workflow
def test_index_persistence_recovers_from_database():
    init_db()
    db = SessionLocal()
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    try:
        # Create a document record and EvidenceRecord in DB
        doc = Document(
            id=doc_id,
            filename="persistent_report.pdf",
            file_path="uploads/dummy.pdf",
            file_size_bytes=500,
            file_hash=f"hash_{uuid.uuid4().hex[:8]}",
            total_pages=1,
            uploaded_by_id="user_test",
            status="ready",
            document_version="v1"
        )
        ev_rec = EvidenceRecord(
            document_id=doc_id,
            document_version="v1",
            physical_page_index=0,
            physical_page_number=1,
            printed_page_label="1",
            content_type="text",
            raw_text="Operating Revenue was $880 Million in audited records."
        )
        db.add_all([doc, ev_rec])
        db.commit()

        # Simulate fresh RAG service with empty in-memory index
        fresh_rag = AgenticRAGService()
        assert doc_id not in fresh_rag.doc_passages

        # Querying the document triggers on-demand database recovery
        res = fresh_rag.answer_question(doc_id, "What was operating revenue?")
        assert res["grounded"] is True
        assert "$880 Million" in res["answer"]
        assert len(res["citations"]) > 0
        assert res["citations"][0]["physical_page_number"] == 1
    finally:
        db.close()


# 9. Tenant isolation: cross-tenant access blocked
def test_tenant_isolation_in_chat_and_retrieval():
    init_db()
    db = SessionLocal()
    try:
        org_a = Organization(name="Tenant Alpha")
        org_b = Organization(name="Tenant Beta")
        db.add_all([org_a, org_b])
        db.commit()

        user_b = User(
            email=f"user_b_{uuid.uuid4().hex[:6]}@beta.corp",
            hashed_password=get_password_hash("Pass123!"),
            full_name="User Beta",
            role="analyst",
            organization_id=org_b.id
        )
        doc_a = Document(
            filename="tenant_a_secret.pdf",
            file_path="uploads/secret.pdf",
            file_size_bytes=100,
            file_hash=f"hash_{uuid.uuid4().hex[:6]}",
            uploaded_by_id="user_a",
            organization_id=org_a.id,
            is_org_shared=True
        )
        db.add_all([user_b, doc_a])
        db.commit()

        # User B (Tenant Beta) attempting to query Tenant Alpha's document via API
        from backend.app.api.chat import query_grounded_chat, ChatRequest
        fake_req = Request({"type": "http", "method": "POST", "headers": []})
        chat_req = ChatRequest(message="What is the revenue?")

        with pytest.raises(HTTPException) as exc_info:
            query_grounded_chat(
                document_id=doc_a.id,
                chat_req=chat_req,
                request=fake_req,
                current_user=user_b,
                db=db
            )
        assert exc_info.value.status_code == 403
    finally:
        db.close()


# 10. Financial calculations handle zero denominators, missing values, and negative margins safely
def test_financial_calculations_edge_cases():
    # Zero revenue denominator
    assert compute_gross_margin(0.0, 100.0) == (None, None)
    assert compute_operating_margin(0.0, 50.0) == (None, None)
    assert compute_net_margin(0.0, 20.0) == (None, None)

    # Negative revenue
    assert compute_operating_margin(-500.0, 50.0) == (None, None)

    # Valid margins
    gm, gm_f = compute_gross_margin(1000.0, 400.0)
    assert gm == 40.0
    assert "40.00%" in gm_f

    # YoY growth
    growth, g_f = compute_yoy_growth(1200.0, 1000.0)
    assert growth == 20.0
    assert "20.00%" in g_f

    # Zero prior period revenue in YoY growth
    assert compute_yoy_growth(1000.0, 0.0) == (None, None)
