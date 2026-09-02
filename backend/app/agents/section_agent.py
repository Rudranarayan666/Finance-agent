from typing import Dict, Any, List
import re
from backend.app.agents.state import AgentState
from backend.app.core.llm import LLMService


SECTION_KEYWORDS = {
    "financial_statements": [
        "statement of profit and loss", "revenue from operations", "profit after tax",
        "consolidated statements of operations", "consolidated statements of income",
        "condensed consolidated balance sheets", "condensed consolidated statements of cash flows",
        "statement of earnings", "consolidated financial statements"
    ],
    "income_statement": [
        "statement of profit and loss", "profit after tax", "revenue from operations",
        "consolidated statements of operations", "statement of operations",
        "statements of income", "results of operations"
    ],
    "balance_sheet": [
        "consolidated balance sheets", "balance sheet", "condensed balance sheets"
    ],
    "cash_flows": [
        "cash flow from operating activities", "net cash flow generated from operating activities",
        "statements of cash flows", "condensed statements of cash flows", "cash flow statement"
    ],
    "mda": [
        "management's discussion and analysis", "item 2. management's discussion",
        "item 7. management's discussion", "financial condition and results of operations",
        "management discussion and analysis"
    ],
    "risk_factors": [
        "item 1a. risk factors", "item 1a", "risk factors", "key risks",
        "risk management", "key audit matter"
    ],
    "guidance": [
        "financial outlook", "business outlook", "guidance",
        "forward-looking guidance", "fiscal outlook", "outlook for the year"
    ]
}


def section_locator_node(state: AgentState) -> Dict[str, Any]:
    """
    Classifies pages and chunks into filing sections.
    Intelligently scores and prioritizes primary statement pages for 100-250+ page filings.
    """
    pages_dict = state["pages_dict"]
    section_map: Dict[str, List[int]] = {k: [] for k in SECTION_KEYWORDS.keys()}
    page_scores: Dict[int, int] = {}
    
    # 1. Fast heuristic scan across all pages
    for page_num, text in pages_dict.items():
        text_lower = text.lower()
        score = 0
        for sec_name, keywords in SECTION_KEYWORDS.items():
            for kw in keywords:
                if kw in text_lower:
                    if page_num not in section_map[sec_name]:
                        section_map[sec_name].append(page_num)
                    # Heavier score for primary statement markers
                    if kw in ["statement of profit and loss", "revenue from operations", "profit after tax", "consolidated statements of operations"]:
                        score += 15
                    elif kw in ["cash flow from operating activities", "net cash flow generated from operating activities"]:
                        score += 12
                    else:
                        score += 3
        if score > 0:
            page_scores[page_num] = score

    # Store sorted priority statement pages in section_map["primary_statements"]
    sorted_statement_pages = sorted(page_scores.keys(), key=lambda p: page_scores[p], reverse=True)
    section_map["primary_statements"] = sorted_statement_pages[:20]

    # 2. Extract Document Metadata (Company name, fiscal period) from cover pages
    cover_text = ""
    for p in range(1, min(5, len(pages_dict) + 1)):
        cover_text += f"\n--- PAGE {p} ---\n" + pages_dict.get(p, "")[:1500]

    # Quick heuristic check for company name
    comp_match = re.search(r'(?:to\s+the\s+members\s+of|annual\s+general\s+meeting\s+of|notice\s+is\s+hereby\s+given\s+that.*of)\s+([A-Z0-9\s.,&]+?(?:LIMITED|LTD|INC|CORP|CORPORATION))', cover_text, re.I)
    if not comp_match:
        comp_match = re.search(r'([A-Z\s]{4,40}(?:LIMITED|LTD|INC|CORP|CORPORATION))', cover_text)

    found_company = comp_match.group(1).strip() if comp_match else None

    # Fiscal period search
    period_match = re.search(r'(?:year\s+ended|for\s+the\s+year\s+ended|ended)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+20\d{2}|[A-Za-z]+\s+[0-9]{1,2},\s+20\d{2})', cover_text, re.I)
    if not period_match:
        period_match = re.search(r'(Q[1-4]\s*(?:FY)?\s*20\d{2}|FY\s*20\d{2}(?:-\d{2,4})?)', cover_text, re.I)
    found_period = period_match.group(0).strip() if period_match else None

    company_name = found_company or state.get("company_name") or "Reporting Entity"
    fiscal_period = found_period or state.get("fiscal_period") or "FY 2025-26"
    filing_type = "Annual Report" if len(pages_dict) > 40 else "10-Q"

    return {
        "section_map": section_map,
        "company_name": company_name,
        "fiscal_period": fiscal_period,
        "filing_type": filing_type
    }
