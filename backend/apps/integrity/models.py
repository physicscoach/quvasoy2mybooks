"""Anti-cheat: shubhali faollik yozuvlari (M13, reja 6.5)."""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class SuspiciousActivity(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Ko'rib chiqilmagan"
        IGNORED = "ignored", "E'tiborsiz qoldirilgan"
        REVERSED = "reversed", "Ball qaytarilgan"
        BLOCKED = "blocked", "Bloklangan"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE, related_name="suspicious_activities",
    )
    risk_score = models.PositiveSmallIntegerField("Risk bali (0-100)", db_index=True)
    reasons = models.JSONField("Sabablar", default=dict, blank=True)
    window_start = models.DateField("Tahlil oynasi boshi")
    window_end = models.DateField("Tahlil oynasi oxiri")
    status = models.CharField("Holati", max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Kim ko'rib chiqdi",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    reviewed_at = models.DateTimeField("Ko'rib chiqilgan vaqti", null=True, blank=True)
    note = models.CharField("Izoh", max_length=255, blank=True, default="")

    class Meta:
        verbose_name = "Shubhali faollik"
        verbose_name_plural = "Shubhali faolliklar"
        ordering = ["-risk_score", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "window_start", "window_end"],
                name="uniq_suspicious_user_window",
            ),
        ]

    def __str__(self):
        return f"{self.user} — risk {self.risk_score}"
