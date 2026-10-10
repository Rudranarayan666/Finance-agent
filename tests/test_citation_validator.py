import pytest
from backend.app.engine.citation_validator import CitationValidator


def test_valid_citation_verification():
    pages_dict = {
        1: "FinanceCorp reported Total Revenue of $500 Million for Q3 2026, representing a growth of 15% YoY.",
        2: "Profit After Tax (PAT) reached $85 Million. Operating cash flow stood at $120 Million."
    }

    citation = {
        "citation_id": "cite_001",
        "document_id": "doc_abc123",
        "document_version": "v1",
        "physical_page_index": 0,
        "physical_page_number": 1,
        "printed_page_label": "1",
        "content_type": "text",
        "quote": "FinanceCorp reported Total Revenue of $500 Million"
    }

    is_valid, msg, validated = CitationValidator.validate_single_citation(
        doc_id="doc_abc123",
        doc_version="v1",
        total_pages=2,
        citation=citation,
        page_text=pages_dict[1]
    )

    assert is_valid is True
    assert validated["verification_status"] == "verified"
    assert validated["physical_page_number"] == 1
    assert validated["physical_page_index"] == 0
    assert validated["document_version"] == "v1"


def test_out_of_bounds_page_index_rejected():
    citation = {
        "citation_id": "cite_invalid_page",
        "document_id": "doc_abc123",
        "document_version": "v1",
        "physical_page_index": 99,
        "physical_page_number": 100,
        "quote": "Sample statement"
    }

    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="doc_abc123",
        doc_version="v1",
        total_pages=5,
        citation=citation,
        page_text="Sample statement"
    )

    assert is_valid is False
    assert "outside valid PDF range" in msg


def test_stale_document_version_rejected():
    citation = {
        "citation_id": "cite_old_version",
        "document_id": "doc_abc123",
        "document_version": "v2",  # Mismatch with doc_version "v1"
        "physical_page_index": 0,
        "physical_page_number": 1,
        "quote": "Sample text"
    }

    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="doc_abc123",
        doc_version="v1",
        total_pages=2,
        citation=citation,
        page_text="Sample text"
    )

    assert is_valid is False
    assert "Stale citation version" in msg


def test_fabricated_quote_rejected():
    citation = {
        "citation_id": "cite_fake",
        "document_id": "doc_abc123",
        "document_version": "v1",
        "physical_page_index": 0,
        "physical_page_number": 1,
        "quote": "Unicorn technologies generated $999 Trillion in profits from mars operations."
    }

    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="doc_abc123",
        doc_version="v1",
        total_pages=2,
        citation=citation,
        page_text="FinanceCorp reported normal revenue."
    )

    assert is_valid is False
    assert "not found on page" in msg


def test_cross_document_violation_rejected():
    citation = {
        "citation_id": "cite_other_doc",
        "document_id": "doc_OTHER_999",  # Cross-document leak attempt
        "document_version": "v1",
        "physical_page_index": 0,
        "physical_page_number": 1,
        "quote": "Some revenue"
    }

    is_valid, msg, _ = CitationValidator.validate_single_citation(
        doc_id="doc_AUTHORIZED_111",
        doc_version="v1",
        total_pages=2,
        citation=citation,
        page_text="Some revenue"
    )

    assert is_valid is False
    assert "Cross-document violation" in msg


def test_bounding_box_resolution_from_text_blocks():
    text_blocks = [
        {"x0": 50.0, "y0": 100.0, "x1": 450.0, "y1": 120.0, "text": "Acme reported Revenue of $94,930 million"},
        {"x0": 50.0, "y0": 150.0, "x1": 450.0, "y1": 170.0, "text": "Net income was $25,000 million"}
    ]

    citation = {
        "citation_id": "cite_bbox",
        "document_id": "doc_123",
        "document_version": "v1",
        "physical_page_index": 0,
        "physical_page_number": 1,
        "quote": "Revenue of $94,930 million"
    }

    is_valid, msg, validated = CitationValidator.validate_single_citation(
        doc_id="doc_123",
        doc_version="v1",
        total_pages=5,
        citation=citation,
        page_text="Acme reported Revenue of $94,930 million",
        text_blocks=text_blocks
    )

    assert is_valid is True
    assert validated["region"] is not None
    assert validated["region"]["x0"] == 50.0
    assert validated["region"]["y0"] == 100.0
