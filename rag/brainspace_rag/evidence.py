"""Exact-quote validation: every cited quote must appear verbatim in the excerpt it cites."""

from typing import Any

from .limits import MAX_EVIDENCE_ITEMS, MAX_QUOTE_CHARS, MIN_QUOTE_CHARS


def validate_evidence(evidence: Any, candidates: list[dict]) -> bool:
    if not isinstance(evidence, list) or not 1 <= len(evidence) <= MAX_EVIDENCE_ITEMS:
        return False
    texts = {c["id"]: c["text"] for c in candidates}
    for item in evidence:
        if not isinstance(item, dict):
            return False
        quote, source_id = item.get("quote"), item.get("id")
        if not isinstance(quote, str) or not isinstance(source_id, str):
            return False
        if not MIN_QUOTE_CHARS <= len(quote.strip()) <= MAX_QUOTE_CHARS:
            return False
        if source_id not in texts or quote not in texts[source_id]:
            return False
    return True
