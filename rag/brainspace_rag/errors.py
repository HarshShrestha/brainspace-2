"""Errors whose message is safe to show to end users."""


class RagError(Exception):
    """An expected failure carrying an HTTP-like status code for the API to relay."""

    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
