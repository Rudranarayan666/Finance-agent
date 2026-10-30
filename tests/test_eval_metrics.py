"""
Unit tests for evaluation metrics with hand-computed expected values.
"""
import pytest
from evals.metrics import (
    compute_recall_at_k,
    compute_mrr,
    compute_ndcg_at_k,
    match_numeric,
    match_text,
    evaluate_citations,
    compute_abstention_metrics,
    is_hallucination,
    compute_bootstrap_ci,
    aggregate_dataset_metrics
)


def test_recall_at_k_hand_computed():
    gold = [2, 5]
    # top-3: [1, 2, 3] -> hits: {2} -> 1 / 2 = 0.5
    assert compute_recall_at_k([1, 2, 3, 4], gold, k=3) == 0.5
    # top-1: [1] -> hits: 0 -> 0.0
    assert compute_recall_at_k([1, 2, 3, 4], gold, k=1) == 0.0
    # top-5: [1, 2, 3, 4, 5] -> hits: {2, 5} -> 2 / 2 = 1.0
    assert compute_recall_at_k([1, 2, 3, 4, 5], gold, k=5) == 1.0
    # Empty gold
    assert compute_recall_at_k([1, 2], [], k=3) == 1.0


def test_mrr_hand_computed():
    gold = [3, 7]
    # First match at rank 1
    assert compute_mrr([3, 1, 2], gold) == 1.0
    # First match at rank 2
    assert compute_mrr([1, 3, 2], gold) == 0.5
    # First match at rank 4 (1/4 = 0.25)
    assert compute_mrr([1, 2, 4, 7], gold) == 0.25
    # No match
    assert compute_mrr([1, 2, 4], gold) == 0.0


def test_ndcg_at_k_hand_computed():
    gold = [2, 4]
    # retrieved = [2, 1, 4] (ranks 1 and 3 are relevant)
    # DCG@3 = 1/log2(2) + 0/log2(3) + 1/log2(4) = 1.0 + 0 + 0.5 = 1.5
    # IDCG@3 = 1/log2(2) + 1/log2(3) = 1.0 + 0.63092975 = 1.63092975
    # nDCG@3 = 1.5 / 1.63092975 ~ 0.9197
    ndcg = compute_ndcg_at_k([2, 1, 4], gold, k=3)
    assert abs(ndcg - 0.9197) < 0.005

    # Perfect retrieval: [2, 4, 1]
    assert compute_ndcg_at_k([2, 4, 1], gold, k=3) == 1.0
    # Zero hits
    assert compute_ndcg_at_k([1, 3, 5], gold, k=3) == 0.0


def test_numeric_matching():
    # Within 2% tolerance
    assert match_numeric(101.5, 100.0, tolerance=0.02) is True
    # Exceeds 2% tolerance (103 vs 100 is 3%)
    assert match_numeric(103.0, 100.0, tolerance=0.02) is False
    # Exact zero
    assert match_numeric(0.0, 0.0) is True
    assert match_numeric(None, 100.0) is False
    assert match_numeric(None, None) is True


def test_text_matching():
    actual = "ACME Technology Corp reports strong operating cash flow of $26,800 million for Q3."
    assert match_text(actual, "operating cash flow") is True
    assert match_text(actual, "cash flow of $26,800 million") is True
    assert match_text(actual, "completely unrelated quantum recipe") is False


def test_citation_evaluation():
    gold = [1, 2]
    # Both cited pages are valid, but only 1 of 2 gold pages cited
    res = evaluate_citations([1], gold)
    assert res["citation_precision"] == 1.0
    assert res["citation_recall"] == 0.5
    assert res["all_citations_valid"] == 1.0

    # 1 valid, 1 invalid cited page
    res2 = evaluate_citations([1, 4], gold)
    assert res2["citation_precision"] == 0.5
    assert res2["citation_recall"] == 0.5
    assert res2["all_citations_valid"] == 0.0


def test_abstention_metrics():
    records = [
        {"answerable": False, "abstained": True},   # TP
        {"answerable": False, "abstained": False},  # FN
        {"answerable": True, "abstained": True},    # FP
        {"answerable": True, "abstained": False},   # TN
        {"answerable": True, "abstained": False},   # TN
    ]
    # TP=1, FP=1, FN=1, TN=2
    # Precision = 1 / 2 = 0.5
    # Recall = 1 / 2 = 0.5
    # F1 = 0.5
    # False abstain rate = FP / (FP + TN) = 1 / 3 ~ 0.3333
    stats = compute_abstention_metrics(records)
    assert stats["abstention_precision"] == 0.5
    assert stats["abstention_recall"] == 0.5
    assert stats["abstention_f1"] == 0.5
    assert abs(stats["false_abstain_rate"] - 0.3333) < 0.005


def test_hallucination_detection():
    # Confident answer that is wrong -> Hallucination
    assert is_hallucination(
        answer="$999 Million",
        correct=False,
        abstained=False,
        confidence=0.95,
        answerable=True
    ) is True

    # Correct confident answer -> Not hallucination
    assert is_hallucination(
        answer="$100 Million",
        correct=True,
        abstained=False,
        confidence=0.95,
        answerable=True
    ) is False

    # Abstained safely -> Not hallucination
    assert is_hallucination(
        answer="I could not find direct verifiable evidence",
        correct=True,
        abstained=True,
        confidence=0.0,
        answerable=False
    ) is False


def test_bootstrap_ci():
    vals = [1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0]
    low, high = compute_bootstrap_ci(vals, n_bootstraps=500, seed=42)
    assert 0.5 <= low <= high <= 1.0
