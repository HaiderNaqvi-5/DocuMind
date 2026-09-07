from datetime import date


def normalize_date_of_birth(value: str) -> str:
    try:
        parsed = date.fromisoformat(value.strip())
    except ValueError as exc:
        raise ValueError("Date of birth must be a valid date in YYYY-MM-DD format.") from exc
    if parsed > date.today():
        raise ValueError("Date of birth cannot be in the future.")
    return parsed.isoformat()
