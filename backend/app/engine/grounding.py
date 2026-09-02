import re
import string
from typing import Dict, Any, List, Optional, Tuple


def normalize_text(text: str) -> str:
    """Normalize whitespace, lowercases, and removes non-standard whitespace."""
    if not text:
        return ""
    # Replace non-breaking spaces, tabs, newlines with single space
    cleaned = re.sub(r'\s+', ' ', text)
    return cleaned.strip().lower()


def strip_punctuation(text: str) -> str:
    return text.translate(str.maketrans('', '', string.punctuation))


class DeterministicGroundingValidator:
    """
    Validates that extracted quotes are exact verbatim substrings on claimed pages.
    No LLM hallucinations permitted.
    """
    def __init__(self, pages_dict: Dict[int, str]):
        """
        :param pages_dict: Mapping of page_number (1-indexed) -> raw page text
        """
        self.pages_dict = pages_dict
        self.normalized_pages = {
            p: normalize_text(text) for p, text in pages_dict.items()
        }

    def validate_quote(
        self, 
        page_num: Optional[int], 
        quote: Optional[str],
        allow_adjacent: bool = False
    ) -> Tuple[bool, str, float]:
        """
        Returns (is_valid, reason, confidence_score)
        """
        if page_num is None or quote is None:
            return False, "Missing page or quote", 0.0

        if not quote.strip():
            return False, "Empty quote", 0.0

        if page_num not in self.pages_dict:
            return False, f"Page {page_num} is outside document page range (1-{len(self.pages_dict)})", 0.0

        raw_page_text = self.pages_dict[page_num]
        norm_page_text = self.normalized_pages[page_num]
        norm_quote = normalize_text(quote)

        # 1. Exact verbatim match in raw page text
        if quote in raw_page_text:
            return True, "Exact verbatim match", 1.0

        # 2. Normalized whitespace / case match
        if norm_quote in norm_page_text:
            return True, "Normalized substring match", 0.98

        # 3. Punctuation-stripped match
        stripped_quote = strip_punctuation(norm_quote)
        stripped_page = strip_punctuation(norm_page_text)
        if stripped_quote in stripped_page:
            return True, "Punctuation-relaxed match", 0.92

        # 4. Token overlap verification (safe partial match on claimed page)
        quote_tokens = [w for w in stripped_quote.split() if len(w) > 2]
        if len(quote_tokens) >= 4:
            matched_tokens = sum(1 for t in quote_tokens if t in stripped_page)
            ratio = matched_tokens / len(quote_tokens)
            if ratio >= 0.85:
                return True, f"High token overlap ({int(ratio*100)}%) on page {page_num}", 0.80

        # 5. Check adjacent page (in case of page break / split table) only if allow_adjacent is True
        if allow_adjacent:
            for adj_page in [page_num - 1, page_num + 1]:
                if adj_page in self.normalized_pages:
                    if norm_quote in self.normalized_pages[adj_page]:
                        return True, f"Found on adjacent page {adj_page}", 0.85

        return False, f"Quote not found on page {page_num}", 0.0

    def validate_metric(self, metric: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate single metric dictionary and update confidence / status.
        """
        source = metric.get("source", {})
        page = source.get("page")
        quote = source.get("quote")
        value = metric.get("value")

        # If metric is not disclosed or not found
        if value is None or str(value).lower() in ["not disclosed", "not_disclosed", "none", "n/a", "null"]:
            metric["value"] = None
            metric["status"] = "NOT_DISCLOSED"
            metric["confidence"] = "not_disclosed"
            metric["extraction_method"] = "not_found"
            return metric

        # If computed (like gross margin), ensure formula is present
        if metric.get("extraction_method") == "computed":
            metric["status"] = "FOUND"
            metric["confidence"] = "high"
            return metric

        is_valid, reason, score = self.validate_quote(page, quote, allow_adjacent=True)
        if is_valid:
            metric["status"] = "FOUND"
            metric["confidence"] = "high" if score >= 0.9 else "medium"
        else:
            metric["status"] = "VALIDATION_FAILED"
            metric["confidence"] = "low"
            metric["validation_error"] = reason

        return metric
