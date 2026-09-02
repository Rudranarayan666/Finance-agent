from typing import Dict, Any, List
from backend.app.agents.state import AgentState
from backend.app.core.llm import LLMService


RISK_PROMPT = """
You are a Financial Risk Extraction Agent.
Extract the top 2-3 key risk factors mentioned in the Risk Factors / MD&A sections of this filing (e.g. supply chain, regulatory, FX fluctuations, competition).

CRITICAL RULES:
- Provide a clear 2-3 bullet summary of the primary risks.
- You MUST provide the exact page number and an EXACT VERBATIM quote (max 40 words) from that page supporting these risks.
- If not disclosed, set value: null, confidence: "not_disclosed".

Document Text:
__DOCUMENT_CONTEXT__

Return valid JSON:
{
  "field": "key_risk_factors",
  "value": "string summarizing 2-3 risks, or null",
  "unit": null,
  "confidence": "high | medium | low | not_disclosed",
  "source": {
    "page": 1,
    "quote": "verbatim quote from page or null"
  },
  "extraction_method": "direct_statement | not_found"
}
"""


def risk_extraction_node(state: AgentState) -> Dict[str, Any]:
    pages_dict = state["pages_dict"]
    section_map = state.get("section_map", {})
    
    # Priority pages for risks
    risk_pages = set(
        section_map.get("risk_factors", []) +
        section_map.get("mda", []) +
        list(range(min(5, len(pages_dict)), min(15, len(pages_dict) + 1)))
    )
    
    context = "\n\n".join([f"--- PAGE {p} ---\n{pages_dict[p]}" for p in sorted(risk_pages) if p in pages_dict])
    if len(context) > 40000:
        context = context[:40000]

    prompt = RISK_PROMPT.replace("__DOCUMENT_CONTEXT__", context)
    result = LLMService.invoke_structured(
        prompt=prompt,
        system_prompt="You extract key risk factors with strict verbatim citations.",
        model_tier="strong"
    )

    result["section_type"] = "risk_factors"
    return {
        "risk_candidates": [result]
    }
