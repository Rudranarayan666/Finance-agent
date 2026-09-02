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
        Extract text page by page (1-indexed).
        Applies OCR fallback if text is insufficient.
        """
        try:
            doc = fitz.open(self.file_path)
        except Exception as e:
            raise PDFParserError(f"Corrupted or password-protected PDF: {str(e)}")

        pages_data = []
        ocr_applied_pages = []
        total_pages = len(doc)

        for page_idx in range(total_pages):
            page_num = page_idx + 1
            page = doc[page_idx]
            
            # Extract plain text
            text = page.get_text("text")
            blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
            
            # Check if text is sparse and needs OCR fallback
            cleaned_text = text.strip()
            if len(cleaned_text) < min_text_len_for_ocr:
                ocr_text = self._try_ocr_page(page)
                if ocr_text and len(ocr_text.strip()) > len(cleaned_text):
                    cleaned_text = ocr_text.strip()
                    ocr_applied_pages.append(page_num)

            pages_data.append({
                "page_number": page_num,
                "text": cleaned_text,
                "char_count": len(cleaned_text),
                "blocks_count": len(blocks)
            })

        doc.close()
        return {
            "total_pages": total_pages,
            "pages": pages_data,
            "ocr_applied_pages": ocr_applied_pages
        }

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
