"""Nishon berish va streak hisoblash (M12).

Nishonlar `criteria` (JSON) asosida avtomatik beriladi:
- books_completed: tugatilgan kitoblar soni
- streak_days: joriy yoki eng uzun streak
- distinct_categories: tugatilgan kitoblarning turli janrlari
- single_session_seconds: bitta seansdagi eng uzun faol vaqt
- night_reading: 00:00-05:00 oralig'ida o'qish
"""
from __future__ import annotations

from datetime import timedelta

from django.db import IntegrityError
from django.utils import timezone


def update_streak(user):
    """DailyActivity asosida current_streak va longest_streak ni yangilaydi."""
    from apps.accounts.models import ReaderStats
    from apps.reading.models import DailyActivity

    stats, _ = ReaderStats.objects.get_or_create(user=user)
    today = timezone.localdate()

    # streak uchun hisoblanadigan kunlar (counts_for_streak=True), sanaga qarab
    streak_dates = set(
        DailyActivity.objects.filter(user=user, counts_for_streak=True)
        .values_list("activity_date", flat=True)
    )
    if not streak_dates:
        stats.current_streak = 0
        stats.save(update_fields=["current_streak"])
        return 0

    # bugundan (yoki kechadan) orqaga ketma-ket kunlarni sanaymiz
    anchor = today if today in streak_dates else today - timedelta(days=1)
    current = 0
    cursor = anchor
    while cursor in streak_dates:
        current += 1
        cursor -= timedelta(days=1)

    stats.current_streak = current
    stats.longest_streak = max(stats.longest_streak, current)
    stats.last_activity_date = max(streak_dates)
    stats.save(update_fields=["current_streak", "longest_streak", "last_activity_date"])
    return current


def _metric(user, criteria_type: str) -> int:
    from apps.accounts.models import ReaderStats
    from apps.reading.models import ReadingProgress, ReadingSession

    if criteria_type == "books_completed":
        return ReadingProgress.objects.filter(user=user, status="completed").count()
    if criteria_type == "streak_days":
        stats = ReaderStats.objects.filter(user=user).first()
        return stats.longest_streak if stats else 0
    if criteria_type == "distinct_categories":
        completed = ReadingProgress.objects.filter(user=user, status="completed").values_list("book_id", flat=True)
        from apps.catalog.models import BookCategory
        return BookCategory.objects.filter(book_id__in=list(completed)).values("category_id").distinct().count()
    if criteria_type == "single_session_seconds":
        top = ReadingSession.objects.filter(user=user).order_by("-active_seconds").first()
        return top.active_seconds if top else 0
    if criteria_type == "night_reading":
        # 00:00-05:00 oralig'ida boshlangan seans bormi (1/0)
        return ReadingSession.objects.filter(user=user, started_at__hour__lt=5).exists() and 1 or 0
    return 0


def check_and_award_badges(user):
    """Foydalanuvchi qozongan yangi nishonlarni beradi. Idempotent (UNIQUE user+badge)."""
    from .models import Badge, UserBadge

    already = set(UserBadge.objects.filter(user=user).values_list("badge_id", flat=True))
    awarded = []
    for badge in Badge.objects.filter(is_active=True).exclude(id__in=already):
        crit = badge.criteria or {}
        ctype = crit.get("type")
        threshold = crit.get("threshold", 1)
        if not ctype:
            continue
        if _metric(user, ctype) >= threshold:
            try:
                UserBadge.objects.create(user=user, badge=badge)
                awarded.append(badge.code)
            except IntegrityError:
                pass  # poyga — allaqachon berilgan
    return awarded


def update_level(user):
    """XP (points_lifetime) ga qarab ReaderStats.level ni yangilaydi."""
    from apps.accounts.models import ReaderStats

    from .models import Level

    stats, _ = ReaderStats.objects.get_or_create(user=user)
    level = (
        Level.objects.filter(min_points__lte=stats.points_lifetime)
        .order_by("-min_points")
        .first()
    )
    if level and stats.level_id != level.id:
        stats.level = level
        stats.save(update_fields=["level"])
        return level.name
    return None


def update_challenges(user):
    """Faol challenge'lar bo'yicha foydalanuvchi progressini yangilaydi va bajarilsa ball beradi."""
    from django.utils import timezone

    from apps.reading.models import DailyActivity, ReadingProgress

    from .models import Challenge, UserChallengeProgress
    from .services import award_points

    today = timezone.localdate()
    active = Challenge.objects.filter(is_active=True, start_date__lte=today, end_date__gte=today)

    for ch in active:
        if ch.challenge_type == Challenge.ChallengeType.BOOKS_COMPLETED:
            current = ReadingProgress.objects.filter(
                user=user, status="completed", completed_at__date__gte=ch.start_date,
            ).count()
        elif ch.challenge_type == Challenge.ChallengeType.PAGES_READ:
            agg = DailyActivity.objects.filter(
                user=user, activity_date__gte=ch.start_date, activity_date__lte=ch.end_date,
            ).aggregate(total=__import__("django.db.models", fromlist=["Sum"]).Sum("pages_read"))
            current = agg["total"] or 0
        elif ch.challenge_type == Challenge.ChallengeType.STREAK_DAYS:
            from apps.accounts.models import ReaderStats
            rs = ReaderStats.objects.filter(user=user).first()
            current = rs.longest_streak if rs else 0
        else:
            continue

        prog, _ = UserChallengeProgress.objects.get_or_create(user=user, challenge=ch)
        prog.current = current
        if current >= ch.target and prog.completed_at is None:
            prog.completed_at = timezone.now()
            prog.awarded_at = timezone.now()
            prog.save(update_fields=["current", "completed_at", "awarded_at"])
            award_points(
                user, "challenge_completed", f"challenge:{ch.id}:{user.id}",
                description=f"Challenge: {ch.name}", points_override=ch.points_reward,
            )
        else:
            prog.save(update_fields=["current"])
