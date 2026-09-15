"""Umumiy abstrakt modellar va tizim sozlamalari.

Domen app'lari (catalog, reading, delivery...) gamifikatsiyani
to'g'ridan-to'g'ri import qilmaydi — ular faqat `apps.core.events.emit()`
orqali hodisa yozadi. Bog'liqlik yo'nalishi: domen -> core -> gamification (worker).
"""
import uuid

from django.db import models


class TimeStampedModel(models.Model):
    """Barcha domen modellari uchun umumiy asos.

    `public_id` — tashqi API'da ko'rinadigan UUID (ichki `id` sirt yuzasiga
    chiqmaydi, B ilova 0-bo'lim qarori).
    """

    public_id = models.UUIDField(
        "Tashqi identifikator", default=uuid.uuid4, editable=False, unique=True, db_index=True
    )
    created_at = models.DateTimeField("Yaratilgan vaqti", auto_now_add=True)
    updated_at = models.DateTimeField("Yangilangan vaqti", auto_now=True)

    class Meta:
        abstract = True


class SystemSetting(models.Model):
    """Deploysiz o'zgartiriladigan tizim sozlamalari (reja B-ilova 1.6)."""

    class ValueType(models.TextChoices):
        INT = "int", "Butun son"
        FLOAT = "float", "Kasr son"
        STR = "str", "Matn"
        BOOL = "bool", "Mantiqiy"
        JSON = "json", "JSON"

    key = models.CharField("Kalit", max_length=64, primary_key=True)
    value = models.JSONField("Qiymat")
    value_type = models.CharField(
        "Qiymat turi", max_length=8, choices=ValueType.choices, default=ValueType.STR
    )
    description = models.CharField("Izoh", max_length=255, blank=True, default="")
    is_public = models.BooleanField("Frontendga ochiqmi", default=False)
    updated_by = models.ForeignKey(
        "accounts.User",
        verbose_name="Kim yangiladi",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    updated_at = models.DateTimeField("Yangilangan vaqti", auto_now=True)

    class Meta:
        verbose_name = "Tizim sozlamasi"
        verbose_name_plural = "Tizim sozlamalari"

    def __str__(self):
        return self.key
