from typing import List, Dict, Any, Optional
import copy
from backend.app.schemas.schemas import ExtractionStatus, ConfidenceLevel


SECTION_PRIORITY = {
    "financial_statements": 10,
    "consolidated_statements": 10,
    "income_statement": 10,
    "balance_sheet": 10,
    "cash_flows": 10,
    "notes_to_financial_statements": 8,
    "mda": 6,
    "highlights": 5,
    "press_release": 5,
    "risk_factors": 5,
    "general": 1
}


class ReconciliationEngine:
    """
    Reconciles extractions from multiple chunks/agents deterministically.
    Guarantees non-circular, JSON-serializable outputs.
    """
    
    @staticmethod
    def reconcile_metrics(
        extracted_candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Groups candidates by field name, resolves conflicts, and selects best grounded metric.
        """
        by_field: Dict[str, List[Dict[str, Any]]] = {}
        for item in extracted_candidates:
            field = item.get("field")
            if not field:
                continue
            if field not in by_field:
                by_field[field] = []
            # Store a shallow copy without any nested occurrences
            clean_item = {k: v for k, v in item.items() if k != "raw_occurrences"}
            by_field[field].append(clean_item)

        reconciled = []
        target_fields = [
            "total_revenue",
            "gross_margin_pct",
            "net_income",
            "operating_cash_flow",
            "yoy_revenue_growth_pct",
            "forward_guidance",
            "headcount",
            "key_risk_factors"
        ]

        for field in target_fields:
            candidates = by_field.get(field, [])
            if not candidates:
                reconciled.append({
                    "field": field,
                    "value": None,
                    "unit": None,
                    "confidence": "not_disclosed",
                    "status": "NOT_DISCLOSED",
                    "source": {"page": None, "quote": None},
                    "extraction_method": "not_found"
                })
                continue

            # Filter valid candidates (value is not null/not disclosed)
            valid = [
                c for c in candidates 
                if c.get("value") is not None and str(c.get("value")).lower() not in ["not disclosed", "not_disclosed", "none", "null"]
            ]

            if not valid:
                reconciled.append({
                    "field": field,
                    "value": None,
                    "unit": None,
                    "confidence": "not_disclosed",
                    "status": "NOT_DISCLOSED",
                    "source": {"page": None, "quote": None},
                    "extraction_method": "not_found"
                })
                continue

            if len(valid) == 1:
                reconciled.append(dict(valid[0]))
                continue

            # Extract clean occurrences for debugging/auditing without self-reference
            raw_occurrences = [
                {
                    "value": c.get("value"),
                    "page": c.get("source", {}).get("page"),
                    "quote": c.get("source", {}).get("quote"),
                    "section_type": c.get("section_type", "general")
                }
                for c in valid
            ]

            # Check if all valid candidates agree on value
            values_set = set(str(c.get("value")).strip() for c in valid)
            if len(values_set) == 1:
                best = dict(valid[0])
                best["confidence"] = "high"
                best["raw_occurrences"] = raw_occurrences
                reconciled.append(best)
                continue

            # Conflict detected: rank candidates by section priority and grounding validity
            ranked = sorted(
                valid,
                key=lambda x: (
                    x.get("confidence") == "high",
                    SECTION_PRIORITY.get(x.get("section_type", "general"), 1),
                    x.get("source", {}).get("page") or 9999
                ),
                reverse=True
            )

            top = dict(ranked[0])
            sec_top = SECTION_PRIORITY.get(top.get("section_type", "general"), 1)
            sec_second = SECTION_PRIORITY.get(ranked[1].get("section_type", "general"), 1)

            if sec_top > sec_second:
                top["conflict_detected"] = True
                top["raw_occurrences"] = raw_occurrences
                reconciled.append(top)
            else:
                top["status"] = "AMBIGUOUS"
                top["confidence"] = "medium"
                top["conflict_detected"] = True
                top["raw_occurrences"] = raw_occurrences
                reconciled.append(top)

        return reconciled

    @staticmethod
    def generate_coverage_report(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Builds deterministic coverage report based on 8 target metrics.
        """
        fields_found = 0
        not_disclosed = []
        low_confidence = []

        total_weight = 0.0
        score_sum = 0.0

        for m in metrics:
            field = m.get("field")
            conf = str(m.get("confidence")).lower()
            val = m.get("value")
            status = m.get("status", "FOUND")

            if val is None or conf == "not_disclosed" or status == "NOT_DISCLOSED":
                not_disclosed.append(field)
            else:
                fields_found += 1
                if conf == "high":
                    score_sum += 1.0
                elif conf == "medium":
                    score_sum += 0.7
                elif conf == "low":
                    score_sum += 0.3
                    low_confidence.append(field)
                total_weight += 1.0

        overall_score = round(score_sum / max(len(metrics), 1), 2)

        return {
            "fields_found": fields_found,
            "fields_not_disclosed": not_disclosed,
            "low_confidence_fields": low_confidence,
            "overall_extraction_confidence": overall_score
        }
