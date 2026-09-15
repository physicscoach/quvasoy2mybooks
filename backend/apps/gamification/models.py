"""Gamifikatsiya: darajalar, qoidalar, ledger, nishonlar (B ilova 1.5)."""
import uuid

from django.conf import settings
from django.db import models
from apps.core.models import TimeStampedModel


class Level(models.Model):
    code = models.CharField("Kod", max_length=32, unique=True)
    name = models.CharField("Unvon", max_length=100)
    min_points = models.PositiveIntegerField("Minimal XP", unique=True)
    max_points = models.PositiveIntegerField("Maksimal XP", null=True, blank=True)
    icon = models.CharField("Ikonka", max_length=64, blank=True, default="")
    color = models.CharField("Rang", max_length=16, blank=True, default="")
    perks = models.JSONField("Imzolar (raqamli)", default=dict, blank=True)
    sort_order = models.SmallIntegerField("Tartib", default=0)

    class Meta:
        verbose_name = "Daraja"
        verbose_name_plural = "Darajalar"
        ordering = ["sort_order", "min_points"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(max_points__isnull=True) | models.Q(max_points__gt=models.F("min_points")),
                name="level_max_gt_min",
            ),
        ]

    def __str__(self):
        return self.name


class GamificationRule(models.Model):
    """Ball qoidalari - kodda hardcode emas, admin panelda ozgartiriladi."""

    code = models.CharField("Kod", max_length=48, unique=True)
    name = models.CharField("Nomi", max_length=150)
    description = models.TextField("Izoh", blank=True, default="")
    points = models.IntegerField("Ball (manfiy ham bolishi mumkin)")
    unit_seconds = models.PositiveIntegerField("Birlik, s", null=True, blank=True)
    daily_cap_points = models.PositiveIntegerField("Kunlik chegara", null=True, blank=True)
    cooldown_seconds = models.PositiveIntegerField("Sovish vaqti, s", null=True, blank=True)
    max_per_object = models.PositiveSmallIntegerField("Obyekt uchun maksimal marta", null=True, blank=True)
    is_active = models.BooleanField("Faolmi", default=True)
    valid_from = models.DateTimeField("Amal boshlanishi", null=True, blank=True)
    valid_to = models.DateTimeField("Amal tugashi", null=True, blank=True)
    version = models.PositiveIntegerField("Versiya", default=1)

    class Meta:
        verbose_name = "Gamifikatsiya qoidasi"
        verbose_name_plural = "Gamifikatsiya qoidalari"

    def __str__(self):
        return f"{self.code} ({self.points})"


class Badge(models.Model):
    class Category(models.TextChoices):
        READING = "reading", "Oqish"
        SOCIAL = "social", "Ijtimoiy"
        STREAK = "streak", "Streak"
        SPECIAL = "special", "Maxsus"

    class Tier(models.TextChoices):
        BRONZE = "bronze", "Bronza"
        SILVER = "silver", "Kumush"
        GOLD = "gold", "Oltin"

    code = models.CharField("Kod", max_length=48, unique=True)
    name = models.CharField("Nomi", max_length=150)
    description = models.TextField("Izoh", blank=True, default="")
    icon = models.CharField("Ikonka", max_length=64, blank=True, default="")
    category = models.CharField("Turkum", max_length=16, choices=Category.choices, default=Category.READING)
    tier = models.CharField("Daraja", max_length=16, choices=Tier.choices, default=Tier.BRONZE)
    criteria = models.JSONField("Shartlar", default=dict, blank=True)
    points_reward = models.PositiveIntegerField("Mukofot ball", default=0)
    is_active = models.BooleanField("Faolmi", default=True)
    is_secret = models.BooleanField("Yashirinmi", default=False)
    sort_order = models.SmallIntegerField("Tartib", default=0)

    class Meta:
        verbose_name = "Nishon"
        verbose_name_plural = "Nishonlar"
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class UserBadge(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="badges",
    )
    badge = models.ForeignKey(Badge, verbose_name="Nishon", on_delete=models.PROTECT, related_name="awarded_to")
    awarded_at = models.DateTimeField("Berilgan vaqti", auto_now_add=True)
    progress_snapshot = models.JSONField("Progress (snapshot)", default=dict, blank=True)
    points_awarded = models.PositiveIntegerField("Berilgan ball (snapshot)", default=0)

    class Meta:
        verbose_name = "Foydalanuvchi nishoni"
        verbose_name_plural = "Foydalanuvchi nishonlari"
        constraints = [
            models.UniqueConstraint(fields=["user", "badge"], name="uniq_user_badge"),
        ]
        indexes = [
            models.Index(fields=["user", "-awarded_at"], name="ub_user_awarded_idx"),
        ]


