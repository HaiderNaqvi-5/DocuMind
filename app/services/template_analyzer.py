import json
import re

from app.config import CHAT_MODEL
from app.models.template import TemplateAnalysis
from app.services.field_schema import SUPPORTED_FIELDS, normalize_field_key


CONTROLLED_PROMPT = """
Map only personal/form fields to this exact allowlist:
full_name, email, phone_number, gender, cnic, date_of_birth, address, signature.
Ignore every other category, including summary, experience, education, skills,
projects, certifications, achievements, biography, LinkedIn and GitHub.
Return JSON: {"document_type":"short type","fields":[{"field_key":"allowed_key",
"source_text":"exact text copied from the document"}]}. Never invent source text or keys.
Prefer an existing value or blank marker after a label (underscores/dots), not the label.
"""

LABEL_PATTERN = re.compile(
    r"(?im)^(?P<label>[A-Za-z][A-Za-z .'-]{1,45}?)(?:\s*[:\-]\s*)"
    r"(?P<value>[^\n]{1,200})$"
)
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?92|0)3\d{2}[ -]?\d{7}(?!\d)")
CNIC_PATTERN = re.compile(r"(?<!\d)\d{5}-?\d{7}-?\d(?!\d)")


def _exact_source(requested: object, text: str) -> str | None:
    source = str(requested or "").strip()
    if not source:
        return None
    if source in text:
        return source
    match = re.search(r"\s+".join(re.escape(part) for part in source.split()), text)
    return match.group(0) if match else None


def normalize_analyzer_fields(raw_fields: object, document_text: str) -> list[dict]:
    """Apply the authoritative allowlist and exact-source check to any AI output."""
    if not isinstance(raw_fields, list):
        return []
    result = []
    seen = set()
    for raw in raw_fields:
        if not isinstance(raw, dict):
            continue
        key = normalize_field_key(str(raw.get("field_key", "")))
        source = _exact_source(raw.get("source_text"), document_text)
        if not key or not source or key in seen:
            continue
        definition = SUPPORTED_FIELDS[key]
        result.append({
            "field_key": key,
            "label": definition["label"],
            "field_type": definition["field_type"],
            "required": definition["required"],
            "source_text": source,
        })
        seen.add(key)
    return result


def _deterministic_fields(text: str) -> list[dict]:
    candidates = []
    for match in LABEL_PATTERN.finditer(text):
        key = normalize_field_key(match.group("label"))
        value = match.group("value").strip()
        if key and value:
            candidates.append({"field_key": key, "source_text": value})
    for key, pattern in (("email", EMAIL_PATTERN), ("phone_number", PHONE_PATTERN), ("cnic", CNIC_PATTERN)):
        match = pattern.search(text)
        if match:
            candidates.append({"field_key": key, "source_text": match.group(0)})
    return normalize_analyzer_fields(candidates, text)


def _call_controlled_model(structure: dict, text: str) -> dict:
    # Lazy construction keeps deterministic analysis and tests independent of OpenAI credentials.
    from openai import OpenAI

    response = OpenAI().chat.completions.create(
        model=CHAT_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": CONTROLLED_PROMPT},
            {"role": "user", "content": json.dumps({"structure": structure, "text": text})},
        ],
    )
    content = response.choices[0].message.content
    if not content:
        return {}
    return json.loads(content)


def analyze_template_content(extracted_content: dict) -> TemplateAnalysis:
    text = str(extracted_content.get("combined_text", "")).strip()
    if not text:
        raise ValueError("The document does not contain readable text.")

    fields = _deterministic_fields(text)
    document_type = "document"
    try:
        mapped = _call_controlled_model(extracted_content.get("structure", {}), text)
        document_type = re.sub(
            r"[^a-z0-9]+", "_", str(mapped.get("document_type", "document")).lower()
        ).strip("_") or "document"
        ai_fields = normalize_analyzer_fields(mapped.get("fields"), text)
        fields = normalize_analyzer_fields(fields + ai_fields, text)
    except Exception:
        # Known labels and formatted values remain useful when AI is unavailable.
        pass

    return TemplateAnalysis.model_validate({"document_type": document_type, "fields": fields})
