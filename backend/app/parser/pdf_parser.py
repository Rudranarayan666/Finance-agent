import io
import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional
from PIL import Image
import os

try:
    import pytesseract
    HAS_PYTESSERACT = True
except ImportError:
    HAS_PYTESSERACT = False


class PDFParserError(Exception):
    pass


class PDFDocumentParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self._validate_file()

    def _validate_file(self):
        if not os.path.exists(self.file_path):
            raise PDFParserError(f"File not found: {self.file_path}")
            
        with open(self.file_path, "rb") as f:
            header = f.read(1024)
            if not header.startswith(b"%PDF-"):
                raise PDFParserError("Invalid file type: File header is not a valid PDF (%PDF- missing)")
            if b"/JS" in header or b"/JavaScript" in header:
                # Active script warning/detection
                pass

    def extract_pages(self, min_text_len_for_ocr: int = 50) -> Dict[str, Any]:
        """
        Extract text, tables, visual regions, and layout page by page.
        Preserves 0-indexed physical page index, 1-indexed page number,
        printed page label, bounding boxes, and dimensions.
        Applies OCR fallback if text is insufficient.
        """
        try:
            doc = fitz.open(self.file_path)
        except Exception as e:
            raise PDFParserError(f"Corrupted or password-protected PDF: {str(e)}")

        pages_data = []
        ocr_applied_pages = []
        total_pages = len(doc)

        if total_pages == 0:
            doc.close()
            raise PDFParserError("Empty PDF document: 0 pages found")

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]

            # Physical dimensions
            rect = page.rect
            width = float(rect.width)
            height = float(rect.height)
            rotation = int(page.rotation)

            # Printed page label
            printed_label = self._detect_printed_page_label(page)

            # Plain text and layout blocks
            text = page.get_text("text")
            raw_blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)

            text_blocks = []
            image_blocks = []
            for b in raw_blocks:
                b_type = b[6] if len(b) > 6 else 0
                if b_type == 0:
                    b_text = b[4].strip() if len(b) > 4 else ""
                    if b_text:
                        text_blocks.append({
                            "x0": round(float(b[0]), 2),
                            "y0": round(float(b[1]), 2),
                            "x1": round(float(b[2]), 2),
                            "y1": round(float(b[3]), 2),
                            "text": b_text,
                            "block_no": b[5] if len(b) > 5 else 0
                        })
                else:
                    image_blocks.append({
                        "x0": round(float(b[0]), 2),
                        "y0": round(float(b[1]), 2),
                        "x1": round(float(b[2]), 2),
                        "y1": round(float(b[3]), 2),
                        "block_no": b[5] if len(b) > 5 else 0
                    })

            # Structured table extraction using PyMuPDF find_tables()
            tables = self._extract_tables(page, text_blocks)

            # Visual regions & charts
            visual_regions = self._extract_visual_regions(page, image_blocks, text_blocks)

            # Check if text is sparse and needs OCR fallback
            cleaned_text = text.strip()
            extraction_method = "pymupdf"
            extraction_confidence = 1.0

            if len(cleaned_text) < min_text_len_for_ocr:
                ocr_text = self._try_ocr_page(page)
                if ocr_text and len(ocr_text.strip()) > len(cleaned_text):
                    cleaned_text = ocr_text.strip()
                    ocr_applied_pages.append(page_num)
                    extraction_method = "ocr"
                    extraction_confidence = 0.85

            pages_data.append({
                "page_number": page_num,
                "physical_page_index": page_idx,
                "physical_page_number": page_num,
                "printed_page_label": printed_label,
                "width": width,
                "height": height,
                "rotation": rotation,
                "text": cleaned_text,
                "char_count": len(cleaned_text),
                "blocks_count": len(raw_blocks),
                "text_blocks": text_blocks,
                "tables": tables,
                "visual_regions": visual_regions,
                "extraction_method": extraction_method,
                "extraction_confidence": extraction_confidence
            })

        doc.close()
        return {
            "total_pages": total_pages,
            "pages": pages_data,
            "ocr_applied_pages": ocr_applied_pages
        }

    def _detect_printed_page_label(self, page: fitz.Page) -> Optional[str]:
        """Detect printed page label from page attributes or footer/header text."""
        try:
            label = page.get_label()
            if label and label.strip():
                return label.strip()
        except Exception:
            pass

        # Check footer lines (bottom 15% of page)
        try:
            rect = page.rect
            footer_rect = fitz.Rect(0, rect.height * 0.85, rect.width, rect.height)
            footer_text = page.get_text("text", clip=footer_rect).strip()
            if footer_text:
                import re
                m = re.search(r'(?:page\s+|[-–—]\s*)?([0-9]{1,4}|[ivxlcdm]{1,8}|[A-Z]-[0-9]{1,3})\s*(?:[-–—]|$)', footer_text, re.IGNORECASE)
                if m:
                    return m.group(1).strip()
        except Exception:
            pass

        return None

    def _extract_tables(self, page: fitz.Page, text_blocks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract structured tables using PyMuPDF find_tables if available."""
        tables_data = []
        try:
            if hasattr(page, "find_tables"):
                tabs = page.find_tables()
                tab_list = getattr(tabs, "tables", tabs)
                for t_idx, tab in enumerate(tab_list):
                    bbox = tab.bbox if hasattr(tab, "bbox") else [0, 0, 0, 0]
                    rows = tab.extract() if hasattr(tab, "extract") else []
                    if not rows:
                        continue

                    headers = [str(c).strip() for c in rows[0] if c is not None] if rows else []
                    clean_rows = []
                    for r in rows[1:]:
                        clean_rows.append([str(c).strip() if c is not None else "" for c in r])

                    # Find candidate title: text block immediately above table
                    title = None
                    y0 = bbox[1]
                    for b in text_blocks:
                        if b["y1"] <= y0 + 10 and b["y1"] >= y0 - 50:
                            title = b["text"]
                            break

                    tables_data.append({
                        "table_id": f"p{page.number + 1}_t{t_idx}",
                        "title": title or "Financial Statement Table",
                        "bbox": {
                            "x0": round(float(bbox[0]), 2),
                            "y0": round(float(bbox[1]), 2),
                            "x1": round(float(bbox[2]), 2),
                            "y1": round(float(bbox[3]), 2)
                        },
                        "headers": headers,
                        "rows": clean_rows,
                        "row_count": len(clean_rows),
                        "col_count": len(headers)
                    })
        except Exception:
            pass
        return tables_data

    def _extract_visual_regions(
        self,
        page: fitz.Page,
        image_blocks: List[Dict[str, Any]],
        text_blocks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract chart, graph, and image visual regions with bounding boxes."""
        visual_regions = []
        for idx, img in enumerate(image_blocks):
            # Check for caption or title near the image
            caption = None
            for b in text_blocks:
                if abs(b["y0"] - img["y1"]) < 40 or abs(b["y1"] - img["y0"]) < 40:
                    text_sample = b["text"].lower()
                    if any(term in text_sample for term in ["figure", "chart", "graph", "exhibit", "source", "overview", "trend"]):
                        caption = b["text"]
                        break

            visual_regions.append({
                "region_id": f"p{page.number + 1}_v{idx}",
                "type": "chart" if caption else "image",
                "caption": caption or "Embedded Graphic / Chart",
                "bbox": {
                    "x0": img["x0"],
                    "y0": img["y0"],
                    "x1": img["x1"],
                    "y1": img["y1"]
                }
            })
        return visual_regions

    def render_page_image(self, page_number: int, dpi: int = 150) -> bytes:
        """
        Renders exact physical page to high-res PNG bytes for web viewing.
        :param page_number: 1-indexed physical page number
        """
        try:
            doc = fitz.open(self.file_path)
            if page_number < 1 or page_number > len(doc):
                doc.close()
                raise PDFParserError(f"Page number {page_number} out of range (1-{len(doc)})")
            page = doc[page_number - 1]
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes("png")
            doc.close()
            return img_bytes
        except Exception as e:
            raise PDFParserError(f"Failed to render page image: {str(e)}")

    def _try_ocr_page(self, page: fitz.Page) -> Optional[str]:
        """Fallback OCR when page text is empty or image-based"""
        if not HAS_PYTESSERACT:
            return None
        try:
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            image = Image.open(io.BytesIO(img_bytes))
            text = pytesseract.image_to_string(image)
            return text
        except Exception:
            return None

    def create_overlapping_chunks(
        self,
        pages_data: List[Dict[str, Any]],
        chunk_size: int = 15,
        overlap: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Create overlapping page chunks (~15-20 pages with 2-page overlap).
        """
        total_pages = len(pages_data)
        if total_pages <= chunk_size:
            combined_text = "\n\n".join([f"--- PAGE {p['page_number']} ---\n{p['text']}" for p in pages_data])
            return [{
                "chunk_id": 0,
                "start_page": 1,
                "end_page": total_pages,
                "pages": [p["page_number"] for p in pages_data],
                "text": combined_text
            }]

        chunks = []
        step = chunk_size - overlap
        chunk_idx = 0

        for start_idx in range(0, total_pages, step):
            end_idx = min(start_idx + chunk_size, total_pages)
            chunk_pages = pages_data[start_idx:end_idx]
            
            combined_text = "\n\n".join([f"--- PAGE {p['page_number']} ---\n{p['text']}" for p in chunk_pages])
            chunks.append({
                "chunk_id": chunk_idx,
                "start_page": chunk_pages[0]["page_number"],
                "end_page": chunk_pages[-1]["page_number"],
                "pages": [p["page_number"] for p in chunk_pages],
                "text": combined_text
            })
            chunk_idx += 1
            if end_idx >= total_pages:
                break

        return chunks
