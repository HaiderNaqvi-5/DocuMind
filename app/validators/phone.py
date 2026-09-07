import re


def normalize_pakistani_phone(value: str) -> str:
    compact = re.sub(r"[\s()-]", "", value.strip())
    if compact.startswith("03") and len(compact) == 11:
        compact = "+92" + compact[1:]
    elif compact.startswith("923") and len(compact) == 12:
        compact = "+" + compact
    if not re.fullmatch(r"\+923\d{9}", compact):
        raise ValueError("Please enter a valid Pakistani mobile number.")
    return compact
