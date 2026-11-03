import unittest

from brainspace_rag.evidence import validate_evidence

CANDIDATES = [{"id": "S1", "text": "The project uses blue cards for each source."}]


class EvidenceTest(unittest.TestCase):
    def test_accepts_verbatim_quote(self):
        self.assertTrue(validate_evidence([{"id": "S1", "quote": "uses blue cards for each source"}], CANDIDATES))

    def test_rejects_fabricated_quote(self):
        self.assertFalse(validate_evidence([{"id": "S1", "quote": "uses red cards for each source"}], CANDIDATES))

    def test_rejects_misattributed_source(self):
        self.assertFalse(validate_evidence([{"id": "S2", "quote": "uses blue cards for each source"}], CANDIDATES))

    def test_rejects_too_short_or_missing_evidence(self):
        self.assertFalse(validate_evidence([{"id": "S1", "quote": "blue"}], CANDIDATES))
        self.assertFalse(validate_evidence([], CANDIDATES))
        self.assertFalse(validate_evidence("not a list", CANDIDATES))
        self.assertFalse(validate_evidence([{"id": "S1"}], CANDIDATES))


if __name__ == "__main__":
    unittest.main()
