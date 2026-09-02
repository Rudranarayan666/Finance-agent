from typing import Dict, Any, List
from backend.app.agents.state import AgentState
from backend.app.core.llm import LLMService
from backend.app.engine.arithmetic import compute_gross_margin, compute_yoy_growth, parse_numeric_financial


FINANCIAL_EXTRACTION_PROMPT = """
You are an expert Financial Extraction Agent.
Extract the following core financial metrics from the provided document text for the CURRENT reported quarter/period:

1. total_revenue: Total revenue / revenue from operations / net sales for the current period
2. gross_margin_pct: Stated Gross Margin % OR Stated Gross Profit / Raw materials vs revenue
3. net_income: Net income / profit after tax / profit for the year
4. operating_cash_flow: Net cash generated from (used in) operating activities
5. yoy_revenue_growth_pct: Year-over-year revenue growth %
6. headcount: Total employee count (if disclosed, otherwise null)

CRITICAL RULES:
- For EVERY metric found, you MUST provide:
  - "page": The exact page number (integer) where this number is found in the text (look at "--- PAGE X ---" headers).
  - "quote": An EXACT, VERBATIM sentence or table row from that page (max 40 words) that contains the number.
- If a metric is NOT mentioned or disclosed in the document, set "value": null, "confidence": "not_disclosed", "source": {"page": null, "quote": null}.
- NEVER guess, estimate, or hallucinate a number.

Document Text:
__DOCUMENT_CONTEXT__

Return valid JSON conforming to:
{
  "metrics": [
    {
      "field": "total_revenue",
      "value": "string or null",
      "unit": "string",
      "confidence": "high | medium | low | not_disclosed",
      "source": {
        "page": 1,
        "quote": "verbatim quote from text or null"
      },
      "extraction_method": "direct_statement | computed | not_found",
      "gross_profit_raw": "optional string if gross margin needs computation",
      "prior_year_revenue_raw": "optional string for YoY calculation"
    }
  ]
}
"""


def financial_extraction_node(state: AgentState) -> Dict[str, Any]:
    """
    Extracts financial statement metrics across relevant chunks.
    Prioritizes top scored statement pages first for large filings.
    """
    pages_dict = state["pages_dict"]
    section_map = state.get("section_map", {})
    
    # Priority statement pages scored highest by section locator
    primary_statements = section_map.get("primary_statements", [])
    
    other_priority = list(set(
        section_map.get("financial_statements", []) +
        section_map.get("income_statement", []) +
        section_map.get("cash_flows", []) +
        section_map.get("mda", [])
    ))

    # Assemble candidate pages: Primary statement pages first, then other prioritized pages
    ordered_pages = []
    for p in primary_statements:
        if p not in ordered_pages and p in pages_dict:
            ordered_pages.append(p)

    for p in sorted(other_priority):
        if p not in ordered_pages and p in pages_dict:
            ordered_pages.append(p)

    # Fallback to early pages if nothing detected
    if not ordered_pages:
        ordered_pages = [p for p in range(1, min(15, len(pages_dict) + 1)) if p in pages_dict]

    context_chunks = []
    total_len = 0
    # Add top ordered pages up to 65k context length
    for page_num in ordered_pages:
        chunk = f"--- PAGE {page_num} ---\n{pages_dict[page_num]}"
        if total_len + len(chunk) > 65000:
            break
        context_chunks.append(chunk)
        total_len += len(chunk)

    full_context = "\n\n".join(context_chunks)

    prompt = FINANCIAL_EXTRACTION_PROMPT.replace("__DOCUMENT_CONTEXT__", full_context)
    result = LLMService.invoke_structured(
        prompt=prompt,
        system_prompt="You are a strict, citation-accurate financial data extraction system.",
        model_tier="strong"
    )

    extracted_metrics = result.get("metrics", [])
    
    # Perform deterministic calculations where needed
    rev_metric = next((m for m in extracted_metrics if m.get("field") == "total_revenue"), None)
    gm_metric = next((m for m in extracted_metrics if m.get("field") == "gross_margin_pct"), None)
    
    if rev_metric and gm_metric and (gm_metric.get("value") is None or gm_metric.get("extraction_method") == "computed"):
        gp_str = gm_metric.get("gross_profit_raw")
        rev_num = parse_numeric_financial(rev_metric.get("value"))
        gp_num = parse_numeric_financial(gp_str)
        if rev_num and gp_num:
            calculated_gm, formula = compute_gross_margin(rev_num, gp_num)
            if calculated_gm:
                gm_metric["value"] = f"{calculated_gm}%"
                gm_metric["extraction_method"] = "computed"
                gm_metric["calculation_details"] = formula
                gm_metric["confidence"] = "high"

    for m in extracted_metrics:
        m["section_type"] = "financial_statements"

    return {
        "financial_candidates": extracted_metrics
    }
