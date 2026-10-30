"""
Table-aware financial document chunker.
Prevents row truncation, retains column headers and captions across all table chunks,
and attaches page, section, period, and unit metadata.
"""
import re
from typing import List, Dict, Any, Optional, Tuple


class TableAwareChunker:
    """
    Structured financial table processor.
    Solves truncation, column confusion, and unit loss.
    """

    UNIT_PATTERNS = [
        (r'\b(in\s+billions?|\$\s*in\s*billions?)\b', "USD Billions", 1000.0),
        (r'\b(in\s+millions?|\$\s*in\s*millions?)\b', "USD Millions", 1.0),
        (r'\b(in\s+thousands?|\$\s*in\s*thousands?)\b', "USD Thousands", 0.001),
        (r'\b(₹\s*in\s*crores?|in\s*crores?|cr)\b', "INR Crores", 10.0),
        (r'\b(₹\s*in\s*lakhs?|in\s*lakhs?|lac)\b', "INR Lakhs", 0.1),
    ]

    PERIOD_PATTERNS = [
        r'\b(Q[1-4]\s*(?:FY)?20\d{2}|Q[1-4]\s*\'\d{2})\b',
        r'\b(Fiscal\s*(?:Year\s*Ended)?\s*(?:January|December|March|September|June)\s*\d{1,2},?\s*20\d{2})\b',
        r'\b(Three\s+months\s+ended\s+[A-Za-z]+\s+\d{1,2},?\s*20\d{2})\b',
        r'\b(Nine\s+months\s+ended\s+[A-Za-z]+\s+\d{1,2},?\s*20\d{2})\b',
        r'\b(Year\s+Ended\s+[A-Za-z]+\s+\d{1,2},?\s*20\d{2})\b',
        r'\b(202[0-9]|FY202[0-9]|FY2[0-9])\b'
    ]

    @classmethod
    def detect_table_unit(cls, title: str, headers: List[str], surrounding_text: str = "") -> Tuple[str, float]:
        """
        Detects unit (e.g., Millions, Billions, Crores) and returns (unit_name, multiplier_to_million).
        """
        combined = f"{title} {' '.join(headers)} {surrounding_text}".lower()
        for pattern, unit_name, mult in cls.UNIT_PATTERNS:
            if re.search(pattern, combined, re.IGNORECASE):
                return unit_name, mult
        return "USD Millions", 1.0  # Default GAAP/SEC standard

    @classmethod
    def detect_table_periods(cls, headers: List[str], surrounding_text: str = "") -> List[str]:
        """Extracts fiscal periods referenced in table column headers."""
        periods = []
        combined = f"{' '.join(headers)} {surrounding_text}"
        for pat in cls.PERIOD_PATTERNS:
            matches = re.findall(pat, combined, re.IGNORECASE)
            for m in matches:
                clean_m = " ".join(m.split())
                if clean_m not in periods:
                    periods.append(clean_m)
        return periods

    @classmethod
    def chunk_table(
        cls,
        table_dict: Dict[str, Any],
        document_id: str,
        document_version: str,
        page_num: int,
        physical_page_idx: int,
        printed_page_label: str,
        rows_per_chunk: int = 8,
        section_title: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Chunks large tables while preserving headers, title, units, and period metadata on EVERY chunk.
        Does NOT drop rows 15+.
        """
        title = table_dict.get("title") or "Financial Statement Table"
        headers = table_dict.get("headers", [])
        rows = table_dict.get("rows", [])
        bbox = table_dict.get("bbox")
        tbl_id = table_dict.get("table_id", "0")

        if not rows:
            return []

        unit_label, unit_mult = cls.detect_table_unit(title, headers)
        periods = cls.detect_table_periods(headers)
        primary_period = periods[0] if periods else None

        header_line = " | ".join(headers) if headers else "Metric | Values"

        chunks = []
        num_rows = len(rows)

        # Slice into chunks of rows_per_chunk
        for start_idx in range(0, num_rows, rows_per_chunk):
            chunk_slice = rows[start_idx:start_idx + rows_per_chunk]
            chunk_num = (start_idx // rows_per_chunk) + 1
            total_chunks = (num_rows + rows_per_chunk - 1) // rows_per_chunk

            lines = [
                f"[TABLE CHUNK {chunk_num}/{total_chunks} | Page {page_num} | Unit: {unit_label}"
                f"{f' | Section: {section_title}' if section_title else ''}"
                f"{f' | Period: {primary_period}' if primary_period else ''}]",
                f"Table: {title}",
                f"Columns: {header_line}"
            ]
            for r in chunk_slice:
                lines.append("Row: " + " | ".join(r))

            chunk_text = "\n".join(lines)
            words = re.findall(r'\b[a-zA-Z0-9$%₹.,-]+\b', chunk_text.lower())

            chunk_record = {
                "chunk_id": f"{document_id}_p{page_num}_tbl_{tbl_id}_c{chunk_num}",
                "evidence_id": f"ev_{document_id}_p{page_num}_tbl_{tbl_id}_c{chunk_num}",
                "doc_id": document_id,
                "document_version": document_version,
                "page": page_num,
                "physical_page_index": physical_page_idx,
                "physical_page_number": page_num,
                "printed_page_label": printed_page_label,
                "content_type": "table",
                "text": chunk_text,
                "words_set": set(words),
                "raw_lower": chunk_text.lower(),
                "has_numbers": True,
                "has_financial_symbols": True,
                "region": bbox,
                "metadata": {
                    "table_title": title,
                    "unit": unit_label,
                    "unit_multiplier": unit_mult,
                    "periods": periods,
                    "primary_period": primary_period,
                    "section_title": section_title,
                    "row_range": f"{start_idx + 1}-{min(start_idx + rows_per_chunk, num_rows)} of {num_rows}"
                }
            }
            chunks.append(chunk_record)

        return chunks
