"""Domen app'lari gamifikatsiyaga to'g'ridan-to'g'ri bog'lanmasligi uchun yagona eshik.

Har qanday domen app'i (reading, catalog, delivery...) foydalanuvchi bajargan
harakatni gamifikatsiya tizimiga yetkazish uchun faqat shu funksiyani chaqiradi.
Bu funksiya `GamificationEvent` navbatiga qator yozadi, ballni o'zi hisoblamaydi —
hisoblash `apps.gamification.tasks.process_events()` da, fon vazifasida bo'ladi.
"""
from __future__ import annotations

from typing import Any


def emit(user, event_type: str, source: str | None = None, **payload: Any):
    """Gamifikatsiya navbatiga hodisa yozadi.

    Args:
        user: hodisa tegishli bo'lgan foydalanuvchi (accounts.User).
        event_type: masalan "book_started", "pages_read", "book_completed".
        source: hodisani chiqargan app nomi (masalan "reading").
        **payload: hodisaga oid qo'shimcha ma'lumot (JSON'ga serializatsiya qilinadi).
    """
    from apps.gamification.models import GamificationEvent

    return GamificationEvent.objects.create(
        user=user,
        event_type=event_type,
        source=source or "",
        payload=payload,
    )
