import pytest
from backend.app.engine.arithmetic import (
    parse_numeric_financial,
    compute_gross_margin,
    compute_yoy_growth,
    normalize_fiscal_period
)


def test_parse_numeric_financial():
    assert parse_numeric_financial("$94,930 million") == 94930.0
    assert parse_numeric_financial("94.9B") == 94900.0
    assert parse_numeric_financial("(1,250)") == -1250.0
    assert parse_numeric_financial("-45.6%") == -45.6
    assert parse_numeric_financial(None) is None


def test_deterministic_gross_margin():
    # Revenue: $100M, Gross Profit: $45M -> 45.0%
    gm, formula = compute_gross_margin(100.0, 45.0)
    assert gm == 45.0
    assert "Gross Profit (45.0) / Revenue (100.0) * 100 = 45.00%" in formula


def test_deterministic_yoy_growth():
    # Current: $110M, Prior: $100M -> +10.0%
    growth, formula = compute_yoy_growth(110.0, 100.0)
    assert growth == 10.0
    assert "10.00%" in formula


def test_fiscal_period_normalization():
    p1 = normalize_fiscal_period("Q3 FY2026")
    assert p1["quarter"] == 3
    assert p1["fiscal_year"] == 2026

    p2 = normalize_fiscal_period("Three months ended September 30, 2026")
    assert p2["period_end"] == "2026-09-30"
    assert p2["fiscal_year"] == 2026
