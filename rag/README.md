# brainspace_rag

The Python worker behind BrainSpace's optional AI assistant. It uses only the Python 3.10+
standard library and never listens on a network port: the authenticated API starts
`python -m brainspace_rag.worker` per request and exchanges one JSON message over stdin/stdout.

| Module | Responsibility |
| --- | --- |
| `worker.py` | Process entry point and wire protocol; converts every failure into a user-safe response. |
| `pipeline.py` | The three operations: `index`, `embed_query`, `answer` (generation + support check). |
| `extraction.py` | SSRF-safe public page fetching and HTML-to-text. |
| `chunking.py` | Overlapping, word-boundary chunking. |
| `evidence.py` | Verifies that every cited quote appears verbatim in the excerpt it cites. |
| `provider.py` | Google Gemini REST calls (embeddings, structured JSON generation). |
| `config.py`, `limits.py`, `errors.py` | Configuration, bounds and the `RagError` type. |

Vector ranking is **not** done here; the API ranks stored chunks and sends only the top excerpts.
See [docs/08_AI_ASSISTANT.md](../docs/08_AI_ASSISTANT.md) for the full design.

## Tests

```bash
cd rag
PYTHONPATH=tests/stubs python3 -m unittest discover -s tests -t .
```

`tests/stubs/sitecustomize.py` replaces `urllib.request.urlopen` with a deterministic Gemini
simulator. It is test-only and is excluded from the production image.
