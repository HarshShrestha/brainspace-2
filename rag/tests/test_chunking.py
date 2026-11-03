import unittest

from brainspace_rag.chunking import chunk_text, normalize


class ChunkingTest(unittest.TestCase):
    def test_normalizes_whitespace(self):
        self.assertEqual(normalize("  a\n\tb   c "), "a b c")

    def test_short_text_is_one_chunk(self):
        self.assertEqual(chunk_text("hello world"), ["hello world"])

    def test_chunks_overlap_and_respect_word_boundaries(self):
        text = " ".join(f"word{i}" for i in range(600))
        chunks = chunk_text(text, size=200, overlap=40)
        self.assertGreater(len(chunks), 1)
        for chunk in chunks:
            self.assertLessEqual(len(chunk), 200)
            self.assertTrue(chunk.startswith("word") or chunk[0].isdigit())
        self.assertIn(chunks[0][-20:].split(" ")[-1], chunks[1])

    def test_chunk_count_is_bounded(self):
        self.assertEqual(len(chunk_text("x " * 100_000, size=100, overlap=10, limit=7)), 7)

    def test_empty_text_has_no_chunks(self):
        self.assertEqual(chunk_text("   "), [])


if __name__ == "__main__":
    unittest.main()
