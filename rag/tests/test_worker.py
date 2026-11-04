import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

from .helpers import PROVIDER_ENV

RAG_DIR = Path(__file__).resolve().parents[1]
STUBS = RAG_DIR / "tests" / "stubs"


def run_worker(request, extra_env=None):
    env = {"PATH": os.environ.get("PATH", ""), "PYTHONPATH": str(STUBS), **PROVIDER_ENV, **(extra_env or {})}
    completed = subprocess.run(
        [sys.executable, "-m", "brainspace_rag.worker"],
        input=request if isinstance(request, str) else json.dumps(request),
        capture_output=True,
        text=True,
        cwd=RAG_DIR,
        env=env,
        timeout=60,
        check=False,
    )
    return json.loads(completed.stdout)


class WorkerProtocolTest(unittest.TestCase):
    def test_successful_operation(self):
        response = run_worker({"operation": "embed_query", "payload": {"question": "blue cards"}})
        self.assertTrue(response["ok"])
        self.assertIsInstance(response["data"], list)

    def test_unknown_operation(self):
        response = run_worker({"operation": "drop_tables", "payload": {}})
        self.assertEqual(response, {"ok": False, "status": 400, "message": "Unknown AI operation."})

    def test_invalid_json_input(self):
        response = run_worker("{not json")
        self.assertFalse(response["ok"])
        self.assertEqual(response["status"], 400)

    def test_unexpected_errors_do_not_leak_details(self):
        response = run_worker({"operation": "index", "payload": {}})
        self.assertEqual(response["status"], 500)
        self.assertNotIn("KeyError", response["message"])


if __name__ == "__main__":
    unittest.main()
