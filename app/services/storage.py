from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TEMPLATE_ROOT = (PROJECT_ROOT / "storage/templates").resolve()
GENERATED_ROOT = (PROJECT_ROOT / "storage/generated").resolve()


def safe_stored_path(stored_path: str, root: Path) -> Path:
    candidate = Path(stored_path)
    if not candidate.is_absolute():
        candidate = PROJECT_ROOT / candidate
    candidate = candidate.resolve()
    if candidate != root and root not in candidate.parents:
        raise ValueError("Stored path is outside the allowed storage directory.")
    return candidate
