"""Yuklab olish ruxsatini tekshiruvchi yagona funksiya - testlanadigan yadro."""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone

from .models import DownloadLog


@dataclass
class DownloadDecision:
    allowed: bool
    reason: str = ""


def _daily_limit_for(user) -> int:
    """Foydalanuvchi darajasiga qarab kunlik limit (reja 7.3 imtiyozlari).

    `Level.perks` jsonb'da `daily_download_limit` bolsa shu ustun turadi,
    aks holda `settings.DOWNLOAD_DAILY_LIMIT` ishlatiladi.
    """
    stats = getattr(user, "reader_stats", None)
    level = getattr(stats, "level", None) if stats else None
    if level and isinstance(level.perks, dict) and "daily_download_limit" in level.perks:
        return int(level.perks["daily_download_limit"])
    return settings.DOWNLOAD_DAILY_LIMIT


def can_download(user, file) -> DownloadDecision:
    """`book.is_downloadable AND file.is_downloadable` + kunlik limit tekshiradi.

    Faylning ozi bilan ishlamaydi (stream qilmaydi) - faqat qaror qaytaradi.
    """
    if not user or not user.is_authenticated:
        return DownloadDecision(False, "Avtorizatsiyadan otilmagan.")

    book = file.book
    if not (book.is_downloadable and file.is_downloadable):
        return DownloadDecision(False, "Bu fayl yuklab olish uchun ochiq emas.")

    if not file.is_ready:
        return DownloadDecision(False, "Fayl hali tayyor emas.")

    since = timezone.now() - timezone.timedelta(days=1)
    today_count = DownloadLog.objects.filter(
        user=user, created_at__gte=since, status=DownloadLog.Status.SUCCESS,
    ).count()

    limit = _daily_limit_for(user)
    if today_count >= limit:
        return DownloadDecision(False, f"Kunlik yuklab olish limiti ({limit}) tugagan.")

    return DownloadDecision(True)
