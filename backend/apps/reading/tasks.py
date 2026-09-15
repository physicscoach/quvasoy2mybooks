"""Fon vazifalari: telemetriyani validatsiya qilish va osilgan seanslarni yopish.

Django-q2 `Schedule` orqali chaqiriladi (admin panelda yoki
`Schedule.objects.create(func=..., schedule_type=Schedule.MINUTES, minutes=1)`):
- `flush_dirty_sessions` - har 60s
- `close_stale_sessions` - har 2 daqiqada
"""
from __future__ import annotations

import logging

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.core.events import emit

from .models import DailyActivity, ReadingPageCredit, ReadingProgress, ReadingSession
from .validation import check_daily_caps, evaluate_session, is_book_completed

logger = logging.getLogger(__name__)

R = settings.READING


def close_stale_sessions():
    """Heartbeat kelmay qolgan (osilib qolgan) seanslarni yopadi."""
    cutoff = timezone.now() - timezone.timedelta(seconds=R["SESSION_TIMEOUT_SEC"])
    stale = ReadingSession.objects.filter(ended_at__isnull=True, last_heartbeat_at__lt=cutoff)
    count = 0
    for session in stale:
        session.ended_at = session.last_heartbeat_at
        session.end_reason = ReadingSession.EndReason.TIMEOUT
        session.wall_seconds = int((session.ended_at - session.started_at).total_seconds())
        session.save(update_fields=["ended_at", "end_reason", "wall_seconds", "updated_at"])
        count += 1
    return {"closed": count}


def flush_dirty_sessions(batch_size: int = 100):
    """Yangi heartbeat kelgan seanslarni validatsiya qiladi, PageCredit yozadi,
    ReadingProgress/DailyActivity'ni yangilaydi va gamifikatsiya hodisalarini chiqaradi.
    """
    dirty = (
        ReadingSession.objects.filter(validation_state=ReadingSession.ValidationState.PENDING)
        .filter(heartbeat_count__gt=0)
        .order_by("last_heartbeat_at")[:batch_size]
    )

    processed = 0
    for session in dirty:
        try:
            _flush_one(session)
            processed += 1
        except Exception:  # noqa: BLE001 - bitta seans xatosi boshqalarni togxtatmasin
            logger.exception("Seansni validatsiya qilishda xato: %s", session.pk)

    return {"processed": processed}


@transaction.atomic
def _flush_one(session: ReadingSession):
    heartbeats = list(session.heartbeats.order_by("client_seq"))
    if not heartbeats:
        return

    result = evaluate_session(session, heartbeats)

    credited_seconds, credited_page_count = check_daily_caps(
        session.user, result.credited_active_seconds, len(result.credited_pages)
    )

    new_page_credits = []
    for page in sorted(result.credited_pages)[: credited_page_count or len(result.credited_pages)]:
        exists = ReadingPageCredit.objects.filter(user=session.user, book=session.book, page=page).exists()
        if not exists:
            new_page_credits.append(
                ReadingPageCredit(user=session.user, book=session.book, page=page, session=session)
            )
    ReadingPageCredit.objects.bulk_create(new_page_credits, ignore_conflicts=True)
    newly_credited_pages = len(new_page_credits)

    session.active_seconds = credited_seconds
    session.idle_seconds = result.idle_seconds
    session.wall_seconds = session.wall_seconds or int(
        (timezone.now() - session.started_at).total_seconds()
    )
    session.heartbeat_count = len(heartbeats)
    session.expected_heartbeats = max(session.wall_seconds // R["HEARTBEAT_INTERVAL_SEC"], 0)
    session.max_pages_per_minute = round(result.max_pages_per_minute, 3)
    session.avg_pages_per_minute = round(result.avg_pages_per_minute, 3)
    session.suspicion_score = min(result.suspicion_score, 100)
    session.suspicion_flags = result.suspicion_flags

    if session.suspicion_score >= 85:
        session.validation_state = ReadingSession.ValidationState.MANUAL_REVIEW
    elif session.ended_at is not None:
        session.validation_state = ReadingSession.ValidationState.VALID
        session.rejection_reason = None
    # aktiv seans hali "pending" holida qoladi - keyingi flush'da qayta baholanadi

    session.save()

    total_credited_pages = ReadingPageCredit.objects.filter(user=session.user, book=session.book).count()
    _update_progress_and_daily(session, credited_seconds, newly_credited_pages, total_credited_pages)


def _update_progress_and_daily(session: ReadingSession, credited_seconds: int, new_pages: int, total_pages: int):
    user, book = session.user, session.book
    progress, _ = ReadingProgress.objects.get_or_create(user=user, book=book)

    progress.max_page_reached = max(progress.max_page_reached, session.max_page or 0)
    progress.current_page = session.max_page or progress.current_page
    progress.total_active_seconds += credited_seconds
    progress.last_read_at = timezone.now()
    if book.page_count:
        progress.percent = min(round(progress.max_page_reached / book.page_count * 100, 2), 100)

    today = timezone.localdate()  # TODO: user.timezone bo'yicha aniqlash (v1)
    daily, _ = DailyActivity.objects.get_or_create(user=user, activity_date=today)
    daily.active_seconds += credited_seconds
    daily.pages_read += new_pages
    if credited_seconds > 0 and daily.sessions_count == 0:
        daily.sessions_count = 1
    daily.counts_for_streak = daily.active_seconds >= 20 * 60
    daily.save()

    # Streak DailyActivity'dan qayta hisoblanadi
    from apps.gamification.badges import update_streak
    update_streak(user)

    # --- Gamifikatsiya hodisalari: faqat emit() - ball bu yerda hisoblanmaydi ---
    if total_pages >= 3 and not _already_started(user, book):
        emit(user, "book_started", source="reading", book_id=book.id, idempotency_key=f"book:{book.id}:start:{user.id}")

    if new_pages > 0:
        emit(
            user, "pages_read", source="reading", book_id=book.id, pages=new_pages,
            idempotency_key=f"session:{session.public_id}:pages:{total_pages}",
        )

    if daily.counts_for_streak:
        emit(
            user, "daily_goal", source="reading",
            idempotency_key=f"streak:{user.id}:{today.isoformat()}",
        )

    valid_sessions = ReadingSession.objects.filter(
        user=user, book=book, validation_state=ReadingSession.ValidationState.VALID,
    ).count()

    if progress.completed_at is None and is_book_completed(progress, valid_sessions, book):
        progress.status = ReadingProgress.Status.COMPLETED
        progress.completed_at = timezone.now()
        progress.completion_awarded_at = timezone.now()
        emit(
            user, "book_completed", source="reading", book_id=book.id,
            idempotency_key=f"book:{book.id}:complete:{user.id}",
        )

    progress.save()


def _already_started(user, book) -> bool:
    from apps.gamification.models import PointTransaction

    return PointTransaction.objects.filter(
        user=user, book=book, reason_code="book_started",
    ).exists()
