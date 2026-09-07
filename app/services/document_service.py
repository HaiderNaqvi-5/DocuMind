from pathlib import Path

from app.services.handlers import generate_docx, generate_pdf


def generate_document(template_path, replacements, signature_replacements=None, output_name=None):
    suffix = Path(template_path).suffix.lower()
    if suffix == ".docx":
        return generate_docx(template_path, replacements, signature_replacements, output_name)
    if suffix == ".pdf":
        return generate_pdf(template_path, replacements, signature_replacements, output_name)
    raise ValueError("Only DOCX and PDF templates are supported.")
