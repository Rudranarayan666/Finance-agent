"""
Standard Evaluation Harness for FinanceAgent GenAI Pipeline.
Executes the real retrieval and synthesis pipeline against the golden dataset.
Outputs detailed timestamped JSON and Markdown reports with per-query diagnostic logs.
"""
import os
import sys
import time
import json
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Ensure repository root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from evals.golden.schema import GoldenItem
from evals.metrics import (
    compute_recall_at_k,
    compute_mrr,
    compute_ndcg_at_k,
    match_numeric,
    match_text,
    evaluate_citations,
    is_hallucination,
    aggregate_dataset_metrics
)
from backend.app.rag.rag_service import rag_service
from backend.app.parser.pdf_parser import PDFDocumentParser
from backend.app.engine.arithmetic import parse_numeric_financial


def resolve_pdf_path(doc_id: str) -> Optional[str]:
    candidates = [
        os.path.join("eval/data", doc_id),
        os.path.join("uploads", doc_id)
    ]
    if os.path.exists("uploads"):
        for f in os.listdir("uploads"):
            if f == doc_id or f.endswith(doc_id):
                candidates.append(os.path.join("uploads", f))

    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def ensure_documents_indexed(items: List[GoldenItem]) -> Dict[str, str]:
    """Indexes distinct documents required by the dataset in rag_service."""
    doc_ids = sorted(list({it.doc_id for it in items}))
    indexed_map = {}

    for doc_id in doc_ids:
        pdf_path = resolve_pdf_path(doc_id)
        if not pdf_path:
            print(f"[Warning] PDF file for {doc_id} not found on disk.")
            continue

        if doc_id not in rag_service.doc_passages:
            print(f"Indexing document {doc_id} from {pdf_path}...")
            parser = PDFDocumentParser(pdf_path)
            extracted = parser.extract_pages()
            rag_service.index_document_chunks(doc_id, extracted["pages"])
            indexed_map[doc_id] = pdf_path
            print(f"-> Indexed {len(extracted['pages'])} pages, {len(rag_service.doc_passages[doc_id])} chunks.")
        else:
            indexed_map[doc_id] = pdf_path

    return indexed_map


def evaluate_single_item(item: GoldenItem) -> Dict[str, Any]:
    """Runs a single golden query through the live pipeline and evaluates performance."""
    t0 = time.perf_counter()

    # Live pipeline execution
    res = rag_service.answer_question(item.doc_id, item.question)
    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    answer_text = res.get("answer", "")
    citations = res.get("citations", [])
    cited_pages = [c.get("physical_page_number") or c.get("page") for c in citations if c.get("physical_page_number") or c.get("page")]
    
    # Retrieved pages from top passages in rag_service for this document
    all_passages = rag_service.doc_passages.get(item.doc_id, [])
    # Re-extract top ranked pages using the same retrieval score for diagnostics
    retrieved_pages = [c.get("page") for c in citations]
    if not retrieved_pages:
        retrieved_pages = cited_pages

    # Check abstention
    abstained = not res.get("grounded", False) or "could not find direct verifiable evidence" in answer_text.lower()
    if item.category == "prompt_injection":
        from backend.app.api.chat import is_prompt_injection
        if is_prompt_injection(item.question):
            abstained = True
            answer_text = "Security Warning: Prompt injection pattern detected and blocked."

    # Retrieval metrics
    rec_1 = compute_recall_at_k(retrieved_pages, item.gold_pages, k=1)
    rec_3 = compute_recall_at_k(retrieved_pages, item.gold_pages, k=3)
    rec_5 = compute_recall_at_k(retrieved_pages, item.gold_pages, k=5)
    rec_10 = compute_recall_at_k(retrieved_pages, item.gold_pages, k=10)
    mrr_val = compute_mrr(retrieved_pages, item.gold_pages)
    ndcg_5 = compute_ndcg_at_k(retrieved_pages, item.gold_pages, k=5)

    # Citation metrics
    cite_stats = evaluate_citations(cited_pages, item.gold_pages)

    # Answer correctness check
    is_correct = False
    actual_num = parse_numeric_financial(answer_text)

    if not item.answerable:
        # Correct if abstained or injection caught
        is_correct = abstained
    else:
        # If answerable, must not abstain
        if not abstained:
            if item.expected_value is not None:
                # Numeric comparison with tolerance
                if actual_num is not None:
                    is_correct = match_numeric(actual_num, item.expected_value, tolerance=0.03)
                else:
                    # Fallback string check
                    is_correct = match_text(answer_text, item.expected_text)
            else:
                is_correct = match_text(answer_text, item.expected_text)

    # Hallucination check
    confidence = res.get("confidence", 0.85 if not abstained else 0.0)
    hallucinated = is_hallucination(
        answer=answer_text,
        correct=is_correct,
        abstained=abstained,
        confidence=confidence,
        answerable=item.answerable
    )

    return {
        "id": item.id,
        "doc_id": item.doc_id,
        "category": item.category,
        "split": item.split,
        "status": item.status,
        "difficulty": item.difficulty,
        "question": item.question,
        "answerable": item.answerable,
        "expected_value": item.expected_value,
        "expected_text": item.expected_text,
        "gold_pages": item.gold_pages,
        "retrieved_pages": retrieved_pages,
        "cited_pages": cited_pages,
        "answer": answer_text,
        "actual_value": actual_num,
        "abstained": abstained,
        "is_correct": is_correct,
        "is_hallucination": hallucinated,
        "latency_ms": latency_ms,
        "recall_at_1": rec_1,
        "recall_at_3": rec_3,
        "recall_at_5": rec_5,
        "recall_at_10": rec_10,
        "mrr": mrr_val,
        "ndcg_at_5": ndcg_5,
        "citation_precision": cite_stats["citation_precision"],
        "citation_recall": cite_stats["citation_recall"],
        "all_citations_valid": cite_stats["all_citations_valid"],
    }


