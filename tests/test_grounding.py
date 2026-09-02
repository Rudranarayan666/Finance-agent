import pytest
from backend.app.engine.grounding import DeterministicGroundingValidator, normalize_text


def test_normalize_text():
    raw = "  Total Revenue \n\t was $94,930   Million.  "
    norm = normalize_text(raw)
    assert norm == "total revenue was $94,930 million."


def test_exact_verbatim_grounding():
    pages = {
        1: "Apple Inc. Reports Fourth Quarter Results. Total revenue was $94,930 million for the quarter.",
        2: "Financial commentary and forward outlook."
    }
    validator = DeterministicGroundingValidator(pages)

    # Valid quote on page 1
    is_valid, reason, score = validator.validate_quote(1, "Total revenue was $94,930 million for the quarter.")
    assert is_valid is True
    assert score >= 0.98

    # Quote from non-existent page or absent text -> should fail
    is_valid_fail, reason_fail, _ = validator.validate_quote(1, "Net income was $14,736 million")
    assert is_valid_fail is False
    assert "not found on page 1" in reason_fail.lower()


def test_normalized_whitespace_grounding():
    pages = {
        1: "Total    revenue   for  the\nperiod was   $50.0 billion."
    }
    validator = DeterministicGroundingValidator(pages)

    # Quote with standard single spacing
    is_valid, reason, score = validator.validate_quote(1, "Total revenue for the period was $50.0 billion.")
    assert is_valid is True
    assert score >= 0.90


def test_adjacent_page_grounding():
    pages = {
        1: "Financial Statements section overview.",
        2: "Net cash provided by operating activities was $26,800 million for the quarter."
    }
    validator = DeterministicGroundingValidator(pages)

    # Claimed on page 1, but present on adjacent page 2 (with allow_adjacent=True)
    is_valid, reason, score = validator.validate_quote(1, "Net cash provided by operating activities was $26,800 million", allow_adjacent=True)
    assert is_valid is True
    assert "adjacent page 2" in reason.lower()
