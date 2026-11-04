"""TEST ONLY: replaces urllib's urlopen with a deterministic Gemini simulator.

Loaded automatically when this directory is on PYTHONPATH (backend integration tests and the
Python suite). It is never on the production path and is excluded from container images.

Behaviour:
- embeddings: hashed bag-of-words vectors, so texts sharing words are similar;
- answers: quote the first sentence of the top excerpt; a question containing "fabricate" gets an
  invented quote, and one containing "unsupported" fails the support check.
"""

import io
import json
import math
import re
import urllib.request
import zlib

DIMENSIONS = 64
STOPWORDS = {"the", "a", "an", "and", "or", "of", "to", "in", "is", "are", "for", "what", "which", "how", "does", "do", "it", "this", "that", "with", "on", "by", "be"}
PREFIX = "https://generativelanguage.googleapis.com/v1beta/models/"


def _words(text):
    for word in re.findall(r"[a-z0-9]+", text.lower()):
        if word not in STOPWORDS:
            yield word[:-1] if len(word) > 3 and word.endswith("s") else word


def _embed(text):
    vector = [0.0] * DIMENSIONS
    for word in _words(text):
        vector[zlib.crc32(word.encode()) % DIMENSIONS] += 1.0
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [v / norm for v in vector] if any(vector) else [1e-6] * DIMENSIONS


def _first_sentence(text):
    sentence = re.split(r"(?<=[.!?])\s", text.strip(), maxsplit=1)[0]
    return sentence if len(sentence) >= 12 else text[:200]


def _generate(payload):
    if "quotes" in payload:
        return {"supported": "unsupported" not in payload["question"].lower()}
    source = payload["sources"][0]
    quote = _first_sentence(source["text"])
    if "fabricate" in payload["question"].lower():
        quote = "This quotation was invented by the model."
    return {"answer": quote, "evidence": [{"id": source["id"], "quote": quote}]}


def fake_urlopen(request, timeout=None):
    url = request.full_url
    if not url.startswith(PREFIX):
        raise AssertionError(f"Unexpected network call in tests: {url}")
    if request.get_header("X-goog-api-key") in (None, ""):
        raise AssertionError("Provider call without an API key")
    body = json.loads(request.data)
    if url.endswith(":batchEmbedContents"):
        result = {"embeddings": [{"values": _embed(r["content"]["parts"][0]["text"])} for r in body["requests"]]}
    elif url.endswith(":generateContent"):
        payload = json.loads(body["contents"][0]["parts"][0]["text"])
        result = {"candidates": [{"content": {"parts": [{"text": json.dumps(_generate(payload))}]}}]}
    else:
        raise AssertionError(f"Unexpected provider endpoint: {url}")
    return io.BytesIO(json.dumps(result).encode())


urllib.request.urlopen = fake_urlopen
