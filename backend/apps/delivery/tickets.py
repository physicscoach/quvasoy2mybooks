"""HMAC-SHA256 imzolangan stateless tiket (reja 5.1).

Tiket bazada saqlanmaydi - imzo + amal muddati (`exp`) yetarli. Bekor qilish
kerak bolsa `user.token_version` oshiriladi (B ilova 0-bolim qarori).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass

from django.conf import settings


class TicketError(Exception):
    """Tiket yaroqsiz, muddati otgan yoki imzosi notogri."""


def _secret() -> bytes:
    return settings.SECRET_KEY.encode("utf-8")


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


@dataclass
class TicketPayload:
    user_id: int
    book_id: int
    file_id: int
    mode: str  # "read" | "download"
    exp: int
    jti: str
    token_version: int


def issue_ticket(user, book_id: int, file_id: int, mode: str) -> str:
    """`mode='read'` -> DELIVERY_TICKET_TTL_READ, `mode='download'` -> ..._DOWNLOAD."""
    ttl = settings.DELIVERY_TICKET_TTL_READ if mode == "read" else settings.DELIVERY_TICKET_TTL_DOWNLOAD
    payload = {
        "user_id": user.id,
        "book_id": book_id,
        "file_id": file_id,
        "mode": mode,
        "exp": int(time.time()) + ttl,
        "jti": uuid.uuid4().hex,
        "tv": user.token_version,
    }
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest()
    sig = _b64encode(signature)
    return f"{body}.{sig}"


def verify_ticket(token: str) -> TicketPayload:
    try:
        body, sig = token.split(".", 1)
    except ValueError as exc:
        raise TicketError("Tiket formati notogri.") from exc

    expected_sig = _b64encode(hmac.new(_secret(), body.encode("ascii"), hashlib.sha256).digest())
    if not hmac.compare_digest(sig, expected_sig):
        raise TicketError("Tiket imzosi notogri.")

    try:
        raw = json.loads(_b64decode(body))
    except (ValueError, UnicodeDecodeError) as exc:
        raise TicketError("Tiket buzilgan.") from exc

    if raw.get("exp", 0) < time.time():
        raise TicketError("Tiketning amal muddati tugagan.")

    return TicketPayload(
        user_id=raw["user_id"],
        book_id=raw["book_id"],
        file_id=raw["file_id"],
        mode=raw["mode"],
        exp=raw["exp"],
        jti=raw["jti"],
        token_version=raw.get("tv", 0),
    )
