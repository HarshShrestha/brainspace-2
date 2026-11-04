"""Whitespace-normalizing, overlapping, word-boundary-aware chunking."""

import re

from .limits import CHUNK_OVERLAP, CHUNK_SIZE, MAX_CHUNKS


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP, limit: int = MAX_CHUNKS) -> list[str]:
    cleaned = normalize(text)
    chunks: list[str] = []
    start = 0
    while start < len(cleaned) and len(chunks) < limit:
        end = min(len(cleaned), start + size)
        if end < len(cleaned):
            space = cleaned.rfind(" ", start, end + 1)
            if space > start + size // 2:
                end = space
        chunks.append(cleaned[start:end].strip())
        if end == len(cleaned):
            break
        next_start = max(start + 1, end - overlap)
        # Begin the overlap at a word boundary so no chunk starts mid-word.
        space = cleaned.find(" ", next_start, end)
        start = space + 1 if space != -1 else next_start
    return [chunk for chunk in chunks if chunk]
