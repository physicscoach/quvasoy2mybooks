"""Kunlik anti-cheat skanerlash (reja 6.5, 8 signal). django-q2 bilan chaqiriladi."""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Avg, Count, StdDev
from django.utils import timezone


def scan_users(days: int = 7):
    """Oxirgi `days` kun ichida o'qigan har foydalanuvchini baholaydi."""
    from apps.accounts.models import User
    from apps.reading.models import ReadingSession

    from .models import SuspiciousActivity

    window_end = timezone.localdate()
    window_start = window_end - timedelta(days=days)
    since = timezone.now() - timedelta(days=days)

    active_user_ids = (
        ReadingSession.objects.filter(started_at__gte=since)
        .values_list("user_id", flat=True)
        .distinct()
    )

    flagged = 0
    for user in User.objects.filter(id__in=list(active_user_ids)):
        score, reasons = _risk_for(user, since)
        if score >= 60:
            SuspiciousActivity.objects.update_or_create(
                user=user, window_start=window_start, window_end=window_end,
                defaults={"risk_score": score, "reasons": reasons},
            )
            flagged += 1
    return {"scanned": len(active_user_ids), "flagged": flagged}


def _risk_for(user, since):
    from apps.reading.models import ReadingSession

    sessions = ReadingSession.objects.filter(user=user, started_at__gte=since)
    score = 0
    reasons = {}

    # 1. Seanslardagi shubha bayrog'lari yig'indisi (validation'dan)
    flagged_sessions = sessions.exclude(suspicion_flags={}).count()
    if flagged_sessions >= 3:
        score += 20
        reasons["flagged_sessions"] = flagged_sessions

    # 2. Bir kunda 2+ kitob "tugatilgan"
    from apps.reading.models import ReadingProgress

    completed_recent = ReadingProgress.objects.filter(
        user=user, completed_at__gte=since,
    ).count()
    if completed_recent >= 2:
        score += 20
        reasons["books_completed_fast"] = completed_recent

    # 3. Ko'p IP / User-Agent (akkaunt ulashish)
    distinct_ips = sessions.exclude(ip_address__isnull=True).values("ip_address").distinct().count()
    if distinct_ips >= 3:
        score += 15
        reasons["distinct_ips"] = distinct_ips

    # 4. SUPERSEDED (ko'p tab) seanslar
    superseded = sessions.filter(end_reason="new_session").count()
    if superseded >= 10:
        score += 10
        reasons["superseded_sessions"] = superseded

    # 5. Sahifa/daqiqa robotcha bir xilligi (past std)
    stats = sessions.filter(avg_pages_per_minute__isnull=False).aggregate(
        avg=Avg("avg_pages_per_minute"), sd=StdDev("avg_pages_per_minute"), n=Count("id"),
    )
    if stats["n"] and stats["n"] >= 5 and (stats["sd"] or 0) < 0.15:
        score += 30
        reasons["robotic_uniformity"] = float(stats["sd"] or 0)

    # 6. Yangi akkaunt lekin yuqori faollik
    from apps.accounts.models import ReaderStats

    rs = ReaderStats.objects.filter(user=user).first()
    account_age_days = (timezone.now() - user.date_joined).days
    if account_age_days < 7 and rs and rs.points_lifetime > 100:
        score += 20
        reasons["new_account_high_activity"] = rs.points_lifetime

    return min(score, 100), reasons
