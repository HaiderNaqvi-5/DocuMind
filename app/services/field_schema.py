import re
from copy import deepcopy


SUPPORTED_FIELDS = {
    "full_name": {"label": "Full Name", "field_type": "text", "required": True},
    "email": {"label": "Email", "field_type": "email", "required": True},
    "phone_number": {"label": "Phone Number", "field_type": "text", "required": True},
    "gender": {
        "label": "Gender",
        "field_type": "select",
        "required": True,
        "options": ["Male", "Female", "Other", "Prefer not to say"],
    },
    "cnic": {"label": "CNIC", "field_type": "text", "required": True},
    "date_of_birth": {"label": "Date of Birth", "field_type": "date", "required": True},
    "address": {"label": "Address", "field_type": "textarea", "required": True},
    "signature": {"label": "E-Signature", "field_type": "signature", "required": True},
}
SUPPORTED_FIELD_KEYS = frozenset(SUPPORTED_FIELDS)

FIELD_ALIASES = {
    "name": "full_name", "full_name": "full_name", "applicant_name": "full_name",
    "candidate_name": "full_name", "student_name": "full_name",
    "email": "email", "email_address": "email", "e_mail": "email",
    "electronic_mail": "email",
    "phone": "phone_number", "phone_number": "phone_number", "phone_no": "phone_number",
    "mobile": "phone_number", "mobile_no": "phone_number", "mobile_number": "phone_number",
    "contact_number": "phone_number", "contact_no": "phone_number",
    "gender": "gender", "sex": "gender",
    "cnic": "cnic", "cnic_no": "cnic", "cnic_number": "cnic",
    "national_identity_number": "cnic", "identity_number": "cnic",
    "date_of_birth": "date_of_birth", "dob": "date_of_birth", "birth_date": "date_of_birth",
    "address": "address", "home_address": "address", "residential_address": "address",
    "mailing_address": "address",
    "signature": "signature", "applicant_signature": "signature",
    "candidate_signature": "signature", "student_signature": "signature",
    "e_signature": "signature", "sign_here": "signature",
}


def normalize_field_key(key: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(key).strip().lower()).strip("_")
    return FIELD_ALIASES.get(normalized)


def get_field_definition(key: str) -> dict | None:
    canonical = normalize_field_key(key)
    if not canonical:
        return None
    return deepcopy(SUPPORTED_FIELDS[canonical])


def field_metadata(key: str) -> dict:
    canonical = normalize_field_key(key)
    if not canonical:
        raise ValueError(f"Unsupported field key: {key}")
    return {"field_key": canonical, **deepcopy(SUPPORTED_FIELDS[canonical])}
