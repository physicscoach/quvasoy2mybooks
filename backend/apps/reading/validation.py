"""Server tomonidagi anti-cheat tekshiruvlari (reja 6.3, 11 ta qoida).

Muhim tamoyil: **server mijoz aytgan vaqtga hech qachon ishonmaydi.**
Bu modul faqat hisoblaydi va bayroq qoyadi - yozishni chaqiruvchi
(`apps.reading.tasks.flush_dirty_sessions`) bajaradi.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from django.conf import settings
from django.utils import timezone

R = settings.READING


@dataclass
class CreditResult:
    """Bitta seans uchun validatsiya natijasi."""

    credited_active_seconds: int = 0
    idle_seconds: int = 0
    credited_pages: set = field(default_factory=set)
    max_pages_per_minute: float = 0.0
    avg_pages_per_minute: float = 0.0
    suspicion_score: int = 0
    suspicion_flags: dict = field(default_factory=dict)
    consecutive_idle_windows: int = 0


def _page_dwell_threshold(book) -> int:
    """PDF - 20s sobit; EPUB - sozga qarab (word_count bolsa, aks holda default)."""
    if book.word_count:
        # taxminan 200 soz/daqiqa oqish tezligi -> sahifadagi minimal vaqt
        words_per_page = max(book.word_count // max(book.page_count, 1), 1)
        return max(int(words_per_page / 200 * 60 * 0.5), R["MIN_PAGE_DWELL_SEC"])
    return R["MIN_PAGE_DWELL_SEC"]


def evaluate_session(session, heartbeats) -> CreditResult:
    """`heartbeats` - `client_seq` bo'yicha o'sish tartibida, seansga tegishli.

    Har heartbeat oraliq [oldingi_ts, joriy_ts] uchun qancha vaqt "kreditlanadi"ni
    hisoblaydi va sahifa bo'yicha minimal dwell vaqti to'lganda shu sahifani
    kreditlangan deb belgilaydi.
    """
    result = CreditResult()
    dwell_threshold = _page_dwell_threshold(session.book)
    interval = R["HEARTBEAT_INTERVAL_SEC"]

    page_time_accum: dict[int, int] = {}
    prev_server_ts = session.started_at
    prev_seq = None
    idle_streak = 0
    total_minutes = 0.0
    pages_per_minute_samples = []

    for hb in heartbeats:
        # 10. seq qatiy osishi - tartibsiz/takror paket otkazib yuboriladi
        if prev_seq is not None and hb.client_seq <= prev_seq:
            continue
        prev_seq = hb.client_seq

        server_gap = (hb.server_ts - prev_server_ts).total_seconds()
        prev_server_ts = hb.server_ts

        # 2. uzun bo'shliq -> 0 kredit
        if server_gap > interval * 3:
            result.suspicion_flags["long_gap"] = True
            idle_streak += 1
            if idle_streak >= 2:
                result.suspicion_flags["idle_after_gap"] = True
            continue

        # 1. credited = min(visible*, focused, interaction, server_gap, interval*1.5)
        visible = hb.active_seconds if (hb.viewport_pct or 0) > 0 else 0
        focused = hb.active_seconds if hb.is_focused else 0
        interaction = hb.active_seconds if hb.scroll_delta or hb.is_focused else 0
        candidates = [visible or hb.active_seconds, focused, interaction, max(server_gap, 0), interval * 1.5]
        credited = max(min(candidates), 0)
        credited = int(min(credited, interval * 1.5))

        # 7. ketma-ket 2 ta harakatsiz oyna -> 0 kredit
        if credited == 0:
            idle_streak += 1
            result.idle_seconds += hb.active_seconds
            if idle_streak >= 2:
                result.suspicion_flags["idle_streak"] = True
            continue
        idle_streak = 0

        result.credited_active_seconds += credited
        page_time_accum[hb.page] = page_time_accum.get(hb.page, 0) + credited

        total_minutes += credited / 60
        if total_minutes > 0:
            pages_per_minute_samples.append(len(page_time_accum) / max(total_minutes, 1e-6))

    # 3. sahifada minimal vaqt - shundan keyingina sahifa "kreditlangan" hisoblanadi
    # 6. sahifa sakrashi - oraliq sahifalar page_time_accum'da yoq bolgani uchun
    #    ular avtomatik hisobga olinmaydi (faqat heartbeat kelgan sahifalar bor)
    for page, seconds in page_time_accum.items():
        if seconds >= dwell_threshold:
            result.credited_pages.add(page)

    if pages_per_minute_samples:
        result.max_pages_per_minute = max(pages_per_minute_samples)
        result.avg_pages_per_minute = sum(pages_per_minute_samples) / len(pages_per_minute_samples)

    # 4. soatiga max sahifa
    wall_hours = max((timezone.now() - session.started_at).total_seconds() / 3600, 1 / 3600)
    pages_per_hour = len(result.credited_pages) / wall_hours
    if pages_per_hour > R["MAX_PAGES_PER_HOUR"]:
        result.suspicion_score += 30
        result.suspicion_flags["too_fast_pages_per_hour"] = pages_per_hour

    # 8. real tezlik kitob uzunligiga taqqoslash (faqat bayroq)
    if result.max_pages_per_minute and result.max_pages_per_minute > 5:
        result.suspicion_score += 20
        result.suspicion_flags["fast_pages"] = True

    # 11. IP/qurilma ozgarishi - faqat bayroq, view darajasida solishtiriladi

    return result


def check_daily_caps(user, extra_seconds: int, extra_pages: int) -> tuple[int, int]:
    """9. Kuniga max 6 soat / 400 sahifa - limitdan oshgan qismini kesib tashlaydi."""
    from .models import DailyActivity

    today = timezone.localdate()
    today_activity = DailyActivity.objects.filter(user=user, activity_date=today).first()
    used_seconds = today_activity.active_seconds if today_activity else 0
    used_pages = today_activity.pages_read if today_activity else 0

    allowed_seconds = max(R["MAX_DAILY_CREDITED_SEC"] - used_seconds, 0)
    allowed_pages = max(R["MAX_DAILY_PAGES"] - used_pages, 0)

    return min(extra_seconds, allowed_seconds), min(extra_pages, allowed_pages)


def detect_device_change(session, request_ip: str | None, request_fingerprint: str | None) -> bool:
    """11. IP/qurilma ozgarsa - flag (bloklamaydi)."""
    if session.ip_address and request_ip and session.ip_address != request_ip:
        return True
    if session.device_fingerprint and request_fingerprint and session.device_fingerprint != request_fingerprint:
        return True
    return False


def is_book_completed(progress, session_count_valid: int, book) -> bool:
    """6.4: uch shart birga - >=95% sahifa, kamida 2 alohida seans, vaqt mos."""
    if book.page_count <= 0:
        return False
    percent = (progress.max_page_reached / book.page_count) * 100
    if percent < R["COMPLETION_MIN_PCT"]:
        return False
    if session_count_valid < R["COMPLETION_MIN_SESSIONS"]:
        return False
    min_seconds = book.min_reading_seconds or (book.page_count * 15)
    if progress.total_active_seconds < min_seconds * 0.5:
        return False
    return True
