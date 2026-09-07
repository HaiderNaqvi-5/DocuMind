import re


def detect_email(
    text: str,
) -> dict | None:
    match = re.search(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
        text,
    )

    if not match:
        return None

    return {
        "field_key": "email",
        "label": "Email",
        "field_type": "email",
        "required": True,
        "source_text": match.group(0),
    }


def detect_phone(
    text: str,
) -> dict | None:
    match = re.search(
        r"\+?\d[\d\s\-()]{8,}\d",
        text,
    )

    if not match:
        return None

    value = match.group(0).strip()

    digit_count = sum(
        character.isdigit()
        for character in value
    )

    if digit_count < 10:
        return None

    return {
        "field_key": "phone_number",
        "label": "Phone Number",
        "field_type": "text",
        "required": True,
        "source_text": value,
    }


def run_generic_detectors(
    text: str,
) -> list[dict]:
    detectors = [
        detect_email,
        detect_phone,
    ]

    fields = []

    for detector in detectors:
        field = detector(text)

        if field:
            fields.append(field)

    return fields
