"""Single-request entry point: reads one JSON request on stdin, writes one JSON response on stdout.

Started by the authenticated API (`python -m brainspace_rag.worker`); it never listens on a port.
Request:  {"operation": "index" | "embed_query" | "answer", "payload": {...}}
Response: {"ok": true, "data": ...} or {"ok": false, "status": <4xx/5xx>, "message": "<user-safe>"}
"""

import json
import sys

from .errors import RagError
from .pipeline import OPERATIONS


def handle(request: object) -> dict:
    try:
        if not isinstance(request, dict) or not isinstance(request.get("payload"), dict):
            raise RagError(400, "Invalid AI request.")
        operation = OPERATIONS.get(request.get("operation"))  # type: ignore[arg-type]
        if operation is None:
            raise RagError(400, "Unknown AI operation.")
        return {"ok": True, "data": operation(request["payload"])}
    except RagError as err:
        return {"ok": False, "status": err.status, "message": err.message}
    except Exception as err:  # noqa: BLE001 - the boundary must never crash without a response
        print(f"brainspace_rag: unexpected {type(err).__name__}", file=sys.stderr)
        return {"ok": False, "status": 500, "message": "AI processing failed. Please try again."}


def main() -> None:
    try:
        request = json.load(sys.stdin)
    except ValueError:
        request = None
    sys.stdout.write(json.dumps(handle(request), allow_nan=False))
    sys.stdout.flush()


if __name__ == "__main__":
    main()
