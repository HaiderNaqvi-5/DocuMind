from typing import Any


def deduplicate_fields(
    fields: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    seen_keys = set()
    seen_sources = set()

    result = []

    for field in fields:
        field_key = field[
            "field_key"
        ]

        source_text = field[
            "source_text"
        ]

        if field_key in seen_keys:
            continue

        if source_text in seen_sources:
            continue

        seen_keys.add(
            field_key
        )

        seen_sources.add(
            source_text
        )

        result.append(
            field
        )

    return result