class GamificationEvent(models.Model):
    """Domen app'laridan `core.events.emit()` orqali kelgan xom hodisalar navbati."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        PROCESSED = "processed", "Ishlangan"
        FAILED = "failed", "Xatolik"
        SKIPPED = "skipped", "Otkazib yuborildi"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="gamification_events",
    )
    event_type = models.CharField("Hodisa turi", max_length=48, db_index=True)
    source = models.CharField("Manba app", max_length=32, blank=True, default="")
    payload = models.JSONField("Malumot", default=dict, blank=True)
    status = models.CharField("Holati", max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    error = models.TextField("Xatolik matni", blank=True, default="")
    created_at = models.DateTimeField("Yaratilgan vaqti", auto_now_add=True)
    processed_at = models.DateTimeField("Ishlangan vaqti", null=True, blank=True)

    class Meta:
        verbose_name = "Gamifikatsiya hodisasi"
        verbose_name_plural = "Gamifikatsiya hodisalari"
        indexes = [
            models.Index(fields=["status", "created_at"], name="ge_status_created_idx"),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.user}"


class PointTransaction(models.Model):
    """Append-only ledger - haqiqat manbai. `updated_at` yoq - ozgarmas."""

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.PROTECT, related_name="point_transactions",
    )
    rule = models.ForeignKey(
        GamificationRule, verbose_name="Qoida", on_delete=models.PROTECT,
        null=True, blank=True, related_name="transactions",
    )
    delta = models.IntegerField("Ozgarish (+/-)")
    balance_after = models.PositiveIntegerField("Balans (keyin)")
    reason_code = models.CharField("Sabab kodi (snapshot)", max_length=48)
    description = models.CharField("Izoh (snapshot)", max_length=255, blank=True, default="")

    session = models.ForeignKey(
        "reading.ReadingSession", verbose_name="Sessiya", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="point_transactions",
    )
    book = models.ForeignKey(
        "catalog.Book", verbose_name="Kitob", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )
    badge = models.ForeignKey(
        Badge, verbose_name="Nishon", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="+",
    )

    idempotency_key = models.CharField("Idempotentlik kaliti", max_length=160, unique=True)
    reverses = models.ForeignKey(
        "self", verbose_name="Qaytariladigan tranzaksiya", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reversed_by",
    )
    created_at = models.DateTimeField("Yaratilgan vaqti", auto_now_add=True)

    class Meta:
        verbose_name = "Ball tranzaksiyasi"
        verbose_name_plural = "Ball tranzaksiyalari"
        constraints = [
            models.CheckConstraint(check=~models.Q(delta=0), name="pt_delta_not_zero"),
            models.CheckConstraint(check=models.Q(balance_after__gte=0), name="pt_balance_gte_0"),
        ]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="pt_user_created_idx"),
        ]

    def __str__(self):
        return f"{self.user} {self.delta:+d} ({self.reason_code})"

    def save(self, *args, **kwargs):
        """Ledger faqat `services.award_points()` orqali yoziladi.

        Servis konteksti - `self._allow_save` bayrogi - `award_points` ichida
        `atomic()` blokida oshkora ornatiladi. Boshqa joydan `PointTransaction()
        .save()` chaqirilsa - bu xato, chunki balans va idempotentlik nazorati
        chetlab otiladi.
        """
        if not getattr(self, "_allow_save", False):
            raise RuntimeError(
                "PointTransaction faqat apps.gamification.services.award_points() "
                "orqali yoziladi - togridan-togri save() chaqirilmasin."
            )
        super().save(*args, **kwargs)


class Reward(TimeStampedModel):
    """Mukofot do'koni buyumi — ballga (tanga) almashtiriladi. Hammasi raqamli."""

    class RewardType(models.TextChoices):
        FRAME = "frame", "Profil ramkasi"
        TITLE = "title", "Unvon"
        CERTIFICATE = "certificate", "Sertifikat"
        DOWNLOAD_BOOST = "download_boost", "Yuklash limiti +"
        OTHER = "other", "Boshqa"

    code = models.CharField("Kod", max_length=48, unique=True)
    name = models.CharField("Nomi", max_length=150)
    description = models.TextField("Tavsif", blank=True, default="")
    icon = models.CharField("Ikonka", max_length=16, blank=True, default="")
    reward_type = models.CharField("Turi", max_length=20, choices=RewardType.choices, default=RewardType.OTHER)
    cost_points = models.PositiveIntegerField("Narxi (tanga)")
    stock = models.IntegerField("Zaxira (NULL=cheksiz)", null=True, blank=True)
    is_active = models.BooleanField("Faolmi", default=True)
    sort_order = models.SmallIntegerField("Tartib", default=0)

    class Meta:
        verbose_name = "Mukofot"
        verbose_name_plural = "Mukofotlar"
        ordering = ["sort_order", "cost_points"]
        constraints = [
            models.CheckConstraint(check=models.Q(cost_points__gt=0), name="reward_cost_positive"),
            models.CheckConstraint(check=models.Q(stock__isnull=True) | models.Q(stock__gte=0), name="reward_stock_nonneg"),
        ]

    def __str__(self):
        return f"{self.name} ({self.cost_points})"


