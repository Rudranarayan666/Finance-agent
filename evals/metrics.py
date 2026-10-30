"""
Evaluation metrics for RAG retrieval, synthesis, citation validation, and abstention.
Pure, side-effect-free functions suitable for unit testing and CI pipelines.
"""
import math
import re
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np


def compute_recall_at_k(retrieved_pages: List[int], gold_pages: List[int], k: int) -> float:
    """
    Computes Recall@k: fraction of gold pages retrieved within top-k predictions.
    If gold_pages is empty, returns 1.0 if answerable=False or 0.0 otherwise.
    """
    if not gold_pages:
        return 1.0
    if k <= 0:
        return 0.0
    top_k = set(retrieved_pages[:k])
    gold_set = set(gold_pages)
    hits = len(top_k.intersection(gold_set))
    return float(hits / len(gold_set))


def compute_mrr(retrieved_pages: List[int], gold_pages: List[int]) -> float:
    """
    Computes Mean Reciprocal Rank (MRR) for the first hit among gold pages.
    Returns 1 / rank (1-indexed) of the first matching gold page, or 0.0 if not found.
    """
    if not gold_pages or not retrieved_pages:
        return 0.0
    gold_set = set(gold_pages)
    for rank, p in enumerate(retrieved_pages, start=1):
        if p in gold_set:
            return float(1.0 / rank)
    return 0.0


def compute_ndcg_at_k(retrieved_pages: List[int], gold_pages: List[int], k: int) -> float:
    """
    Computes Normalized Discounted Cumulative Gain (nDCG@k) with binary relevance.
    """
    if not gold_pages or k <= 0:
        return 0.0
    gold_set = set(gold_pages)
    top_k = retrieved_pages[:k]

    # DCG calculation
    dcg = 0.0
    for i, p in enumerate(top_k):
        rel = 1.0 if p in gold_set else 0.0
        dcg += rel / math.log2(i + 2)  # i+2 for 1-based log2(rank + 1)

    # IDCG calculation (ideal ordering of hits)
    idcg = 0.0
    ideal_hits = min(len(gold_set), k)
    for i in range(ideal_hits):
        idcg += 1.0 / math.log2(i + 2)

    if idcg == 0.0:
        return 0.0
    return float(dcg / idcg)


def match_numeric(
    actual_val: Optional[float],
    expected_val: Optional[float],
    tolerance: float = 0.02
) -> bool:
    """
    Compares numeric values with relative tolerance.
    Handles exact zeros and floating point discrepancies.
    """
    if expected_val is None:
        return actual_val is None
    if actual_val is None:
        return False

    diff = abs(actual_val - expected_val)
    if abs(expected_val) < 1e-6:
        return diff < 1e-4
    return (diff / abs(expected_val)) <= tolerance


def match_text(
    actual_text: str,
    expected_text: Optional[str],
    fuzzy_threshold: float = 0.70
) -> bool:
    """
    Checks if expected text exists in actual answer via substring or token overlap.
    """
    if not expected_text:
        return True
    if not actual_text:
        return False

    act_low = actual_text.lower().strip()
    exp_low = expected_text.lower().strip()

    # Exact substring
    if exp_low in act_low:
        return True

    # Token overlap check
    exp_tokens = set(re.findall(r'\b[a-zA-Z0-9$%₹.,-]+\b', exp_low))
    if not exp_tokens:
        return False
    act_tokens = set(re.findall(r'\b[a-zA-Z0-9$%₹.,-]+\b', act_low))
    overlap = len(exp_tokens.intersection(act_tokens)) / len(exp_tokens)
    return overlap >= fuzzy_threshold


def evaluate_citations(
    cited_pages: List[int],
    gold_pages: List[int]
) -> Dict[str, float]:
    """
    Evaluates citation accuracy against gold ground-truth pages.
    Returns:
      - precision: fraction of cited pages that are in gold_pages
      - recall: fraction of gold pages that were cited
      - all_citations_valid: 1.0 if precision == 1.0 and len(cited_pages) > 0, else 0.0
    """
    if not cited_pages:
        return {
            "citation_precision": 0.0,
            "citation_recall": 1.0 if not gold_pages else 0.0,
            "all_citations_valid": 0.0
        }

    gold_set = set(gold_pages)
    cited_set = set(cited_pages)

    hits = len(cited_set.intersection(gold_set))
    precision = hits / len(cited_set)
    recall = hits / len(gold_set) if gold_set else 1.0
    all_valid = 1.0 if (precision == 1.0 and len(cited_set) > 0) else 0.0

    return {
        "citation_precision": round(float(precision), 4),
        "citation_recall": round(float(recall), 4),
        "all_citations_valid": float(all_valid)
    }


