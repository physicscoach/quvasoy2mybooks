"""O'qish telemetriyasi - loyihaning yadrosi (reja 6-bolim, B ilova 1.4)."""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class ReadingSession(TimeStampedModel):
    """Bitta uzluksiz oqish seansi. Bir vaqtda foydalanuvchida faqat bitta aktiv."""

    class EndReason(models.TextChoices):
        MANUAL = "manual", "Ozi yopdi"
        TIMEOUT = "timeout", "Vaqt tugadi (harakatsizlik)"
        NEW_SESSION = "new_session", "Yangi seans ochildi"
        LOGOUT = "logout", "Tizimdan chiqdi"

    class ValidationState(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        VALID = "valid", "Tasdiqlangan"
        REJECTED = "rejected", "Rad etilgan"
        MANUAL_REVIEW = "manual_review", "Kolda korib chiqish"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="reading_sessions",
    )
    book = models.ForeignKey(
        "catalog.Book", verbose_name="Kitob",
        on_delete=models.PROTECT, related_name="reading_sessions",
    )
    book_file = models.ForeignKey(
        "catalog.BookFile", verbose_name="Fayl",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    started_at = models.DateTimeField("Boshlangan vaqti", auto_now_add=True)
    ended_at = models.DateTimeField("Tugagan vaqti (NULL=aktiv)", null=True, blank=True)
    last_heartbeat_at = models.DateTimeField("Oxirgi heartbeat vaqti", auto_now_add=True)
    end_reason = models.CharField("Tugash sababi", max_length=16, choices=EndReason.choices, null=True, blank=True)

    start_page = models.PositiveIntegerField("Boshlangan sahifa", default=0)
    end_page = models.PositiveIntegerField("Tugagan sahifa", null=True, blank=True)
    max_page = models.PositiveIntegerField("Eng uzoq borgan sahifa", null=True, blank=True)
    pages_advanced = models.PositiveIntegerField("Yangi sahifalar soni", default=0)
    start_locator = models.CharField("Boshlangan locator (EPUB CFI)", max_length=255, blank=True, default="")
    end_locator = models.CharField("Tugagan locator", max_length=255, blank=True, default="")

    active_seconds = models.PositiveIntegerField("Faol soniyalar", default=0)
    idle_seconds = models.PositiveIntegerField("Harakatsiz soniyalar", default=0)
    wall_seconds = models.PositiveIntegerField("Devor vaqti, s", default=0)
    focus_ratio = models.DecimalField("Fokus nisbati", max_digits=4, decimal_places=3, default=0)
    heartbeat_count = models.PositiveIntegerField("Heartbeatlar soni", default=0)
    expected_heartbeats = models.PositiveIntegerField("Kutilgan heartbeatlar", default=0)
    avg_pages_per_minute = models.DecimalField("Ortacha sahifa/daqiqa", max_digits=6, decimal_places=3, null=True, blank=True)
    max_pages_per_minute = models.DecimalField("Maksimal sahifa/daqiqa", max_digits=6, decimal_places=3, null=True, blank=True)

    validation_state = models.CharField(
        "Validatsiya holati", max_length=16, choices=ValidationState.choices, default=ValidationState.PENDING,
    )
    rejection_reason = models.CharField("Rad etish sababi", max_length=32, null=True, blank=True)
    suspicion_score = models.SmallIntegerField("Shubha bali (0-100)", default=0)
    suspicion_flags = models.JSONField("Shubha belgilari", default=dict, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Kim korib chiqdi",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    reviewed_at = models.DateTimeField("Korib chiqilgan vaqti", null=True, blank=True)

    points_awarded = models.PositiveIntegerField("Berilgan ball (snapshot)", default=0)
    points_awarded_at = models.DateTimeField("Ball berilgan vaqti", null=True, blank=True)

    device_type = models.CharField("Qurilma turi", max_length=16, blank=True, default="")
    device_fingerprint = models.CharField("Qurilma izi", max_length=64, blank=True, default="")
    user_agent = models.CharField("User-Agent", max_length=400, blank=True, default="")
    ip_address = models.GenericIPAddressField("IP manzil", null=True, blank=True)

    class Meta:
        verbose_name = "Oqish seansi"
        verbose_name_plural = "Oqish seanslari"
        constraints = [
            models.UniqueConstraint(
                fields=["user"], condition=models.Q(ended_at__isnull=True), name="uniq_active_session_per_user",
            ),
            models.CheckConstraint(
                check=models.Q(points_awarded=0) | models.Q(validation_state="valid"),
                name="rs_points_only_if_valid",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "-started_at"], name="rsess_user_started_idx"),
            models.Index(fields=["book", "-started_at"], name="rsess_book_started_idx"),
        ]

    def __str__(self):
        return f"{self.user} - {self.book} ({self.started_at:%Y-%m-%d %H:%M})"

    @property
    def is_active(self):
        return self.ended_at is None


class ReadingHeartbeat(models.Model):
    """Xom telemetriya - append-only, 90 kun saqlanadi (retention - alohida job)."""

    session = models.ForeignKey(
        ReadingSession, verbose_name="Seans", on_delete=models.CASCADE,
        related_name="heartbeats", db_index=False,
    )
    client_seq = models.PositiveIntegerField("Client ketma-ketlik raqami")
    client_ts = models.DateTimeField("Client vaqti")
    server_ts = models.DateTimeField("Server vaqti", auto_now_add=True)
    page = models.PositiveIntegerField("Sahifa")
    locator = models.CharField("Locator (EPUB CFI)", max_length=255, blank=True, default="")
    active_seconds = models.SmallIntegerField("Faol soniyalar")
    is_focused = models.BooleanField("Fokusdami")
    scroll_delta = models.IntegerField("Scroll ozgarishi", default=0)
    viewport_pct = models.SmallIntegerField("Ko'ringan foiz", null=True, blank=True)

    class Meta:
        verbose_name = "Xom heartbeat"
        verbose_name_plural = "Xom heartbeatlar"
        constraints = [
            models.UniqueConstraint(fields=["session", "client_seq"], name="uniq_session_client_seq"),
            models.CheckConstraint(
                check=models.Q(active_seconds__gte=0) & models.Q(active_seconds__lte=120),
                name="hb_active_seconds_range",
            ),
        ]

    def __str__(self):
        return f"HB session={self.session_id} seq={self.client_seq}"


class ReadingPageCredit(models.Model):
    """Bitta foydalanuvchi - kitob - sahifa uchun bir marta kreditlanadi.

    Anti-cheat: bir xil sahifani qayta oqib qayta ball olib bolmaydi.
    B-ilovada mustaqil jadval sifatida yoq, lekin task talabiga kora
    ikki karra kredit berishning oldini olish uchun kerak.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="page_credits", verbose_name="Foydalanuvchi")
    book = models.ForeignKey("catalog.Book", on_delete=models.CASCADE, related_name="page_credits", verbose_name="Kitob")
    page = models.PositiveIntegerField("Sahifa")
    session = models.ForeignKey(ReadingSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="page_credits", verbose_name="Seans")
    credited_at = models.DateTimeField("Kreditlangan vaqti", auto_now_add=True)

    class Meta:
        verbose_name = "Sahifa krediti"
        verbose_name_plural = "Sahifa kreditlari"
        constraints = [
            models.UniqueConstraint(fields=["user", "book", "page"], name="uniq_user_book_page_credit"),
        ]
        indexes = [
            models.Index(fields=["user", "book"], name="pc_user_book_idx"),
        ]


class ReadingProgress(TimeStampedModel):
    class Status(models.TextChoices):
        WANT_TO_READ = "want_to_read", "Oqimoqchi"
        READING = "reading", "Oqilmoqda"
        COMPLETED = "completed", "Tugatilgan"
        ABANDONED = "abandoned", "Tashlab qoyilgan"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reading_progress", verbose_name="Foydalanuvchi")
    book = models.ForeignKey("catalog.Book", on_delete=models.CASCADE, related_name="progress_entries", verbose_name="Kitob")
    status = models.CharField("Holati", max_length=16, choices=Status.choices, default=Status.WANT_TO_READ)
    current_page = models.PositiveIntegerField("Joriy sahifa", default=0)
    max_page_reached = models.PositiveIntegerField("Eng uzoq borilgan sahifa", default=0)
    current_locator = models.CharField("Joriy locator", max_length=255, blank=True, default="")
    percent = models.DecimalField("Foiz (kesh)", max_digits=5, decimal_places=2, default=0)
    total_active_seconds = models.PositiveIntegerField("Umumiy faol vaqt (kesh)", default=0)
    sessions_count = models.PositiveIntegerField("Seanslar soni (kesh)", default=0)
    started_at = models.DateTimeField("Boshlangan vaqti", null=True, blank=True)
    last_read_at = models.DateTimeField("Oxirgi oqilgan vaqti", null=True, blank=True)
    completed_at = models.DateTimeField("Tugatilgan vaqti", null=True, blank=True)
    completion_awarded_at = models.DateTimeField("Tugatish balli berilgan vaqti", null=True, blank=True)
    is_favorite = models.BooleanField("Sevimli", default=False)

    class Meta:
        verbose_name = "Oqish jarayoni"
        verbose_name_plural = "Oqish jarayonlari"
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="uniq_progress_user_book"),
        ]
        indexes = [
            models.Index(fields=["user", "status", "-last_read_at"], name="rp_user_status_lastread_idx"),
        ]

    def __str__(self):
        return f"{self.user} - {self.book} ({self.status})"


class DailyActivity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_activities", verbose_name="Foydalanuvchi")
    activity_date = models.DateField("Sana (foydalanuvchi zonasida)")
    active_seconds = models.PositiveIntegerField("Faol soniyalar", default=0)
    pages_read = models.PositiveIntegerField("Oqilgan sahifalar", default=0)
    sessions_count = models.PositiveSmallIntegerField("Seanslar soni", default=0)
    books_touched = models.PositiveSmallIntegerField("Tegilgan kitoblar", default=0)
    books_completed = models.PositiveSmallIntegerField("Tugatilgan kitoblar", default=0)
    points_earned = models.PositiveIntegerField("Berilgan ball", default=0)
    counts_for_streak = models.BooleanField("Streak uchun hisoblanadimi", default=False)

    class Meta:
        verbose_name = "Kunlik faollik"
        verbose_name_plural = "Kunlik faolliklar"
        constraints = [
            models.UniqueConstraint(fields=["user", "activity_date"], name="uniq_daily_activity"),
        ]

    def __str__(self):
        return f"{self.user} - {self.activity_date}"
