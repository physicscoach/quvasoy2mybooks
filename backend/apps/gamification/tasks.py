"""GamificationEvent navbatini ishlaydigan fon vazifasi (django-q2, ~60s)."""
from __future__ import annotations

import logging

from django.utils import timezone

from .models import GamificationEvent
from .services import award_points

logger = logging.getLogger(__name__)


def process_events(batch_size: int = 200):
    """Kutilayotgan hodisalarni ballga aylantiradi.

    Har `event_type` uchun mos `GamificationRule.code` bilan bir xil deb
    faraz qilinadi (masalan "book_started" -> qoida kodi "book_started").
    Murakkabroq xolatlar (streak, daily_goal) alohida ishlanadi.
    """
    events = GamificationEvent.objects.filter(status=GamificationEvent.Status.PENDING).order_by("created_at")[:batch_size]
    processed, failed = 0, 0

    for event in events:
        try:
            _process_one(event)
            event.status = GamificationEvent.Status.PROCESSED
            event.processed_at = timezone.now()
            event.save(update_fields=["status", "processed_at"])
            processed += 1
        except Exception as exc:  # noqa: BLE001
            logger.exception("Gamifikatsiya hodisasini ishlashda xato: %s", exc)
            event.status = GamificationEvent.Status.FAILED
            event.error = str(exc)
            event.processed_at = timezone.now()
            event.save(update_fields=["status", "error", "processed_at"])
            failed += 1

    return {"processed": processed, "failed": failed}


def _process_one(event: GamificationEvent):
    payload = event.payload or {}
    book_id = payload.get("book_id")
    session_id = payload.get("session_id")

    book = None
    if book_id:
        from apps.catalog.models import Book

        book = Book.objects.filter(pk=book_id).first()

    session = None
    if session_id:
        from apps.reading.models import ReadingSession

        session = ReadingSession.objects.filter(pk=session_id).first()

    idempotency_key = payload.get("idempotency_key") or f"event:{event.pk}"

    award_points(
        event.user,
        rule_code=event.event_type,
        idempotency_key=idempotency_key,
        session=session,
        book=book,
        description=payload.get("description", ""),
    )
