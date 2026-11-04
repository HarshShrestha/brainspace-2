import unittest

from brainspace_rag.errors import RagError
from brainspace_rag.extraction import charset_of, fetch_public_text, html_to_text, is_public_address


class AddressTest(unittest.TestCase):
    def test_public_addresses(self):
        self.assertTrue(is_public_address("93.184.216.34"))
        self.assertTrue(is_public_address("2606:4700:4700::1111"))

    def test_private_reserved_and_tricky_addresses(self):
        for address in [
            "127.0.0.1",
            "10.0.0.1",
            "192.168.1.1",
            "172.16.0.1",
            "169.254.169.254",  # cloud metadata
            "0.0.0.0",
            "::1",
            "fc00::1",
            "::ffff:127.0.0.1",  # IPv4-mapped loopback
            "64:ff9b::7f00:1",  # NAT64-embedded loopback
            "224.0.0.1",  # multicast
            "not-an-ip",
        ]:
            with self.subTest(address=address):
                self.assertFalse(is_public_address(address))


class HtmlTest(unittest.TestCase):
    def test_drops_scripts_and_page_chrome(self):
        body = "Readable article text. " * 10
        html = f"<html><head><style>x{{}}</style><script>alert(1)</script></head><body><nav>Menu</nav><article>{body}</article><footer>Foot</footer></body></html>"
        text = html_to_text(html)
        self.assertIn("Readable article text.", text)
        for hidden in ("alert", "Menu", "Foot"):
            self.assertNotIn(hidden, text)

    def test_keeps_text_when_chrome_is_unclosed(self):
        html = "<header>" + "Content inside an unclosed header element. " * 5
        self.assertIn("Content inside", html_to_text(html))

    def test_charset_detection(self):
        self.assertEqual(charset_of("text/html; charset=ISO-8859-1"), "iso8859-1")
        self.assertEqual(charset_of("text/html; charset=bogus"), "utf-8")
        self.assertEqual(charset_of(None), "utf-8")


class FetchValidationTest(unittest.TestCase):
    def assert_rejected(self, url, status=400):
        with self.assertRaises(RagError) as ctx:
            fetch_public_text(url)
        self.assertEqual(ctx.exception.status, status)

    def test_rejects_unsafe_targets_before_connecting(self):
        self.assert_rejected("ftp://example.com/file")
        self.assert_rejected("http://user:pass@example.com/")
        self.assert_rejected("https://example.com:8443/")
        self.assert_rejected("http://127.0.0.1/")
        self.assert_rejected("http://169.254.169.254/latest/meta-data/")
        self.assert_rejected("http://[::1]/")
        self.assert_rejected("http://localhost/")


if __name__ == "__main__":
    unittest.main()
