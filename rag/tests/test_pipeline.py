import unittest

from brainspace_rag import pipeline
from brainspace_rag.errors import RagError

from .helpers import use_stub_provider

SOURCE = "The project uses blue cards for each source. Every card links to its original page."


class PipelineTest(unittest.TestCase):
    def setUp(self):
        use_stub_provider(self)

    def test_index_pasted_text(self):
        result = pipeline.index({"link": "https://example.com", "text": SOURCE})
        self.assertEqual(result["model"], "test-embedding")
        self.assertEqual(result["sourceType"], "pasted")
        self.assertEqual(len(result["chunks"]), 1)
        self.assertEqual(result["chunks"][0]["text"], SOURCE)
        self.assertTrue(result["chunks"][0]["embedding"])

    def test_index_rejects_too_little_text(self):
        with self.assertRaises(RagError) as ctx:
            pipeline.index({"link": "https://example.com", "text": "too short"})
        self.assertEqual(ctx.exception.status, 422)

    def test_answer_returns_verified_evidence(self):
        result = pipeline.answer({"question": "Which cards does the project use?", "candidates": [{"id": "S1", "text": SOURCE}]})
        self.assertFalse(result["abstained"])
        self.assertEqual(result["evidence"], [{"id": "S1", "quote": "The project uses blue cards for each source."}])

    def test_answer_abstains_on_fabricated_quote(self):
        result = pipeline.answer({"question": "fabricate an answer", "candidates": [{"id": "S1", "text": SOURCE}]})
        self.assertTrue(result["abstained"])

    def test_answer_abstains_when_support_check_fails(self):
        result = pipeline.answer({"question": "an unsupported claim about cards", "candidates": [{"id": "S1", "text": SOURCE}]})
        self.assertTrue(result["abstained"])

    def test_answer_abstains_without_candidates(self):
        self.assertTrue(pipeline.answer({"question": "anything", "candidates": []})["abstained"])

    def test_missing_key_is_reported_as_not_configured(self):
        import os

        os.environ["GEMINI_API_KEY"] = ""
        with self.assertRaises(RagError) as ctx:
            pipeline.embed_query({"question": "hello"})
        self.assertEqual(ctx.exception.status, 503)


if __name__ == "__main__":
    unittest.main()
