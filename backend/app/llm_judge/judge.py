"""
LLM-as-Judge Evaluation Service.
Provides multi-dimensional evaluation of RAG responses against retrieved context:
- Faithfulness (zero hallucination of financial figures)
- Answer Relevancy & Completeness
- Citation Correctness (grounded page links)
- Explicit PASS / FAIL Verdict with Chain-of-Thought Reasoning
Supports live API models (NVIDIA NIM / OpenAI) with deterministic offline heuristic fallback.
"""
import re
import json
import logging
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.engine.arithmetic import parse_numeric_financial

logger = logging.getLogger(__name__)


class JudgeEvaluation(BaseModel):
    """
    Structured evaluation schema returned by the LLM-as-Judge.
    """
    verdict: Literal["PASS", "FAIL"] = Field(
        ..., description="Final binary judgment: PASS if faithful, accurate, and citations valid; FAIL otherwise."
    )
    faithfulness_score: float = Field(
        ..., ge=0.0, le=1.0, description="Faithfulness to retrieved context [0.0 - 1.0]."
    )
    answer_relevancy_score: float = Field(
        ..., ge=0.0, le=1.0, description="Relevance and completeness to user question [0.0 - 1.0]."
    )
    citation_correctness: float = Field(
        ..., ge=0.0, le=1.0, description="Proportion of citations validly supporting the answer [0.0 - 1.0]."
    )
    is_hallucination: bool = Field(
        ..., description="True if response asserts numbers, dates, or metrics not grounded in context."
    )
    hallucinated_facts: List[str] = Field(
        default_factory=list, description="Specific fabricated claims or ungrounded values identified."
    )
    reasoning: str = Field(
        ..., description="Chain-of-thought justification explaining the dimensional scores and verdict."
    )


JUDGE_SYSTEM_PROMPT = """You are an expert financial auditor and GenAI evaluation judge evaluating an automated financial assistant.
You evaluate responses according to strict financial disclosure guidelines:

RUBRIC DIMENSIONS:
1. FAITHFULNESS (0.0 to 1.0): Every financial figure, metric, and percentage must be directly supported by the context passages.
2. ANSWER RELEVANCY (0.0 to 1.0): The answer directly addresses the user's specific question without omitting key disclosures.
3. CITATION CORRECTNESS (0.0 to 1.0): Citations must reference the exact physical pages where evidence appears.
4. HALLUCINATION CHECK: Any fabricated number, confused unit (millions vs. billions), or invented fiscal period constitutes hallucination.
5. SAFE ABSTENTION: If the context does not contain the answer, the system MUST state that direct evidence is unavailable. Correct abstention receives 1.0 faithfulness.

VERDICT RULES:
- PASS requires: faithfulness >= 0.70, no hallucinations, and valid citations.
- FAIL if: hallucination detected, incorrect financial number, or wrong fiscal period cited.

Return a valid JSON object matching the requested schema strictly."""


