"""
Period- and Unit-Aware Query Processor.
Extracts target fiscal periods and reporting units from user queries,
boosts matching chunks to prevent prior-year and unit traps,
and provides unit normalization for financial figures.
"""
import re
from typing import Dict, Any, Optional, Tuple


class QueryNormalizer:
    """
    Financial query intent and unit normalizer.
    """

    UNIT_TARGETS = [
        (r'\b(billions?|billion|\$b|bn)\b', "USD Billions", 1000.0),
        (r'\b(millions?|million|\$m|mn)\b', "USD Millions", 1.0),
        (r'\b(thousands?|thousand|\$k)\b', "USD Thousands", 0.001),
        (r'\b(crores?|crore|cr)\b', "INR Crores", 10.0),
        (r'\b(lakhs?|lakh|lac)\b', "INR Lakhs", 0.1),
        (r'\b(percentage|percent|%|margin|growth\s*rate)\b', "%", 1.0),
    ]

    PRIOR_YEAR_PATTERNS = [
        r'\b(prior\s*year|last\s*year|same\s*quarter\s*last\s*year|previous\s*year|year-ago|prior\s*period)\b',
        r'\b(fy202[0-5]|fy2[0-5]|202[0-3])\b'
    ]

    CURRENT_YEAR_PATTERNS = [
        r'\b(current\s*year|this\s*year|current\s*quarter|latest\s*quarter)\b',
        r'\b(fy202[6-9]|fy2[6-9]|202[4-6])\b'
    ]

    @classmethod
    def analyze_query(cls, query: str) -> Dict[str, Any]:
        """
        Analyzes query text to detect requested unit, period, and trap indicators.
        """
        q_low = query.lower()

        # 1. Detect requested unit
        target_unit = None
        target_unit_multiplier = 1.0
        for pat, unit_name, mult in cls.UNIT_TARGETS:
            if re.search(pat, q_low):
                target_unit = unit_name
                target_unit_multiplier = mult
                break

        # 2. Detect prior year focus
        is_prior_year = any(re.search(pat, q_low) for pat in cls.PRIOR_YEAR_PATTERNS)
        is_current_year = any(re.search(pat, q_low) for pat in cls.CURRENT_YEAR_PATTERNS) and not is_prior_year

        # 3. Detect YoY / growth arithmetic
        is_growth = bool(re.search(r'\b(grow|growth|increase|decrease|change|yoy|year-over-year|sequential|margin)\b', q_low))

        # 4. Explicit year extraction
        year_match = re.search(r'\b(202[0-9]|fy202[0-9]|fy2[0-9])\b', q_low)
        explicit_year = year_match.group(0).upper() if year_match else None

        # 5. Quarter extraction
        q_match = re.search(r'\b(q[1-4])\b', q_low)
        explicit_quarter = q_match.group(0).upper() if q_match else None

        return {
            "query": query,
            "target_unit": target_unit,
            "unit_multiplier": target_unit_multiplier,
            "is_prior_year": is_prior_year,
            "is_current_year": is_current_year,
            "is_growth": is_growth,
            "explicit_year": explicit_year,
            "explicit_quarter": explicit_quarter
        }

    @classmethod
    def compute_contextual_boost(
        cls,
        chunk: Dict[str, Any],
        query_intent: Dict[str, Any]
    ) -> float:
        """
        Computes dynamic score boost based on period and unit alignment.
        Prevents prior-year trap and unit trap from dominating ranking.
        """
        boost = 0.0
        text_lower = chunk.get("raw_lower", "")
        meta = chunk.get("metadata", {})

        # Period alignment
        if query_intent["is_prior_year"]:
            if any(term in text_lower for term in ["prior year", "same quarter last year", "2023", "2025", "2022"]):
                boost += 8.0
            if meta.get("primary_period") and any(y in meta["primary_period"] for y in ["2023", "2025", "2022"]):
                boost += 6.0
        elif query_intent["is_current_year"]:
            if any(term in text_lower for term in ["2024", "2026", "current"]):
                boost += 6.0
            if meta.get("primary_period") and any(y in meta["primary_period"] for y in ["2024", "2026"]):
                boost += 6.0

        # Explicit quarter match
        eq = query_intent["explicit_quarter"]
        if eq and eq.lower() in text_lower:
            boost += 5.0

        # Unit alignment
        tu = query_intent["target_unit"]
        if tu:
            if tu.lower() in text_lower or (meta.get("unit") and tu.lower() in meta["unit"].lower()):
                boost += 6.0

        # Table bonus if query asks for breakdown/metrics
        if chunk.get("content_type") == "table" and (query_intent["is_growth"] or query_intent["explicit_year"]):
            boost += 4.0

        return boost

    @classmethod
    def convert_value_to_unit(
        cls,
        value: float,
        from_unit: str,
        to_unit: str
    ) -> float:
        """
        Converts financial number between base units (Millions base).
        e.g., from Millions to Billions: divide by 1000.
        from Crores to Millions: multiply by 10.
        """
        unit_map = {
            "USD Millions": 1.0,
            "USD Billions": 1000.0,
            "USD Thousands": 0.001,
            "INR Crores": 10.0,
            "INR Lakhs": 0.1,
            "Employees": 1.0,
            "Thousand Employees": 0.001,
            "%": 1.0
        }
        mult_from = unit_map.get(from_unit, 1.0)
        mult_to = unit_map.get(to_unit, 1.0)

        # Convert to absolute base first, then to target unit
        abs_base = value * mult_from
        return round(abs_base / mult_to, 4)