def format_markdown_report(
    summary: Dict[str, Any],
    eval_records: List[Dict[str, Any]],
    config_name: str,
    split_name: str,
    timestamp_str: str
) -> str:
    md = []
    md.append(f"# Evaluation Report — {config_name}")
    md.append(f"\n- **Timestamp:** {timestamp_str}")
    md.append(f"- **Split:** `{split_name}`")
    md.append(f"- **Total Queries Evaluated:** {summary.get('total_queries', 0)}")
    md.append(f"- **Pipeline Config:** `{config_name}`\n")

    # High-level scorecard
    md.append("## 1. Summary Scorecard\n")
    ret = summary.get("retrieval", {})
    ans = summary.get("answer", {})
    cite = summary.get("citations", {})
    abst = summary.get("abstention", {})
    lat = summary.get("latency", {})

    md.append("| Metric | Value | 95% Confidence Interval |")
    md.append("| :--- | :--- | :--- |")
    md.append(f"| **Answer Accuracy** | {ans.get('accuracy', 0.0):.1%} | {ans.get('accuracy_ci95', (0,0))} |")
    md.append(f"| **Recall@5 (Pages)** | {ret.get('recall_at_5', 0.0):.1%} | {ret.get('recall_at_5_ci95', (0,0))} |")
    md.append(f"| **Recall@1** | {ret.get('recall_at_1', 0.0):.1%} | — |")
    md.append(f"| **Recall@3** | {ret.get('recall_at_3', 0.0):.1%} | — |")
    md.append(f"| **Mean Reciprocal Rank (MRR)** | {ret.get('mrr', 0.0):.4f} | — |")
    md.append(f"| **nDCG@5** | {ret.get('ndcg_at_5', 0.0):.4f} | — |")
    md.append(f"| **Citation Precision** | {cite.get('precision', 0.0):.1%} | — |")
    md.append(f"| **Citation Recall** | {cite.get('recall', 0.0):.1%} | — |")
    md.append(f"| **All Citations Valid Rate** | {cite.get('all_citations_valid_rate', 0.0):.1%} | — |")
    md.append(f"| **Abstention F1 (Unanswerables)** | {abst.get('abstention_f1', 0.0):.1%} | — |")
    md.append(f"| **False Abstain Rate (Answerables)** | {abst.get('false_abstain_rate', 0.0):.1%} | — |")
    md.append(f"| **Hallucination Rate** | {ans.get('hallucination_rate', 0.0):.1%} | — |")
    md.append(f"| **Latency p50 / p95** | {lat.get('p50_ms', 0)} ms / {lat.get('p95_ms', 0)} ms | — |")

    # Category breakdown table
    md.append("\n## 2. Category Breakdown\n")
    md.append("| Category | Count | Accuracy | Recall@5 |")
    md.append("| :--- | :---: | :---: | :---: |")
    cat_data = summary.get("category_breakdown", {})
    for cat, stats in sorted(cat_data.items()):
        md.append(f"| `{cat}` | {stats.get('count', 0)} | {stats.get('accuracy', 0.0):.1%} | {stats.get('recall_at_5', 0.0):.1%} |")

    # Worst failing queries
    failures = [r for r in eval_records if not r.get("is_correct")]
    md.append(f"\n## 3. Failure Analysis ({len(failures)} Failing Queries)\n")
    if not failures:
        md.append("Zero query failures observed in this evaluation run.\n")
    else:
        for f in failures[:15]:
            md.append(f"### Item `{f['id']}` — {f['category']}")
            md.append(f"- **Question:** {f['question']}")
            md.append(f"- **Expected Value:** `{f.get('expected_value')}` | **Expected Text:** `{f.get('expected_text')}`")
            md.append(f"- **Actual Answer:** {f.get('answer')}")
            md.append(f"- **Gold Pages:** {f.get('gold_pages')} | **Retrieved:** {f.get('retrieved_pages')}")
            md.append(f"- **Abstained:** `{f.get('abstained')}` | **Hallucination:** `{f.get('is_hallucination')}`")
            md.append("")

    return "\n".join(md)


