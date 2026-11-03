"""Conservative public-page text extraction.

Every hop is validated: HTTP(S) on standard ports only, every DNS answer must be a public
address, and the socket connects to the vetted IP (TLS still verifies the hostname). This is
defense in depth; production deployments must also block private ranges at the network layer.
"""

import codecs
import http.client
import ipaddress
import re
import socket
import ssl
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

from .chunking import normalize
from .errors import RagError
from .limits import FETCH_TIMEOUT_SECONDS, MAX_PAGE_BYTES, MAX_REDIRECTS, MAX_SOURCE_CHARS, MIN_SOURCE_CHARS

# Never readable text.
CODE_TAGS = {"script", "style", "noscript", "template", "svg", "iframe", "canvas"}
# Page chrome; dropped only while enough article text remains. <form> is deliberately absent:
# some frameworks wrap the entire page in a single form.
CHROME_TAGS = CODE_TAGS | {"nav", "footer", "header", "aside", "select", "button", "textarea"}
# NAT64 prefixes embed an IPv4 destination in their low 32 bits.
NAT64 = (ipaddress.ip_network("64:ff9b::/96"), ipaddress.ip_network("64:ff9b:1::/48"))
REDIRECTS = {301, 302, 303, 307, 308}


def is_public_address(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address):
        if ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        elif any(ip in net for net in NAT64):
            ip = ipaddress.IPv4Address(int(ip) & 0xFFFFFFFF)
    return ip.is_global and not ip.is_multicast


class _TextParser(HTMLParser):
    def __init__(self, blocked: set[str]) -> None:
        super().__init__(convert_charrefs=True)
        self.blocked = blocked
        self.depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in self.blocked:
            self.depth += 1

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in self.blocked and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    """Drops page chrome; if that leaves too little text (e.g. an unclosed <header>), keeps all but code."""
    text = ""
    for blocked in (CHROME_TAGS, CODE_TAGS):
        parser = _TextParser(blocked)
        parser.feed(html)
        parser.close()
        text = normalize(" ".join(parser.parts))
        if len(text) >= MIN_SOURCE_CHARS:
            break
    return text


def charset_of(content_type: str | None) -> str:
    match = re.search(r"charset=[\"']?([\w.:-]+)", content_type or "", re.I)
    if match:
        try:
            return codecs.lookup(match.group(1)).name
        except LookupError:
            pass
    return "utf-8"


def _validated_target(url: str) -> tuple:
    try:
        parts = urlsplit(url)
        default_port = 443 if parts.scheme == "https" else 80
        port = parts.port or default_port
        if (
            parts.scheme not in ("http", "https")
            or not parts.hostname
            or parts.username is not None
            or parts.password is not None
            or port != default_port
        ):
            raise ValueError
        host = parts.hostname.encode("idna").decode("ascii")
    except (ValueError, UnicodeError):
        raise RagError(400, "Only public http(s) pages on standard ports can be read.") from None
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)}
    except OSError:
        raise RagError(422, "The source's address could not be resolved. Try pasting its text instead.") from None
    if not addresses or not all(is_public_address(a) for a in addresses):
        raise RagError(400, "Private or reserved network addresses cannot be read.")
    return parts, host, port, sorted(addresses)[0]


def fetch_public_text(source_url: str) -> str:
    current = source_url
    for _ in range(MAX_REDIRECTS + 1):
        parts, host, port, address = _validated_target(current)
        connection = http.client.HTTPConnection(host, port, timeout=FETCH_TIMEOUT_SECONDS)
        try:
            sock = socket.create_connection((address, port), timeout=FETCH_TIMEOUT_SECONDS)
            if parts.scheme == "https":
                sock = ssl.create_default_context().wrap_socket(sock, server_hostname=host)
            connection.sock = sock
            path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
            connection.request(
                "GET",
                path,
                headers={
                    "Host": host,
                    "Accept": "text/html,text/plain;q=0.9",
                    "Accept-Encoding": "identity",
                    "User-Agent": "BrainSpaceIndexer/2.0 (+read-only)",
                },
            )
            response = connection.getresponse()
            location = response.getheader("Location")
            if response.status in REDIRECTS and location:
                current = urljoin(current, location)
                continue
            if not 200 <= response.status < 300:
                raise RagError(422, "The page isn't publicly accessible. Try pasting its text instead.")
            content_type = response.getheader("Content-Type") or ""
            media_type = content_type.split(";", 1)[0].strip().lower()
            if media_type not in ("text/html", "text/plain"):
                raise RagError(422, "Only HTML and plain-text pages can be read. Paste the document or transcript text instead.")
            body = response.read(MAX_PAGE_BYTES + 1)
            if len(body) > MAX_PAGE_BYTES:
                raise RagError(422, "The page is too large. Try pasting the relevant text instead.")
        except RagError:
            raise
        except (OSError, http.client.HTTPException, ValueError):
            raise RagError(422, "The page couldn't be read safely. Try pasting its text instead.") from None
        finally:
            connection.close()
        text = body.decode(charset_of(content_type), errors="replace")
        text = html_to_text(text) if media_type == "text/html" else normalize(text)
        return text[:MAX_SOURCE_CHARS]
    raise RagError(422, "The page redirected too many times.")
