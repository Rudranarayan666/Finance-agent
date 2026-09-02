import pytest
from backend.app.engine.reconciliation import ReconciliationEngine


def test_reconciliation_single_candidate():
    candidates = [
        {
            "field": "total_revenue",
            "value": "$94,930 million",
            "unit": "USD millions",
            "confidence": "high",
            "source": {"page": 1, "quote": "Total revenue was $94,930 million"},
            "section_type": "financial_statements"
        }
    ]
    reconciled = ReconciliationEngine.reconcile_metrics(candidates)
    rev = next((m for m in reconciled if m["field"] == "total_revenue"), None)
    assert rev is not None
    assert rev["value"] == "$94,930 million"


def test_reconciliation_conflict_priority():
    # Candidate 1: From primary Financial Statements ($94,930M)
    # Candidate 2: Incidental mention in MD&A Commentary ($95 billion)
    candidates = [
        {
            "field": "total_revenue",
            "value": "$94,930 million",
            "unit": "USD millions",
            "confidence": "high",
            "source": {"page": 2, "quote": "Total net sales were $94,930 million"},
            "section_type": "financial_statements"
        },
        {
            "field": "total_revenue",
            "value": "$95 billion",
            "unit": "USD billions",
            "confidence": "medium",
            "source": {"page": 14, "quote": "Approximate revenue of $95 billion was achieved"},
            "section_type": "mda"
        }
    ]
    reconciled = ReconciliationEngine.reconcile_metrics(candidates)
    rev = next((m for m in reconciled if m["field"] == "total_revenue"), None)
    assert rev is not None
    assert rev["value"] == "$94,930 million"  # Must prefer financial statements over MD&A


def test_reconciliation_coverage_generation():
    metrics = [
        {"field": "total_revenue", "value": "$100M", "confidence": "high", "status": "FOUND"},
        {"field": "gross_margin_pct", "value": "45%", "confidence": "high", "status": "FOUND"},
        {"field": "net_income", "value": "$20M", "confidence": "high", "status": "FOUND"},
        {"field": "operating_cash_flow", "value": "$30M", "confidence": "high", "status": "FOUND"},
        {"field": "yoy_revenue_growth_pct", "value": "12%", "confidence": "medium", "status": "FOUND"},
        {"field": "forward_guidance", "value": "Targeting 15% growth", "confidence": "high", "status": "FOUND"},
        {"field": "headcount", "value": None, "confidence": "not_disclosed", "status": "NOT_DISCLOSED"},
        {"field": "key_risk_factors", "value": "Supply chain & FX", "confidence": "high", "status": "FOUND"},
    ]
    cov = ReconciliationEngine.generate_coverage_report(metrics)
    assert cov["fields_found"] == 7
    assert "headcount" in cov["fields_not_disclosed"]
    assert cov["overall_extraction_confidence"] >= 0.80
