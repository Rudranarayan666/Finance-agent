from typing import Dict, Any, List
from backend.app.agents.state import AgentState
from backend.app.core.llm import LLMService


GUIDANCE_PROMPT = """
You are a Financial Guidance Extraction Agent.
Search for forward-looking guidance, management outlook, or financial targets for future quarters or fiscal years (e.g. Q4 revenue expectations, FY operating profit target).

CRITICAL RULES:
- If guidance is provided, extract a concise summary.
- You MUST cite the EXACT page number and an EXACT VERBATIM quote (max 40 words) from that page where management gives this guidance.
- If no forward-looking guidance is disclosed, return value: null, confidence: "not_disclosed".

Document Text:
__DOCUMENT_CONTEXT__

Return valid JSON:
{
  "field": "forward_guidance",
  "value": "string or null",
  "unit": "string or null",
  "confidence": "high | medium | low | not_disclosed",
  "source": {
    "page": 1,
    "quote": "verbatim quote from page or null"
  },
  "extraction_method": "direct_statement | not_found"
}
"""


def guidance_extraction_node(state: AgentState) -> Dict[str, Any]:
    pages_dict = state["pages_dict"]
    section_map = state.get("section_map", {})
    
    # Priority pages for guidance
    guidance_pages = set(
        section_map.get("guidance", []) +
        section_map.get("mda", []) +
        list(range(1, min(6, len(pages_dict) + 1)))
    )
    
    context = "\n\n".join([f"--- PAGE {p} ---\n{pages_dict[p]}" for p in sorted(guidance_pages) if p in pages_dict])
    if len(context) > 40000:
        context = context[:40000]

    prompt = GUIDANCE_PROMPT.replace("__DOCUMENT_CONTEXT__", context)
    result = LLMService.invoke_structured(
        prompt=prompt,
        system_prompt="You extract forward guidance with strict verifiable citations.",
        model_tier="strong"
    )

    result["section_type"] = "mda"
    return {
        "guidance_candidates": [result]
    }
