from pathlib import Path

import pymupdf

from app.services.handlers.pdf_handler import generate_pdf


def test_pdf_generation_preserves_page_and_overlays_value(tmp_path):
    template = tmp_path / "template.pdf"
    document = pymupdf.open()
    page = document.new_page()
    page.insert_text((72, 72), "Full Name: ______")
    document.save(template)
    document.close()

    result = generate_pdf(template, {"______": "Ali Khan"}, output_name="test")
    output = Path(result["path"])
    try:
        with pymupdf.open(output) as generated:
            assert len(generated) == 1
            assert "Full Name:" in generated[0].get_text()
            assert "Ali Khan" in generated[0].get_text()
    finally:
        output.unlink(missing_ok=True)