def compute_abstention_metrics(eval_records: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Computes precision, recall, and F1 on abstention over unanswerable items (answerable=False),
    and false-abstain rate on answerable items (answerable=True).
    """
    tp = 0  # correctly abstained when unanswerable
    fp = 0  # abstained when answerable
    fn = 0  # answered when unanswerable
    tn = 0  # answered when answerable

    for r in eval_records:
        answerable = r.get("answerable", True)
        abstained = r.get("abstained", False)

        if not answerable and abstained:
            tp += 1
        elif answerable and abstained:
            fp += 1
        elif not answerable and not abstained:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    false_abstain_rate = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        "abstention_precision": round(float(precision), 4),
        "abstention_recall": round(float(recall), 4),
        "abstention_f1": round(float(f1), 4),
        "false_abstain_rate": round(float(false_abstain_rate), 4),
        "unanswerable_count": tp + fn,
        "answerable_count": tn + fp
    }


def is_hallucination(
    answer: str,
    correct: bool,
    abstained: bool,
    confidence: float,
    answerable: bool
) -> bool:
    """
    Hallucination definition:
    1. For answerable items: Model gave a confident answer (confidence >= 0.80 and not abstained), but answer is incorrect.
    2. For unanswerable items: Model answered with confidence >= 0.80 instead of abstaining.
    """
    if abstained:
        return False
    if not answerable:
        return confidence >= 0.70
    return (not correct) and (confidence >= 0.80)


def compute_bootstrap_ci(
    values: List[float],
    n_bootstraps: int = 1000,
    alpha: float = 0.05,
    seed: int = 42
) -> Tuple[float, float]:
    """
    Computes non-parametric bootstrap confidence interval (95% CI by default).
    Returns (lower_bound, upper_bound).
    """
    if not values:
        return 0.0, 0.0
    if len(values) == 1:
        return float(values[0]), float(values[0])

    rng = np.random.RandomState(seed)
    arr = np.array(values, dtype=float)
    n = len(arr)
    boot_means = np.empty(n_bootstraps)

    for i in range(n_bootstraps):
        sample = rng.choice(arr, size=n, replace=True)
        boot_means[i] = sample.mean()

    lower = float(np.percentile(boot_means, (alpha / 2.0) * 100))
    upper = float(np.percentile(boot_means, (1.0 - alpha / 2.0) * 100))
    return round(lower, 4), round(upper, 4)


def aggregate_dataset_metrics(eval_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregates full evaluation metrics across queries:
    - Retrieval: Recall@1,3,5,10, MRR, nDCG@5
    - Accuracy: numeric/text accuracy, citation precision/recall/all_valid
    - Abstention: precision, recall, F1, false abstain rate
    - Hallucination rate
    - Latency p50, p95
    - Per-category breakdown + bootstrap 95% CIs
    """
    if not eval_records:
        return {}

    n = len(eval_records)
    recalls_1 = [r.get("recall_at_1", 0.0) for r in eval_records]
    recalls_3 = [r.get("recall_at_3", 0.0) for r in eval_records]
    recalls_5 = [r.get("recall_at_5", 0.0) for r in eval_records]
    recalls_10 = [r.get("recall_at_10", 0.0) for r in eval_records]
    mrrs = [r.get("mrr", 0.0) for r in eval_records]
    ndcgs = [r.get("ndcg_at_5", 0.0) for r in eval_records]
    accuracies = [1.0 if r.get("is_correct") else 0.0 for r in eval_records]
    citation_precisions = [r.get("citation_precision", 0.0) for r in eval_records]
    citation_recalls = [r.get("citation_recall", 0.0) for r in eval_records]
    all_citations_valid = [r.get("all_citations_valid", 0.0) for r in eval_records]
    hallucinations = [1.0 if r.get("is_hallucination") else 0.0 for r in eval_records]
    latencies = [r.get("latency_ms", 0.0) for r in eval_records]

    abstention_stats = compute_abstention_metrics(eval_records)

    # Per-category metrics
    categories = sorted(list({r.get("category", "unknown") for r in eval_records}))
    category_breakdown = {}
    for cat in categories:
        cat_records = [r for r in eval_records if r.get("category") == cat]
        cat_acc = [1.0 if r.get("is_correct") else 0.0 for r in cat_records]
        cat_rec5 = [r.get("recall_at_5", 0.0) for r in cat_records]
        category_breakdown[cat] = {
            "count": len(cat_records),
            "accuracy": round(float(np.mean(cat_acc)), 4) if cat_acc else 0.0,
            "recall_at_5": round(float(np.mean(cat_rec5)), 4) if cat_rec5 else 0.0,
        }

    acc_ci = compute_bootstrap_ci(accuracies)
    rec5_ci = compute_bootstrap_ci(recalls_5)

    return {
        "total_queries": n,
        "retrieval": {
            "recall_at_1": round(float(np.mean(recalls_1)), 4),
            "recall_at_3": round(float(np.mean(recalls_3)), 4),
            "recall_at_5": round(float(np.mean(recalls_5)), 4),
            "recall_at_5_ci95": acc_ci,
            "recall_at_10": round(float(np.mean(recalls_10)), 4),
            "mrr": round(float(np.mean(mrrs)), 4),
            "ndcg_at_5": round(float(np.mean(ndcgs)), 4)
        },
        "answer": {
            "accuracy": round(float(np.mean(accuracies)), 4),
            "accuracy_ci95": acc_ci,
            "hallucination_rate": round(float(np.mean(hallucinations)), 4)
        },
        "citations": {
            "precision": round(float(np.mean(citation_precisions)), 4),
            "recall": round(float(np.mean(citation_recalls)), 4),
            "all_citations_valid_rate": round(float(np.mean(all_citations_valid)), 4)
        },
        "abstention": abstention_stats,
        "latency": {
            "p50_ms": round(float(np.percentile(latencies, 50)), 2) if latencies else 0.0,
            "p95_ms": round(float(np.percentile(latencies, 95)), 2) if latencies else 0.0,
            "mean_ms": round(float(np.mean(latencies)), 2) if latencies else 0.0
        },
        "category_breakdown": category_breakdown
    }
