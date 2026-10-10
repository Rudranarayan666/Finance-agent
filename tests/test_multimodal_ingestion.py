import os
import io
import pytest
from PIL import Image

from backend.app.parser.pdf_parser import PDFDocumentParser, PDFParserError
from backend.app.models.models import Document, EvidenceRecord
from backend.app.database import SessionLocal, init_db


def test_pdf_multimodal_page_extraction():
    sample_pdf = "eval/data/sample_q3_fy26.pdf"
    assert os.path.exists(sample_pdf), "Sample PDF must exist"

    parser = PDFDocumentParser(sample_pdf)
    res = parser.extract_pages()

    assert res["total_pages"] == 3
    assert len(res["pages"]) == 3

    p0 = res["pages"][0]
    # Verify 0-based physical page index vs 1-based page number
    assert p0["physical_page_index"] == 0
    assert p0["physical_page_number"] == 1
    assert p0["page_number"] == 1
    assert p0["width"] > 0
    assert p0["height"] > 0
    assert isinstance(p0["text"], str)
    assert len(p0["text"]) > 50

    # Verify layout blocks with bounding boxes
    assert "text_blocks" in p0
    assert len(p0["text_blocks"]) > 0
    first_block = p0["text_blocks"][0]
    assert "x0" in first_block and "y0" in first_block
    assert "x1" in first_block and "y1" in first_block
    assert first_block["x1"] > first_block["x0"]
    assert first_block["y1"] > first_block["y0"]


def test_pdf_page_image_rendering():
    sample_pdf = "eval/data/sample_q3_fy26.pdf"
    parser = PDFDocumentParser(sample_pdf)

    # Render physical page 1 to high-res PNG bytes
    img_bytes = parser.render_page_image(page_number=1, dpi=100)
    assert isinstance(img_bytes, bytes)
    assert len(img_bytes) > 1000

    # Verify PNG header
    assert img_bytes.startswith(b"\x89PNG\r\n\x1a\n")

    # Verify loadable by PIL
    image = Image.open(io.BytesIO(img_bytes))
    assert image.format == "PNG"
    assert image.width > 200
    assert image.height > 200

    # Page out of range error check
    with pytest.raises(PDFParserError):
        parser.render_page_image(page_number=999)

    with pytest.raises(PDFParserError):
        parser.render_page_image(page_number=0)


def test_printed_page_label_detection():
    sample_pdf = "eval/data/sample_q3_fy26.pdf"
    parser = PDFDocumentParser(sample_pdf)
    res = parser.extract_pages()

    # Verify each page has printed_page_label field distinct from physical_page_index
    for p in res["pages"]:
        assert "printed_page_label" in p
        assert "physical_page_index" in p
        assert p["physical_page_index"] == p["page_number"] - 1


def test_invalid_file_handling():
    with pytest.raises(PDFParserError):
        PDFDocumentParser("non_existent_file_path.pdf")
