from app.services.document_generator import generate_docx_document


def generate_docx(template_path, replacements, signature_replacements=None, output_name=None):
    return generate_docx_document(template_path, replacements, signature_replacements, output_name)
