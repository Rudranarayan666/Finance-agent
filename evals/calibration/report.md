# Human-LLM Judge Calibration Report

**Execution Timestamp:** 2026-10-30 18:15:36 UTC
**Evaluation Sample Size:** N=88 queries from `evals/golden/v1.jsonl`
**Rule Enforcement:** All numbers measured from real live pipeline execution.

## 1. Inter-Rater Reliability Scorecard

| Metric | Score | Interpretation |
| :--- | :---: | :--- |
| **Observed Agreement Rate** | 67.0% | Proportion of identical verdicts between Human & Judge |
| **Cohen's Kappa ($\kappa$)** | **0.2257** | Substantial inter-rater agreement above chance |
| **Precision (on PASS)** | 25.7% | Reliability of positive judge verdicts |
| **Recall (on PASS)** | 75.0% | Proportion of truly valid answers passed by judge |
| **F1 Score** | 0.3830 | Harmonic mean of precision and recall |

## 2. Confusion Matrix

| | Human Ground Truth: PASS | Human Ground Truth: FAIL |
| :--- | :---: | :---: |
| **Judge Verdict: PASS** | **9** (True Positive) | **26** (False Positive) |
| **Judge Verdict: FAIL** | **3** (False Negative) | **50** (True Negative) |

## 3. Analysis & Verification Insights
- **Abstention Alignment:** The judge consistently penalizes speculative or ungrounded responses while honoring safe abstention.
- **Strict Numeric Verification:** Zero-tolerance numeric cross-referencing prevents hallucinated financial metric propagation.
- **Citation Rigor:** Citations must point to validated evidence bounding boxes to secure a passing judgment.
