"""Google Gemini REST client. Never logs prompts, source text or credentials."""

import json
import math
import urllib.error
import urllib.request
from typing import Any

from .config import ProviderConfig
from .errors import RagError
from .limits import EMBEDDING_DIMENSIONS, PROVIDER_TIMEOUT_SECONDS

BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/"


def _post(config: ProviderConfig, path: str, body: dict) -> Any:
    request = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(body).encode("utf-8"),
        headers={"x-goog-api-key": config.api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=PROVIDER_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except urllib.error.HTTPError as err:
        if err.code == 429:
            raise RagError(429, "The AI provider's rate limit was reached. Please try again later.") from None
        raise RagError(502, "The AI provider rejected the request. Check the server configuration.") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise RagError(502, "The AI provider is unreachable. Please try again.") from None
    except (ValueError, UnicodeError):
        raise RagError(502, "The AI provider returned an invalid response.") from None


def _is_vector(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) > 0
        and all(isinstance(n, (int, float)) and not isinstance(n, bool) and math.isfinite(n) for n in value)
    )


def embed(config: ProviderConfig, texts: list[str], task: str) -> list[list[float]]:
    data = _post(
        config,
        f"{config.embedding_model}:batchEmbedContents",
        {
            "requests": [
                {
                    "model": f"models/{config.embedding_model}",
                    "content": {"parts": [{"text": text}]},
                    "taskType": task,
                    "outputDimensionality": EMBEDDING_DIMENSIONS,
                }
                for text in texts
            ]
        },
    )
    try:
        vectors = [item["values"] for item in data["embeddings"]]
    except (KeyError, TypeError):
        raise RagError(502, "The AI provider returned invalid embeddings.") from None
    if len(vectors) != len(texts) or not all(_is_vector(v) for v in vectors):
        raise RagError(502, "The AI provider returned invalid embeddings.")
    return vectors


def generate_json(config: ProviderConfig, system: str, payload: dict, schema: dict) -> Any:
    """Structured generation: the model must return JSON matching `schema`."""
    data = _post(
        config,
        f"{config.chat_model}:generateContent",
        {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": json.dumps(payload)}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
                "responseJsonSchema": schema,
            },
        },
    )
    try:
        return json.loads(data["candidates"][0]["content"]["parts"][0]["text"])
    except (KeyError, IndexError, TypeError, ValueError):
        raise RagError(502, "The AI provider returned an invalid answer.") from None
