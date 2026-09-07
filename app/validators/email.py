from pydantic import EmailStr, TypeAdapter, ValidationError


def validate_email(value: str) -> str:
    try:
        return str(TypeAdapter(EmailStr).validate_python(value.strip())).lower()
    except ValidationError as exc:
        raise ValueError("Please enter a valid email address.") from exc
