from app.services.field_schema import SUPPORTED_FIELDS
from app.validators.cnic import normalize_cnic
from app.validators.date import normalize_date_of_birth
from app.validators.email import validate_email
from app.validators.phone import normalize_pakistani_phone


NORMALIZERS = {
    "email": validate_email,
    "phone_number": normalize_pakistani_phone,
    "cnic": normalize_cnic,
    "date_of_birth": normalize_date_of_birth,
}


def validate_and_normalize(field_key: str, value: str) -> str:
    if field_key not in SUPPORTED_FIELDS:
        raise ValueError("Unsupported field.")
    cleaned = value.strip()
    if field_key == "gender" and cleaned not in SUPPORTED_FIELDS["gender"]["options"]:
        raise ValueError("Please select a supported gender option.")
    normalizer = NORMALIZERS.get(field_key)
    return normalizer(cleaned) if cleaned and normalizer else cleaned
