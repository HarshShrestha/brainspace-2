"""Provider configuration, read from the minimal environment the API passes to the worker."""

import os
import re
from dataclasses import dataclass

from .errors import RagError

_MODEL = re.compile(r"^[A-Za-z0-9._-]+$")


@dataclass(frozen=True)
class ProviderConfig:
    api_key: str
    embedding_model: str
    chat_model: str


def load_config() -> ProviderConfig:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise RagError(503, "The AI assistant is not configured on this server.")
    embedding = os.environ.get("GEMINI_EMBEDDING_MODEL") or "gemini-embedding-001"
    chat = os.environ.get("GEMINI_CHAT_MODEL") or "gemini-3.8-flash"
    if not _MODEL.match(embedding) or not _MODEL.match(chat):
        raise RagError(503, "The AI model configuration is invalid.")
    return ProviderConfig(api_key=key, embedding_model=embedding, chat_model=chat)
