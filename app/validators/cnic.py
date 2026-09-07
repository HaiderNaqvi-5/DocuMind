import re


def normalize_cnic(value: str) -> str:
    digits = re.sub(r"[-\s]", "", value.strip())
    if not re.fullmatch(r"\d{13}", digits):
        raise ValueError("CNIC must contain 13 digits.")
    return f"{digits[:5]}-{digits[5:12]}-{digits[12]}"
