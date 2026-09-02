import re
from typing import Optional, Dict, Any, Tuple


def parse_numeric_financial(value_str: Optional[str]) -> Optional[float]:
    """
    Parses financial string like '$94,930 million', '94.9B', '(1,234)', '-45.6%' into float.
    """
    if not value_str:
        return None
    s = str(value_str).strip()
    
    # Check for negative in parentheses: (123) -> -123
    is_negative = False
    if s.startswith("(") and s.endswith(")"):
        is_negative = True
        s = s[1:-1].strip()
    elif s.startswith("-"):
        is_negative = True
        s = s[1:].strip()

    # Multipliers
    multiplier = 1.0
    s_lower = s.lower()
    if "billion" in s_lower or " b" in s_lower or s_lower.endswith("b"):
        multiplier = 1000.0
    elif "trillion" in s_lower or " t" in s_lower:
        multiplier = 1000000.0

    # Extract digits, decimal points, and minus signs
    cleaned = re.sub(r'[^\d.]', '', s)
    if not cleaned:
        return None
        
    try:
        val = float(cleaned) * multiplier
        return -val if is_negative else val
    except ValueError:
        return None


def compute_gross_margin(
    revenue: Optional[float], 
    gross_profit: Optional[float]
) -> Tuple[Optional[float], Optional[str]]:
    """
    Deterministic calculation of gross margin % = (gross_profit / revenue) * 100
    """
    if revenue is None or gross_profit is None or revenue <= 0:
        return None, None
    gm = (gross_profit / revenue) * 100.0
    formula = f"Gross Profit ({gross_profit:,.1f}) / Revenue ({revenue:,.1f}) * 100 = {gm:.2f}%"
    return round(gm, 2), formula


def compute_yoy_growth(
    current_rev: Optional[float], 
    prior_year_rev: Optional[float]
) -> Tuple[Optional[float], Optional[str]]:
    """
    Deterministic YoY growth = ((current - prior) / prior) * 100
    """
    if current_rev is None or prior_year_rev is None or prior_year_rev <= 0:
        return None, None
    growth = ((current_rev - prior_year_rev) / prior_year_rev) * 100.0
    formula = f"(Current ({current_rev:,.1f}) - Prior ({prior_year_rev:,.1f})) / Prior * 100 = {growth:.2f}%"
    return round(growth, 2), formula


def normalize_fiscal_period(period_str: Optional[str]) -> Dict[str, Any]:
    """
    Normalizes 'Q3 FY26', 'Fiscal Q3 2026', 'Three months ended September 30, 2026' into canonical dict.
    """
    if not period_str:
        return {"fiscal_year": None, "quarter": None, "period_end": None, "raw": None}
        
    s = period_str.strip()
    result = {"raw": s, "fiscal_year": None, "quarter": None, "period_end": None}

    # Extract Full Date match (e.g. September 30, 2026)
    date_match = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})', s, re.IGNORECASE)
    if date_match:
        month_name = date_match.group(1)
        day = int(date_match.group(2))
        year = int(date_match.group(3))
        month_map = {
            "January": "01", "February": "02", "March": "03", "April": "04",
            "May": "05", "June": "06", "July": "07", "August": "08",
            "September": "09", "October": "10", "November": "11", "December": "12"
        }
        month_str = month_map.get(month_name.capitalize(), "01")
        result["period_end"] = f"{year}-{month_str}-{day:02d}"
        result["fiscal_year"] = year

    # Extract Quarter
    q_match = re.search(r'Q([1-4])|quarter\s*([1-4])|\b(first|second|third|fourth)\b', s, re.IGNORECASE)
    if q_match:
        if q_match.group(1):
            result["quarter"] = int(q_match.group(1))
        elif q_match.group(2):
            result["quarter"] = int(q_match.group(2))
        elif q_match.group(3):
            word = q_match.group(3).lower()
            ordinals = {"first": 1, "second": 2, "third": 3, "fourth": 4}
            result["quarter"] = ordinals.get(word)

    # Extract 4-digit year or FY year if not yet set by date
    if not result["fiscal_year"]:
        four_digit_year = re.search(r'\b(20\d{2})\b', s)
        if four_digit_year:
            result["fiscal_year"] = int(four_digit_year.group(1))
        else:
            fy_match = re.search(r'FY\s*(\d{2,4})', s, re.IGNORECASE)
            if fy_match:
                y = int(fy_match.group(1))
                if y < 100:
                    y += 2000
                result["fiscal_year"] = y

    return result
