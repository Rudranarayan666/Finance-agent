"""
Interactive terminal tool for human verification of golden dataset items.
Usage:
  python evals/golden/verify_cli.py [--dataset evals/golden/v1.jsonl] [--category numeric_lookup]
Commands:
  [y] Verify and approve
  [n] Mark rejected/unverified
  [e] Edit answer/quote/pages
  [s] Skip to next
  [q] Save and quit
"""
import os
import sys
import json
import argparse
from typing import List, Optional

# Ensure repository root in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from evals.golden.schema import GoldenItem
import fitz

DATASET_PATH = "evals/golden/v1.jsonl"
PDF_DIR = "eval/data"
UPLOADS_DIR = "uploads"


def find_pdf_path(doc_id: str) -> Optional[str]:
    candidates = [
        os.path.join(PDF_DIR, doc_id),
        os.path.join(UPLOADS_DIR, doc_id)
    ]
    # Check uploads directory for exact or prefixed match
    if os.path.exists(UPLOADS_DIR):
        for f in os.listdir(UPLOADS_DIR):
            if f == doc_id or f.endswith(doc_id):
                candidates.append(os.path.join(UPLOADS_DIR, f))

    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def get_source_page_snippet(doc_id: str, pages: List[int], quote: Optional[str]) -> str:
    pdf_path = find_pdf_path(doc_id)
    if not pdf_path or not pages:
        return "[No source PDF found or no gold pages specified]"

    try:
        doc = fitz.open(pdf_path)
        snippets = []
        for p_num in pages:
            if 1 <= p_num <= len(doc):
                page_text = doc[p_num - 1].get_text("text").strip()
                if quote and quote in page_text:
                    idx = page_text.find(quote)
                    start = max(0, idx - 100)
                    end = min(len(page_text), idx + len(quote) + 100)
                    snippet = page_text[start:end].replace("\n", " ")
                    snippets.append(f"Page {p_num}: ...{snippet}...")
                else:
                    preview = page_text[:250].replace("\n", " ")
                    snippets.append(f"Page {p_num}: {preview}...")
        doc.close()
        return "\n".join(snippets)
    except Exception as ex:
        return f"[PDF read error: {ex}]"


def run_verify_cli(dataset_path: str, category_filter: Optional[str] = None):
    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}")
        return

    items: List[GoldenItem] = []
    with open(dataset_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                items.append(GoldenItem.model_validate_json(line))

    print("=" * 80)
    print("FINANCE AGENT — GOLDEN DATASET VERIFICATION CLI")
    print("=" * 80)
    print(f"Total items loaded: {len(items)}")
    verified_count = sum(1 for it in items if it.status == "verified")
    print(f"Currently verified: {verified_count}/{len(items)}\n")

    dirty = False

    for idx, item in enumerate(items):
        if category_filter and item.category != category_filter:
            continue

        print("-" * 80)
        print(f"[{idx+1}/{len(items)}] ID: {item.id} | Split: {item.split.upper()} | Status: {item.status.upper()}")
        print(f"Document : {item.doc_id}")
        print(f"Category : {item.category} (Difficulty: {item.difficulty})")
        print(f"Question : {item.question}")
        print(f"Answerable: {item.answerable}")
        if item.expected_value is not None:
            print(f"Expected : {item.expected_value} {item.unit or ''} ({item.period or 'N/A'})")
        if item.expected_text:
            print(f"Exp Text : {item.expected_text}")
        print(f"Gold Page: {item.gold_pages}")
        if item.gold_quote:
            print(f"Quote    : \"{item.gold_quote}\"")

        # Source snippet
        snippet = get_source_page_snippet(item.doc_id, item.gold_pages, item.gold_quote)
        print(f"\nSource Snippet:\n  {snippet}")
        print("-" * 80)

        while True:
            choice = input("Action [y: approve | n: reject | e: edit | s: skip | q: quit]: ").strip().lower()
            if choice == "y":
                item.status = "verified"
                dirty = True
                print("-> Approved as VERIFIED.")
                break
            elif choice == "n":
                item.status = "unverified"
                dirty = True
                print("-> Marked as UNVERIFIED.")
                break
            elif choice == "s":
                print("-> Skipped.")
                break
            elif choice == "e":
                print("\nEdit Item fields (press Enter to keep current):")
                new_q = input(f"Question [{item.question}]: ").strip()
                if new_q:
                    item.question = new_q

                new_val = input(f"Expected Value [{item.expected_value}]: ").strip()
                if new_val:
                    try:
                        item.expected_value = float(new_val)
                    except ValueError:
                        print("Invalid float, kept existing.")

                new_unit = input(f"Unit [{item.unit}]: ").strip()
                if new_unit:
                    item.unit = new_unit

                new_pages = input(f"Gold Pages (comma-separated) [{item.gold_pages}]: ").strip()
                if new_pages:
                    try:
                        item.gold_pages = [int(p.strip()) for p in new_pages.split(",")]
                    except ValueError:
                        print("Invalid page list, kept existing.")

                new_quote = input(f"Gold Quote [{item.gold_quote}]: ").strip()
                if new_quote:
                    item.gold_quote = new_quote

                item.status = "verified"
                dirty = True
                print("-> Updated and marked VERIFIED.")
                break
            elif choice == "q":
                if dirty:
                    _save(dataset_path, items)
                print("Exiting verification.")
                return
            else:
                print("Invalid input. Type y, n, e, s, or q.")

    if dirty:
        _save(dataset_path, items)


def _save(dataset_path: str, items: List[GoldenItem]):
    with open(dataset_path, "w", encoding="utf-8") as f:
        for it in items:
            f.write(it.model_dump_json() + "\n")
    print(f"Saved changes to {dataset_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Golden Dataset Verification CLI")
    parser.add_argument("--dataset", default=DATASET_PATH, help="Path to jsonl dataset")
    parser.add_argument("--category", default=None, help="Filter by specific category")
    parser.add_argument("--verify-all", action="store_true", help="Non-interactive: mark all items verified (for automated testing)")
    args = parser.parse_args()

    if args.verify_all:
        items = []
        with open(args.dataset, "r", encoding="utf-8") as f:
            for l in f:
                if l.strip():
                    it = GoldenItem.model_validate_json(l)
                    it.status = "verified"
                    items.append(it)
        _save(args.dataset, items)
        print(f"Batch verified {len(items)} items in {args.dataset}.")
    else:
        run_verify_cli(args.dataset, args.category)
