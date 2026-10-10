import pytest
from backend.app.engine.arithmetic import (
    parse_numeric_financial,
    compute_gross_margin,
    compute_operating_margin,
    compute_net_margin,
    compute_yoy_growth,
    detect_reporting_entity_scope,
    normalize_fiscal_period
)
from backend.app.engine.reconciliation import ReconciliationEngine

def test_financial_numeric_parsing_and_multipliers():
    # Parenthesized negative parsing
    assert parse_numeric_financial("(1,234.50)") == -1234.50
    assert parse_numeric_financial("(450)") == -450.0
    assert parse_numeric_financial("-250.75") == -250.75

    # Scale multipliers
    # crore -> 10.0
    assert parse_numeric_financial("500 crore") == 5000.0
    assert parse_numeric_financial("12.5 Cr") == 125.0
    # lakh -> 0.1
    assert parse_numeric_financial("100 lakh") == 10.0
    # billion -> 1000.0
    assert parse_numeric_financial("2.5 billion") == 2500.0
    assert parse_numeric_financial("2.5B") == 2500.0
    # trillion -> 1000000.0
    assert parse_numeric_financial("1.2 trillion") == 1200000.0
    # thousand -> 0.001
    assert parse_numeric_financial("500 thousand") == 0.5


def test_deterministic_margin_computations():
    # Operating Margin: Op Profit 300, Rev 1000 -> 30.0%
    om, om_formula = compute_operating_margin(1000.0, 300.0)
    assert om == 30.0
    assert "Operating Profit (300.0) / Revenue (1,000.0) * 100 = 30.00%" in om_formula

    # Net Margin: Net Income 150, Rev 1000 -> 15.0%
    nm, nm_formula = compute_net_margin(1000.0, 150.0)
    assert nm == 15.0
    assert "Net Income (150.0) / Revenue (1,000.0) * 100 = 15.00%" in nm_formula

    # Zero or negative revenue guards
    assert compute_operating_margin(0.0, 50.0) == (None, None)
    assert compute_net_margin(-100.0, 50.0) == (None, None)


def test_reporting_entity_scope_detection():
    assert detect_reporting_entity_scope("Consolidated Balance Sheet as of March 31") == "consolidated"
    assert detect_reporting_entity_scope("Standalone Statement of Profit and Loss") == "standalone"
    assert detect_reporting_entity_scope("Separate financial statements of the parent company") == "standalone"
    assert detect_reporting_entity_scope("General corporate disclosures") == "consolidated"


def test_conflict_resolution_hierarchy():
    # Financial Statements > Notes to Accounts > MD&A > Press Releases
    candidates = [
        {
            "field": "net_income",
            "value": "$150 million",
            "unit": "USD millions",
            "confidence": "medium",
            "source": {"page": 22, "quote": "Net earnings approximately $150M in commentary"},
            "section_type": "mda"
        },
        {
            "field": "net_income",
            "value": "$145.2 million",
            "unit": "USD millions",
            "confidence": "high",
            "source": {"page": 5, "quote": "Profit for the year: $145.2 million"},
            "section_type": "financial_statements"
        },
        {
            "field": "net_income",
            "value": "$146 million",
            "unit": "USD millions",
            "confidence": "low",
            "source": {"page": 1, "quote": "Record net income of $146M announced"},
            "section_type": "press_release"
        }
    ]

    reconciled = ReconciliationEngine.reconcile_metrics(candidates)
    net_inc = next((m for m in reconciled if m["field"] == "net_income"), None)
    assert net_inc is not None
    # Hierarchy guarantees financial_statements wins over mda and press_release
    assert net_inc["value"] == "$145.2 million"
    assert net_inc["section_type"] == "financial_statements"
