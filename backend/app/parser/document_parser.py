import os
import csv
import io
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont

from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError


class DocumentParserError(Exception):
    pass


class DocumentParser:
    """
    Unified Multimodal Financial Document Parser.
    Supports:
    - PDF documents (.pdf via PyMuPDF)
    - Excel spreadsheets (.xlsx, .xls via openpyxl)
    - CSV financial tables (.csv via Python csv & DuckDB)
    """

    def __init__(self, file_path: str):
        self.file_path = file_path
        if not os.path.exists(file_path):
            raise DocumentParserError(f"File not found: {file_path}")

        self.filename = os.path.basename(file_path)
        self.ext = os.path.splitext(self.filename)[1].lower()
        self.pdf_parser: Optional[PDFDocumentParser] = None

        if self.ext == ".pdf":
            self.pdf_parser = PDFDocumentParser(file_path)

    def extract_pages(self, min_text_len_for_ocr: int = 40) -> Dict[str, Any]:
        """
        Extracts structured multimodal pages, tables, text blocks, and dimensions.
        Returns standardized dictionary:
        {
            "total_pages": int,
            "pages": List[Dict[str, Any]],
            "file_type": str,
            "filename": str
        }
        """
        if self.ext == ".pdf":
            res = self.pdf_parser.extract_pages(min_text_len_for_ocr=min_text_len_for_ocr)
            res["file_type"] = "pdf"
        elif self.ext == ".csv":
            res = self._extract_csv()
        elif self.ext in [".xlsx", ".xls"]:
            res = self._extract_excel()
        else:
            raise DocumentParserError(f"Unsupported file type: {self.ext}")

        if res.get("total_pages", 0) <= 0 or not res.get("pages"):
            raise DocumentParserError("Document contains 0 pages or no extractable content.")

        return res

    def render_page_image(self, page_number: int = 1, dpi: int = 150) -> bytes:
        """
        Renders a physical page or tabular spreadsheet grid as PNG image bytes.
        """
        if self.ext == ".pdf" and self.pdf_parser:
            return self.pdf_parser.render_page_image(page_number, dpi)

        # For CSV or Excel, render synthetic high-resolution spreadsheet image
        extracted = self.extract_pages()
        pages = extracted.get("pages", [])
        target_page = next((p for p in pages if p["page_number"] == page_number), None)
        if not target_page and pages:
            target_page = pages[0]

        return self._render_tabular_grid_image(target_page or {}, dpi)

    def _extract_csv(self) -> Dict[str, Any]:
        """
        Parses CSV financial tables into paginated structured table records.
        """
        try:
            with open(self.file_path, "r", encoding="utf-8", errors="replace") as f:
                sample = f.read(4096)
                f.seek(0)
                delimiter = ","
                if "\t" in sample and sample.count("\t") > sample.count(","):
                    delimiter = "\t"
                elif ";" in sample and sample.count(";") > sample.count(","):
                    delimiter = ";"

                reader = csv.reader(f, delimiter=delimiter)
                all_rows = [row for row in reader if any(cell.strip() for cell in row)]

            if not all_rows:
                return {
                    "total_pages": 1,
                    "file_type": "csv",
                    "filename": self.filename,
                    "pages": [{
                        "page_number": 1,
                        "physical_page_index": 0,
                        "physical_page_number": 1,
                        "printed_page_label": "Sheet 1",
                        "width": 800.0,
                        "height": 1000.0,
                        "rotation": 0,
                        "text": "Empty CSV file.",
                        "char_count": 15,
                        "text_blocks": [],
                        "tables": [],
                        "visual_regions": [],
                        "extraction_method": "csv",
                        "extraction_confidence": 1.0
                    }]
                }

            headers = [c.strip() for c in all_rows[0]]
            data_rows = all_rows[1:]

            # Paginate 50 rows per page
            rows_per_page = 50
            pages = []
            num_pages = max(1, (len(data_rows) + rows_per_page - 1) // rows_per_page)

            for p_idx in range(num_pages):
                p_num = p_idx + 1
                start_row = p_idx * rows_per_page
                chunk_rows = data_rows[start_row : start_row + rows_per_page]

                # Format markdown table
                lines = [f"# Financial CSV Report: {self.filename} (Page {p_num})", ""]
                header_line = "| " + " | ".join(headers) + " |"
                sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                lines.extend([header_line, sep_line])

                for r in chunk_rows:
                    row_cells = [cell.strip() for cell in r]
                    # Pad or truncate row to header length
                    if len(row_cells) < len(headers):
                        row_cells += [""] * (len(headers) - len(row_cells))
                    row_cells = row_cells[:len(headers)]
                    lines.append("| " + " | ".join(row_cells) + " |")

                page_text = "\n".join(lines)

                # Bounding box for table
                tbl_record = {
                    "table_id": f"csv_tbl_p{p_num}",
                    "title": f"{self.filename} (Rows {start_row + 1} to {start_row + len(chunk_rows)})",
                    "headers": headers,
                    "rows": [[c.strip() for c in r] for r in chunk_rows],
                    "row_count": len(chunk_rows),
                    "col_count": len(headers),
                    "bbox": (30.0, 50.0, 770.0, min(950.0, 50.0 + len(chunk_rows) * 18.0))
                }

                text_blocks = [{
                    "x0": 30.0,
                    "y0": 50.0,
                    "x1": 770.0,
                    "y1": min(950.0, 50.0 + len(chunk_rows) * 18.0),
                    "text": page_text,
                    "block_no": 0
                }]

                pages.append({
                    "page_number": p_num,
                    "physical_page_index": p_idx,
                    "physical_page_number": p_num,
                    "printed_page_label": f"Page {p_num}",
                    "width": 800.0,
                    "height": 1000.0,
                    "rotation": 0,
                    "text": page_text,
                    "char_count": len(page_text),
                    "text_blocks": text_blocks,
                    "tables": [tbl_record],
                    "visual_regions": [],
                    "extraction_method": "csv",
                    "extraction_confidence": 1.0
                })

            return {
                "total_pages": len(pages),
                "file_type": "csv",
                "filename": self.filename,
                "pages": pages
            }
        except Exception as e:
            raise DocumentParserError(f"Error parsing CSV '{self.filename}': {str(e)}")

    def _extract_excel(self) -> Dict[str, Any]:
        """
        Parses Excel workbooks (.xlsx, .xls) sheet-by-sheet into structured pages.
        """
        try:
            import openpyxl

            wb = openpyxl.load_workbook(self.file_path, data_only=True)
            sheet_names = wb.sheetnames
            if not sheet_names:
                sheet_names = ["Sheet1"]

            pages = []
            for p_idx, sheet_name in enumerate(sheet_names):
                p_num = p_idx + 1
                sheet = wb[sheet_name]

                all_sheet_rows = []
                for row in sheet.iter_rows(values_only=True):
                    row_strs = [str(val).strip() if val is not None else "" for val in row]
                    if any(row_strs):
                        all_sheet_rows.append(row_strs)

                if not all_sheet_rows:
                    continue

                headers = all_sheet_rows[0]
                chunk_rows = all_sheet_rows[1:]

                # Format text
                lines = [f"# Financial Worksheet: {sheet_name} ({self.filename})", ""]
                header_line = "| " + " | ".join(headers) + " |"
                sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
                lines.extend([header_line, sep_line])

                clean_rows = []
                for r in chunk_rows[:150]:  # up to 150 rows per sheet
                    row_cells = r[:len(headers)]
                    if len(row_cells) < len(headers):
                        row_cells += [""] * (len(headers) - len(row_cells))
                    clean_rows.append(row_cells)
                    lines.append("| " + " | ".join(row_cells) + " |")

                page_text = "\n".join(lines)

                tbl_record = {
                    "table_id": f"xl_tbl_{sheet_name}",
                    "title": f"Worksheet: {sheet_name}",
                    "headers": headers,
                    "rows": clean_rows,
                    "row_count": len(clean_rows),
                    "col_count": len(headers),
                    "bbox": (30.0, 50.0, 770.0, min(950.0, 50.0 + len(clean_rows) * 18.0))
                }

                text_blocks = [{
                    "x0": 30.0,
                    "y0": 50.0,
                    "x1": 770.0,
                    "y1": min(950.0, 50.0 + len(clean_rows) * 18.0),
                    "text": page_text,
                    "block_no": 0
                }]

                pages.append({
                    "page_number": p_num,
                    "physical_page_index": p_idx,
                    "physical_page_number": p_num,
                    "printed_page_label": sheet_name,
                    "width": 800.0,
                    "height": 1000.0,
                    "rotation": 0,
                    "text": page_text,
                    "char_count": len(page_text),
                    "text_blocks": text_blocks,
                    "tables": [tbl_record],
                    "visual_regions": [],
                    "extraction_method": "excel",
                    "extraction_confidence": 1.0
                })

            if not pages:
                pages.append({
                    "page_number": 1,
                    "physical_page_index": 0,
                    "physical_page_number": 1,
                    "printed_page_label": "Sheet 1",
                    "width": 800.0,
                    "height": 1000.0,
                    "rotation": 0,
                    "text": "Empty workbook.",
                    "char_count": 15,
                    "text_blocks": [],
                    "tables": [],
                    "visual_regions": [],
                    "extraction_method": "excel",
                    "extraction_confidence": 1.0
                })

            return {
                "total_pages": len(pages),
                "file_type": "excel",
                "filename": self.filename,
                "pages": pages
            }
        except Exception as e:
            raise DocumentParserError(f"Error parsing Excel workbook '{self.filename}': {str(e)}")

    def _render_tabular_grid_image(self, page_data: Dict[str, Any], dpi: int = 150) -> bytes:
        """
        Generates a clean spreadsheet grid PNG image for Click-to-Verify source inspector.
        """
        width = int(page_data.get("width", 800))
        height = int(page_data.get("height", 1000))
        img = Image.new("RGB", (width, height), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Title bar
        title = page_data.get("printed_page_label", "Financial Sheet")
        draw.rectangle([0, 0, width, 40], fill=(245, 245, 245), outline=(200, 200, 200))
        draw.text((20, 12), f"Financial Sheet: {title} ({self.filename})", fill=(0, 0, 0))

        # Tables
        tables = page_data.get("tables", [])
        if tables:
            tbl = tables[0]
            headers = tbl.get("headers", [])[:8]
            rows = tbl.get("rows", [])[:35]

            start_y = 60
            col_w = max(70, (width - 40) // max(1, len(headers)))

            # Draw header row
            draw.rectangle([20, start_y, 20 + len(headers) * col_w, start_y + 25], fill=(254, 240, 138), outline=(0, 0, 0))
            for i, h in enumerate(headers):
                cell_x = 20 + i * col_w
                draw.text((cell_x + 5, start_y + 6), str(h)[:15], fill=(0, 0, 0))
                draw.line([(cell_x, start_y), (cell_x, start_y + 25)], fill=(0, 0, 0))

            cur_y = start_y + 25
            for r_idx, r in enumerate(rows):
                fill_color = (250, 250, 250) if r_idx % 2 == 1 else (255, 255, 255)
                draw.rectangle([20, cur_y, 20 + len(headers) * col_w, cur_y + 22], fill=fill_color, outline=(220, 220, 220))
                for c_idx in range(len(headers)):
                    cell_x = 20 + c_idx * col_w
                    val = str(r[c_idx]) if c_idx < len(r) else ""
                    draw.text((cell_x + 5, cur_y + 4), val[:15], fill=(20, 20, 20))
                    draw.line([(cell_x, cur_y), (cell_x, cur_y + 22)], fill=(220, 220, 220))
                cur_y += 22

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()