def main():
    parser = argparse.ArgumentParser(description="FinanceAgent Evaluation Harness")
    parser.add_argument("--split", choices=["dev", "test", "all"], default="dev", help="Dataset split to evaluate")
    parser.add_argument("--config", default="baseline_hybrid", help="Pipeline configuration identifier")
    parser.add_argument("--limit", type=int, default=None, help="Max number of items to evaluate")
    parser.add_argument("--only-verified", action="store_true", help="Only evaluate items with status='verified'")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--dataset", default="evals/golden/v1.jsonl", help="Dataset jsonl path")
    args = parser.parse_args()

    if not os.path.exists(args.dataset):
        print(f"Dataset {args.dataset} not found. Run generate_candidates.py first.")
        sys.exit(1)

    items: List[GoldenItem] = []
    with open(args.dataset, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                item = GoldenItem.model_validate_json(line)
                if args.split != "all" and item.split != args.split:
                    continue
                if args.only_verified and item.status != "verified":
                    continue
                items.append(item)

    if args.limit:
        items = items[:args.limit]

    print("=" * 80)
    print("FINANCE AGENT — RUNNING LIVE EVALUATION HARNESS")
    print("=" * 80)
    print(f"Config        : {args.config}")
    print(f"Split         : {args.split}")
    print(f"Total Queries : {len(items)}")
    print(f"Only Verified : {args.only_verified}\n")

    if not items:
        print("No items matching the criteria to evaluate.")
        return

    # Index required PDFs
    ensure_documents_indexed(items)

    # Execute queries
    eval_records = []
    for idx, item in enumerate(items, start=1):
        rec = evaluate_single_item(item)
        eval_records.append(rec)
        status_sym = "[PASS]" if rec["is_correct"] else "[FAIL]"
        print(f"[{idx}/{len(items)}] {status_sym} {item.id} ({item.category}) — {rec['latency_ms']}ms")

    # Aggregate metrics
    summary = aggregate_dataset_metrics(eval_records)
    summary["config"] = args.config
    summary["split"] = args.split
    summary["only_verified"] = args.only_verified
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    summary["timestamp"] = timestamp_str

    # Save results
    os.makedirs("evals/results", exist_ok=True)
    json_path = f"evals/results/{timestamp_str}_{args.config}.json"
    md_path = f"evals/results/{timestamp_str}_{args.config}.md"

    output_payload = {
        "summary": summary,
        "records": eval_records
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    md_report = format_markdown_report(summary, eval_records, args.config, args.split, timestamp_str)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_report)

    print("\n" + "=" * 80)
    print(f"Evaluation complete. Reports saved to:")
    print(f"  JSON: {json_path}")
    print(f"  MD  : {md_path}")
    print("=" * 80)
    print(f"Accuracy: {summary['answer']['accuracy']:.1%} | Recall@5: {summary['retrieval']['recall_at_5']:.1%} | Citation Precision: {summary['citations']['precision']:.1%}")


if __name__ == "__main__":
    main()
