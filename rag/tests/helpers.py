"""Shared test configuration. Run the suite with `PYTHONPATH=tests/stubs` (see rag/README.md)."""

import os
import urllib.request

PROVIDER_ENV = {
    "GEMINI_API_KEY": "test-key",
    "GEMINI_EMBEDDING_MODEL": "test-embedding",
    "GEMINI_CHAT_MODEL": "test-chat",
}


def use_stub_provider(test_case):
    if getattr(urllib.request.urlopen, "__name__", "") != "fake_urlopen":
        raise RuntimeError("The provider stub is not loaded. Run with PYTHONPATH=tests/stubs.")
    previous = {key: os.environ.get(key) for key in PROVIDER_ENV}
    os.environ.update(PROVIDER_ENV)

    def restore():
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    test_case.addCleanup(restore)