class RewardRedemption(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        FULFILLED = "fulfilled", "Bajarildi"
        CANCELLED = "cancelled", "Bekor qilindi"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="redemptions",
    )
    reward = models.ForeignKey(Reward, verbose_name="Mukofot", on_delete=models.PROTECT, related_name="redemptions")
    spent_points = models.PositiveIntegerField("Sarflangan tanga")
    status = models.CharField("Holati", max_length=16, choices=Status.choices, default=Status.PENDING)
    transaction = models.ForeignKey(
        "gamification.PointTransaction", verbose_name="Tranzaksiya",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    class Meta:
        verbose_name = "Mukofot xaridi"
        verbose_name_plural = "Mukofot xaridlari"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} — {self.reward}"


class Challenge(TimeStampedModel):
    """Vaqtli maqsad: masalan 'oyda 5 kitob o'qing'. Bajarilsa ball beriladi."""

    class ChallengeType(models.TextChoices):
        BOOKS_COMPLETED = "books_completed", "Kitob tugatish"
        PAGES_READ = "pages_read", "Sahifa o'qish"
        STREAK_DAYS = "streak_days", "Ketma-ket kunlar"

    code = models.CharField("Kod", max_length=48, unique=True)
    name = models.CharField("Nomi", max_length=150)
    description = models.TextField("Tavsif", blank=True, default="")
    icon = models.CharField("Ikonka", max_length=16, blank=True, default="")
    challenge_type = models.CharField("Turi", max_length=20, choices=ChallengeType.choices)
    target = models.PositiveIntegerField("Maqsad (son)")
    points_reward = models.PositiveIntegerField("Mukofot ball")
    start_date = models.DateField("Boshlanish sanasi")
    end_date = models.DateField("Tugash sanasi")
    is_active = models.BooleanField("Faolmi", default=True)

    class Meta:
        verbose_name = "Challenge"
        verbose_name_plural = "Challenge'lar"
        ordering = ["-start_date"]
        constraints = [
            models.CheckConstraint(check=models.Q(end_date__gte=models.F("start_date")), name="challenge_dates_valid"),
            models.CheckConstraint(check=models.Q(target__gt=0), name="challenge_target_positive"),
        ]

    def __str__(self):
        return self.name


class UserChallengeProgress(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="challenge_progress",
    )
    challenge = models.ForeignKey(Challenge, verbose_name="Challenge", on_delete=models.CASCADE, related_name="participants")
    current = models.PositiveIntegerField("Joriy natija", default=0)
    completed_at = models.DateTimeField("Bajarilgan vaqti", null=True, blank=True)
    awarded_at = models.DateTimeField("Ball berilgan vaqti", null=True, blank=True)

    class Meta:
        verbose_name = "Challenge natijasi"
        verbose_name_plural = "Challenge natijalari"
        constraints = [
            models.UniqueConstraint(fields=["user", "challenge"], name="uniq_user_challenge"),
        ]

    def __str__(self):
        return f"{self.user} — {self.challenge} ({self.current})"