class FinancialLLMJudge:
    """
    Automated LLM Judge service with deterministic offline fallback.
    """

    def __init__(self):
        self.backend = getattr(settings, "JUDGE_BACKEND", "local")
        self.model_name = getattr(settings, "JUDGE_MODEL", "meta/llama-3.1-70b-instruct")
        self.pass_threshold = float(getattr(settings, "JUDGE_PASS_THRESHOLD", 0.70))

    def evaluate(
        self,
        question: str,
        answer: str,
        context_passages: List[Dict[str, Any]],
        citations: List[Dict[str, Any]],
        expected_answer: Optional[str] = None
    ) -> JudgeEvaluation:
        """
        Evaluates a RAG response.
        Attempts LLM invocation if enabled/configured; degrades gracefully to deterministic rule engine.
        """
        # If live LLM backend configured, attempt API evaluation
        if self.backend in ["nvidia", "openai"] and getattr(settings, "USE_LLM_JUDGE", False):
            try:
                eval_res = self._evaluate_with_llm(
                    question=question,
                    answer=answer,
                    context_passages=context_passages,
                    citations=citations,
                    expected_answer=expected_answer
                )
                if eval_res:
                    return eval_res
            except Exception as e:
                logger.warning(f"LLM Judge API execution failed, falling back to deterministic evaluator: {e}")

        # Deterministic Rule-Based Fallback
        return self._evaluate_deterministic(
            question=question,
            answer=answer,
            context_passages=context_passages,
            citations=citations,
            expected_answer=expected_answer
        )

    def _evaluate_with_llm(
        self,
        question: str,
        answer: str,
        context_passages: List[Dict[str, Any]],
        citations: List[Dict[str, Any]],
        expected_answer: Optional[str] = None
    ) -> Optional[JudgeEvaluation]:
        """Calls OpenAI / NVIDIA NIM endpoint with structured JSON output."""
        from openai import OpenAI

        api_key = settings.NVIDIA_API_KEY if self.backend == "nvidia" else settings.OPENAI_API_KEY
        if not api_key or len(api_key.strip()) < 10:
            return None

        base_url = settings.NVIDIA_BASE_URL if self.backend == "nvidia" else "https://api.openai.com/v1"
        client = OpenAI(base_url=base_url, api_key=api_key, timeout=15)

        context_repr = "\n\n".join([
            f"[Passage Page {p.get('page') or p.get('physical_page_number')}]\n{p.get('text', '')[:300]}"
            for p in context_passages[:5]
        ])

        user_prompt = f"""EVALUATION CASE:
Question: {question}
Answer Generated: {answer}
Expected Reference (if available): {expected_answer or "N/A"}
Citations Claimed: {[c.get('page') for c in citations]}

Retrieved Context:
{context_repr}

Evaluate strictly according to the rubric and output valid JSON."""

        resp = client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )

        content = resp.choices[0].message.content
        if content:
            raw_data = json.loads(content)
            return JudgeEvaluation.model_validate(raw_data)

        return None

    def _evaluate_deterministic(
        self,
        question: str,
        answer: str,
        context_passages: List[Dict[str, Any]],
        citations: List[Dict[str, Any]],
        expected_answer: Optional[str] = None
    ) -> JudgeEvaluation:
        """
        High-precision deterministic evaluation engine:
        Verifies numeric facts, citation validity, abstention semantics, and flags hallucinations.
        """
        combined_context = " ".join([p.get("text", "") for p in context_passages]).lower()
        context_pages = {
            int(p.get("page") or p.get("physical_page_number", 0))
            for p in context_passages
            if (p.get("page") or p.get("physical_page_number"))
        }

        ans_lower = answer.lower()
        q_lower = question.lower()

        # 1. Check for abstention
        is_abstention = any(phrase in ans_lower for phrase in [
            "could not find direct verifiable evidence",
            "not found",
            "unindexed",
            "security warning",
            "prompt injection"
        ])

        # If question has no context or is an unanswerable injection, abstention is 1.0 faithful
        if not context_passages or "ignore previous" in q_lower or "reveal system prompt" in q_lower:
            if is_abstention:
                return JudgeEvaluation(
                    verdict="PASS",
                    faithfulness_score=1.0,
                    answer_relevancy_score=1.0,
                    citation_correctness=1.0,
                    is_hallucination=False,
                    hallucinated_facts=[],
                    reasoning="System correctly abstained on unanswerable or adversarial prompt."
                )

        # 2. Extract numeric claims from answer
        nums_in_answer = re.findall(r'[\$₹]?[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?', answer)
        hallucinated_facts = []
        numbers_checked = 0
        numbers_grounded = 0

        clean_context = re.sub(r',', '', combined_context)
        for raw_num in nums_in_answer:
            val = re.sub(r'[^\d.]', '', raw_num)
            if not val or len(val) == 1 and val in ["0", "1", "2"]:
                continue
            numbers_checked += 1
            # Check if this number exists in context (with or without formatting commas)
            if val in clean_context or raw_num.lower() in combined_context:
                numbers_grounded += 1
            else:
                hallucinated_facts.append(f"Ungrounded figure '{raw_num}' not found in retrieved evidence")

        # 3. Compute Faithfulness Score
        if numbers_checked > 0:
            numeric_faithfulness = numbers_grounded / numbers_checked
        else:
            numeric_faithfulness = 1.0

        is_hallucinating = len(hallucinated_facts) > 0
        faithfulness = numeric_faithfulness if not is_hallucinating else max(numeric_faithfulness * 0.5, 0.2)

        # 4. Citation Correctness
        cited_pages = [
            int(c.get("page") or c.get("physical_page_number", 0))
            for c in citations
            if (c.get("page") or c.get("physical_page_number"))
        ]
        if cited_pages and context_pages:
            valid_cites = sum(1 for cp in cited_pages if cp in context_pages)
            citation_score = valid_cites / len(cited_pages)
        elif not cited_pages and is_abstention:
            citation_score = 1.0
        else:
            citation_score = 0.5 if not cited_pages else 0.0

        # 5. Answer Relevancy
        q_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', q_lower)) - {"what", "show", "tell", "much", "does", "have"}
        ans_words = set(re.findall(r'\b[a-zA-Z]{3,}\b', ans_lower))
        relevancy_overlap = len(q_words.intersection(ans_words)) / max(len(q_words), 1)
        answer_relevancy = round(min(0.5 + (relevancy_overlap * 0.5), 1.0), 2)

        # 6. Overall Verdict
        composite_score = (faithfulness * 0.5) + (citation_score * 0.3) + (answer_relevancy * 0.2)
        verdict: Literal["PASS", "FAIL"] = "PASS" if (composite_score >= self.pass_threshold and not is_hallucinating) else "FAIL"

        reasoning = (
            f"Faithfulness={faithfulness:.2f} ({numbers_grounded}/{numbers_checked} numbers verified in context). "
            f"Citation correctness={citation_score:.2f}. Answer relevancy={answer_relevancy:.2f}. "
            f"{'Hallucination detected: ' + ', '.join(hallucinated_facts) if is_hallucinating else 'No hallucinations detected.'}"
        )

        return JudgeEvaluation(
            verdict=verdict,
            faithfulness_score=round(faithfulness, 2),
            answer_relevancy_score=round(answer_relevancy, 2),
            citation_correctness=round(citation_score, 2),
            is_hallucination=is_hallucinating,
            hallucinated_facts=hallucinated_facts,
            reasoning=reasoning
        )


judge_service = FinancialLLMJudge()
