import base64
from pathlib import Path
from uuid import uuid4

import pymupdf

from app.services.storage import GENERATED_ROOT

GENERATED_DIR = GENERATED_ROOT
GENERATED_DIR.mkdir(parents=True, exist_ok=True)


def _signature_bytes(value: str) -> bytes:
    encoded = value.split(",", 1)[1] if "," in value else value
    try:
        data = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("Invalid base64 signature.") from exc
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Signature must be a PNG image.")
    return data


def generate_pdf(template_path, replacements, signature_replacements=None, output_name=None):
    path = Path(template_path)
    if path.suffix.lower() != ".pdf":
        raise ValueError("Expected a PDF template.")
    signature_replacements = signature_replacements or {}
    document = pymupdf.open(path)
    text_count = 0
    signature_count = 0
    try:
        for page in document:
            pending_text = []
            pending_signatures = []
            for source, value in replacements.items():
                for rect in page.search_for(source):
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    pending_text.append((rect, value))
                    text_count += 1
            for source, value in signature_replacements.items():
                if not value:
                    continue
                for rect in page.search_for(source):
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    pending_signatures.append((rect, value))
                    signature_count += 1
            if pending_text or pending_signatures:
                page.apply_redactions()
            for rect, value in pending_text:
                width = max(rect.width, len(value) * 6)
                target = pymupdf.Rect(
                    rect.x0,
                    rect.y0,
                    min(page.rect.x1 - 12, rect.x0 + width),
                    rect.y1 + max(4, rect.height * 0.4),
                )
                page.insert_textbox(target, value, fontsize=max(7, min(10, rect.height * 0.65)))
            for rect, value in pending_signatures:
                target = pymupdf.Rect(rect.x0, rect.y0 - rect.height, rect.x0 + max(rect.width, 120), rect.y1)
                page.insert_image(target, stream=_signature_bytes(value), keep_proportion=True)

        safe_stem = Path(output_name or "generated").stem
        filename = f"{uuid4().hex}_{safe_stem}.pdf"
        output_path = GENERATED_DIR / filename
        document.save(output_path)
    finally:
        document.close()
    return {"path": str(output_path), "filename": filename, "replacement_count": text_count,
            "signature_count": signature_count}
