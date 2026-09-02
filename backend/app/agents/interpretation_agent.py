import json
from typing import Dict, Any, List
from backend.app.agents.state import AgentState
from backend.app.core.llm import LLMService
from backend.app.engine.grounding import DeterministicGroundingValidator


INTERPRETATION_PROMPT = """
You are an Executive Financial Interpretation Agent.
Write a concise, grounded ~300-word executive summary for corporate leadership based EXCLUSIVELY on the validated financial metrics and quotes provided below.

VALIDATED EVIDENCE & METRICS (YOU MAY ONLY REASON FROM THIS):
__METRICS_EVIDENCE__

CRITICAL RULES:
1. NEVER introduce numbers, facts, or claims that are not present in the validated metrics above.
2. For each key claim you state, generate an entry in the "claims" list:
   - "claim": The single-sentence claim you are making.
   - "supporting_metric_fields": List of metric field names used (e.g. ["total_revenue", "net_income"]).
   - "supporting_quote": The EXACT supporting quote from the validated evidence (max 40 words).
   - "source_page": The integer page number from the evidence.
3. If a metric was "not disclosed", acknowledge that it was not reported rather than speculating.

Return valid JSON:
{
  "summary_text": "Executive interpretation of ~300 words...",
  "claims": [
    {
      "claim": "string, one sentence",
      "supporting_metric_fields": ["total_revenue"],
      "supporting_quote": "exact verbatim quote from evidence",
      "source_page": 1
    }
  ]
}
"""


def interpretation_node(state: AgentState) -> Dict[str, Any]:
    metrics = state.get("metrics", [])
    pages_dict = state["pages_dict"]
    
    # Filter only grounded / found metrics to present to the writer
    valid_metrics = [
        m for m in metrics 
        if m.get("value") is not None and m.get("confidence") in ["high", "medium"]
    ]

    evidence_str = json.dumps(metrics, indent=2)
    prompt = INTERPRETATION_PROMPT.replace("__METRICS_EVIDENCE__", evidence_str)

    result = LLMService.invoke_structured(
        prompt=prompt,
        system_prompt="You are an executive financial writer who writes strictly grounded interpretations.",
        model_tier="strong"
    )

    summary_text = result.get("summary_text", "")
    raw_claims = result.get("claims", [])

    # Node 5: Deterministic Claim Grounding Validator
    validator = DeterministicGroundingValidator(pages_dict)
    validated_claims = []

    for c in raw_claims:
        page = c.get("source_page")
        quote = c.get("supporting_quote")
        is_valid, reason, score = validator.validate_quote(page, quote, allow_adjacent=True)
        
        if is_valid:
            validated_claims.append({
                "claim": c.get("claim", ""),
                "supporting_metric_fields": c.get("supporting_metric_fields", []),
                "supporting_quote": quote,
                "source_page": page
            })
        else:
            # If quote wasn't verbatim on that page, find metric quote fallback
            matched_metric = next(
                (m for m in metrics if m.get("source", {}).get("page") == page), 
                None
            )
            if matched_metric and matched_metric.get("source", {}).get("quote"):
                fallback_quote = matched_metric["source"]["quote"]
                validated_claims.append({
                    "claim": c.get("claim", ""),
                    "supporting_metric_fields": c.get("supporting_metric_fields", []),
                    "supporting_quote": fallback_quote,
                    "source_page": page
                })

    # If no claims parsed or empty, generate from verified metrics
    if not validated_claims and valid_metrics:
        for m in valid_metrics[:3]:
            src = m.get("source", {})
            if src.get("page") and src.get("quote"):
                validated_claims.append({
                    "claim": f"{m.get('field').replace('_', ' ').title()} was reported as {m.get('value')}.",
                    "supporting_metric_fields": [m.get("field")],
                    "supporting_quote": src.get("quote"),
                    "source_page": src.get("page")
                })

    return {
        "interpretation_summary": summary_text,
        "claims": validated_claims
    }
