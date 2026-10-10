import os
import io
import pytest
from backend.app.core.security_scanner import SecurityScanner
from backend.app.parser.document_parser import DocumentParser

def test_security_scanner_multi_format():
    # 1. PDF
    valid_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    safe, msg, seal = SecurityScanner.inspect_document(valid_pdf, "report.pdf")
    assert safe is True
    assert "sha256_hash" in seal

    # 2. CSV
    valid_csv = b"Quarter,Revenue,Operating_Income,Net_Income\nQ1 2026,1200,350,280\nQ2 2026,1350,410,320\n"
    safe_csv, msg_csv, seal_csv = SecurityScanner.inspect_document(valid_csv, "financials.csv")
    assert safe_csv is True
    assert "sha256_hash" in seal_csv

    # 3. Malicious CSV Formula Injection
    malicious_csv = b"=cmd|' /C calc'!A0\n1,2,3"
    safe_mal, msg_mal, _ = SecurityScanner.inspect_document(malicious_csv, "inject.csv")
    assert safe_mal is False
    assert "formula injection" in msg_mal.lower()

    # 4. Excel XLSX Magic Header
    valid_xlsx_bytes = b"PK\x03\x04" + (b"\x00" * 100)
    safe_xl, _, seal_xl = SecurityScanner.inspect_document(valid_xlsx_bytes, "model.xlsx")
    assert safe_xl is True
    assert "sha256_hash" in seal_xl

    # 5. Unsupported file type
    safe_bad, msg_bad, _ = SecurityScanner.inspect_document(b"hello world", "script.exe")
    assert safe_bad is False
    assert "unsupported document format" in msg_bad.lower()


def test_csv_parsing(tmp_path):
    csv_file = tmp_path / "q3_results.csv"
    csv_content = (
        "Metric,Q3 FY26,Q3 FY25,YoY Growth\n"
        "Total Revenue,$1,250M,$1,000M,25%\n"
        "Operating Income,$320M,$250M,28%\n"
        "Net Income,$240M,$190M,26%\n"
    )
    csv_file.write_text(csv_content, encoding="utf-8")

    parser = DocumentParser(str(csv_file))
    extracted = parser.extract_pages()

    assert extracted["total_pages"] == 1
    assert extracted["file_type"] == "csv"
    page = extracted["pages"][0]
    assert page["page_number"] == 1
    assert len(page["tables"]) == 1
    assert page["tables"][0]["headers"] == ["Metric", "Q3 FY26", "Q3 FY25", "YoY Growth"]
    assert len(page["tables"][0]["rows"]) == 3
    assert "Total Revenue" in page["text"]

    # Test rendering page image
    img_bytes = parser.render_page_image(page_number=1)
    assert len(img_bytes) > 100
    assert img_bytes.startswith(b"\x89PNG")


def test_excel_parsing(tmp_path):
    import openpyxl

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Income Statement"
    ws.append(["Line Item", "2026", "2025"])
    ws.append(["Revenue", "5000", "4200"])
    ws.append(["Cost of Sales", "2800", "2400"])
    ws.append(["Gross Profit", "2200", "1800"])

    excel_file = tmp_path / "financial_model.xlsx"
    wb.save(str(excel_file))

    parser = DocumentParser(str(excel_file))
    extracted = parser.extract_pages()

    assert extracted["total_pages"] == 1
    assert extracted["file_type"] == "excel"
    page = extracted["pages"][0]
    assert page["printed_page_label"] == "Income Statement"
    assert len(page["tables"]) == 1
    assert page["tables"][0]["headers"] == ["Line Item", "2026", "2025"]
    assert len(page["tables"][0]["rows"]) == 3

    # Test rendering page image
    img_bytes = parser.render_page_image(page_number=1)
    assert len(img_bytes) > 100
    assert img_bytes.startswith(b"\x89PNG")
