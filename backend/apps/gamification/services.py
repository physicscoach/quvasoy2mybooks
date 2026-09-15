"""Gamifikatsiya biznes mantig'i - view/task bu yerga murojaat qiladi."""
from __future__ import annotations

from dataclasses import dataclass

from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.models import ReaderStats

from .models import GamificationRule, PointTransaction


@dataclass
class AwardResult:
    ok: bool
    transaction: PointTransaction | None = None
    reason: str = ""


def award_points(
    user,
    rule_code: str,
    idempotency_key: str,
    *,
    session=None,
    book=None,
    badge=None,
    description: str = "",
    points_override: int | None = None,
) -> AwardResult:
    """Ballni ledgerga yozadi.

    - `atomic()` + `select_for_update()` - poyga holatidan himoya.
    - `daily_cap_points` va `max_per_object` shu yerda tekshiriladi.
    - `IntegrityError` (masalan idempotency_key takrorlansa) - **muvaffaqiyat**
      deb qaytariladi: bu degani ball allaqachon berilgan, qayta urinish shart emas.
    """
    try:
        rule = GamificationRule.objects.get(code=rule_code, is_active=True)
    except GamificationRule.DoesNotExist:
        return AwardResult(False, reason=f"Qoida topilmadi yoki faol emas: {rule_code}")

    now = timezone.now()
    if rule.valid_from and now < rule.valid_from:
        return AwardResult(False, reason="Qoida hali amalga kirmagan.")
    if rule.valid_to and now > rule.valid_to:
        return AwardResult(False, reason="Qoidaning amal muddati tugagan.")

    try:
        with transaction.atomic():
            stats, _ = ReaderStats.objects.select_for_update().get_or_create(user=user)

            if rule.max_per_object is not None and book is not None:
                existing_count = PointTransaction.objects.select_for_update().filter(
                    user=user, rule=rule, book=book,
                ).count()
                if existing_count >= rule.max_per_object:
                    return AwardResult(False, reason="Bu obyekt uchun ball limiti tugagan.")

            if rule.daily_cap_points is not None and rule.points > 0:
                since = now.replace(hour=0, minute=0, second=0, microsecond=0)
                awarded_today = PointTransaction.objects.filter(
                    user=user, rule=rule, created_at__gte=since,
                ).aggregate(total=_sum_delta())["total"] or 0
                if awarded_today >= rule.daily_cap_points:
                    return AwardResult(False, reason="Kunlik ball chegarasi tugagan.")

            delta = points_override if points_override is not None else rule.points
            new_balance = stats.points_balance + delta
            new_lifetime = stats.points_lifetime + delta if delta > 0 else stats.points_lifetime
            if new_balance < 0:
                new_balance = 0

            txn = PointTransaction(
                user=user,
                rule=rule,
                delta=delta,
                balance_after=new_balance,
                reason_code=rule.code,
                description=description or rule.name,
                session=session,
                book=book,
                badge=badge,
                idempotency_key=idempotency_key,
            )
            txn._allow_save = True
            txn.save()

            stats.points_balance = new_balance
            stats.points_lifetime = new_lifetime
            stats.save(update_fields=["points_balance", "points_lifetime"])

            return AwardResult(True, transaction=txn)
    except IntegrityError:
        # idempotency_key UNIQUE - demak bu ball allaqachon berilgan. Xato emas.
        return AwardResult(True, reason="Allaqachon berilgan (idempotent).")


def _sum_delta():
    from django.db.models import Sum

    return Sum("delta")


def reverse_user_points(user, reason: str = "anti_cheat_reversal", description: str = "") -> int:
    """Foydalanuvchining barcha musbat ballarini bekor qiladi (anti-cheat).

    Ledger'dan qator o'chirilmaydi — manfiy korreksiya qatori qo'shiladi.
    Balansni 0 ga tushiradi. Qaytarilgan ball miqdorini qaytaradi.
    """
    from django.utils import timezone

    from apps.accounts.models import ReaderStats

    with transaction.atomic():
        stats = ReaderStats.objects.select_for_update().get(user=user)
        to_reverse = stats.points_balance
        if to_reverse <= 0:
            return 0
        txn = PointTransaction(
            user=user,
            delta=-to_reverse,
            balance_after=0,
            reason_code=reason,
            description=description or "Anti-cheat: ball bekor qilindi",
            idempotency_key=f"reversal:{user.id}:{timezone.now().timestamp()}",
        )
        txn._allow_save = True
        txn.save()
        stats.points_balance = 0
        # lifetime ham tushiriladi (reyting adolatli bo'lishi uchun)
        stats.points_lifetime = max(stats.points_lifetime - to_reverse, 0)
        stats.save(update_fields=["points_balance", "points_lifetime"])
    return to_reverse


class InsufficientPoints(Exception):
    pass


class OutOfStock(Exception):
    pass


def spend_points(user, reward):
    """Mukofot sotib oladi: balans va zaxira tekshiriladi (atomik).

    XP (points_lifetime) ga TEGMAYDI — faqat tanga (points_balance) sarflanadi,
    shuning uchun daraja/reyting tushmaydi.
    """
    from django.db.models import F

    from apps.accounts.models import ReaderStats

    from .models import Reward, RewardRedemption

    with transaction.atomic():
        stats = ReaderStats.objects.select_for_update().get(user=user)
        if stats.points_balance < reward.cost_points:
            raise InsufficientPoints("Tanga yetarli emas.")

        # zaxira (agar cheklangan bo'lsa) atomik kamaytiriladi
        if reward.stock is not None:
            updated = Reward.objects.filter(pk=reward.pk, stock__gt=0).update(stock=F("stock") - 1)
            if updated == 0:
                raise OutOfStock("Mukofot tugagan.")

        txn = PointTransaction(
            user=user,
            delta=-reward.cost_points,
            balance_after=stats.points_balance - reward.cost_points,
            reason_code="reward_redeem",
            description=f"Mukofot: {reward.name}",
            idempotency_key=f"redeem:{user.id}:{reward.id}:{timezone.now().timestamp()}",
        )
        txn._allow_save = True
        txn.save()

        stats.points_balance = F("points_balance") - reward.cost_points
        stats.save(update_fields=["points_balance"])

        redemption = RewardRedemption.objects.create(
            user=user, reward=reward, spent_points=reward.cost_points, transaction=txn,
        )
    return redemption
