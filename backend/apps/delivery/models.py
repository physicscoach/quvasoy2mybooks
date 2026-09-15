"""Fayl yetkazish - yuklab olish jurnali (B ilova 1.3)."""
import uuid

from django.conf import settings
from django.db import models


class DownloadLog(models.Model):
    """Huquqiy iz + kunlik limit uchun asos. `user` va boglangan obyektlar
    hech qachon CASCADE emas - bu qonuniy yozuv, yoqolmasligi shart."""

    class Status(models.TextChoices):
        SUCCESS = "success", "Muvaffaqiyatli"
        DENIED_QUOTA = "denied_quota", "Limit tugagan"
        DENIED_PERMISSION = "denied_permission", "Ruxsat yoq"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Foydalanuvchi",
        on_delete=models.PROTECT, related_name="download_logs",
    )
    book_file = models.ForeignKey(
        "catalog.BookFile", verbose_name="Fayl",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="download_logs",
    )
    book = models.ForeignKey(
        "catalog.Book", verbose_name="Kitob",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="download_logs",
    )

    # Snapshot maydonlar - fayl ozgarsa/ochirilsa ham log toliq oqiladi
    file_format = models.CharField("Fayl formati", max_length=8)
    file_name_snapshot = models.CharField("Fayl nomi (snapshot)", max_length=255)
    size_bytes_snapshot = models.PositiveBigIntegerField("Hajmi, bayt (snapshot)")

    ip_address = models.GenericIPAddressField("IP manzil", null=True, blank=True)
    user_agent = models.CharField("User-Agent", max_length=400, blank=True, default="")
    watermark_id = models.UUIDField("Watermark identifikatori", default=uuid.uuid4, editable=False)
    status = models.CharField("Holati", max_length=20, choices=Status.choices, default=Status.SUCCESS)
    created_at = models.DateTimeField("Yaratilgan vaqti", auto_now_add=True)

    class Meta:
        verbose_name = "Yuklab olish jurnali"
        verbose_name_plural = "Yuklab olish jurnallari"
        indexes = [
            models.Index(fields=["user", "-created_at"], name="dl_user_created_idx"),
            models.Index(fields=["book_file", "-created_at"], name="dl_file_created_idx"),
        ]

    def __str__(self):
        return f"{self.user} - {self.file_name_snapshot}"
