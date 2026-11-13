"""Foydalanuvchi va gamifikatsiya keshi (B ilova 1.1)."""
import uuid

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class User(AbstractUser):
    """Loyihaning yagona foydalanuvchi modeli.

    Rol farqi faqat ruxsat va `ReaderStats` mavjudligida — alohida
    Reader/Librarian jadvaliga bo'linmaydi (reja B-ilova izohi).
    """

    class Role(models.TextChoices):
        READER = "reader", "Kitobxon"
        LIBRARIAN = "librarian", "Kutubxonachi"
        ADMIN = "admin", "Administrator"

    public_id = models.UUIDField(
        "Tashqi identifikator", default=uuid.uuid4, editable=False, unique=True, db_index=True
    )
    role = models.CharField("Rol", max_length=16, choices=Role.choices, default=Role.READER)
    avatar = models.CharField("Avatar (fayl kaliti)", max_length=255, null=True, blank=True)
    timezone = models.CharField(
        "Vaqt zonasi", max_length=64, default="Asia/Tashkent",
        help_text="Streak va DailyActivity.date shu zonada hisoblanadi",
    )
    locale = models.CharField("Til", max_length=8, default="uz")
    class_name = models.CharField(
        "Sinf", max_length=16, blank=True, default="", help_text="Masalan: 7-A. Bo'sh qoldirish mumkin.",
    )
    token_version = models.PositiveIntegerField(
        "Token versiyasi", default=0,
        help_text="Oshirilsa — barcha JWT va imzolangan havolalar bekor bo'ladi",
    )
    last_login_at = models.DateTimeField("Oxirgi kirish vaqti", null=True, blank=True)
    deleted_at = models.DateTimeField("Yumshoq o'chirilgan vaqti", null=True, blank=True)

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    def __str__(self):
        return self.get_full_name() or self.username

    @property
    def is_reader(self):
        return self.role == self.Role.READER

    @property
    def is_librarian(self):
        return self.role == self.Role.LIBRARIAN

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN


class StudentManager(UserManager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.Role.READER)


class Student(User):
    """O'quvchi — `User` ning kitobxon rolidagi ko'rinishi (alohida jadval emas).

    Admin panelda kutubxonachi uchun sodda "O'quvchilar" bo'limi shu model ustida.
    """

    objects = StudentManager()

    class Meta:
        proxy = True
        verbose_name = "O'quvchi"
        verbose_name_plural = "O'quvchilar"

    def save(self, *args, **kwargs):
        self.role = User.Role.READER
        super().save(*args, **kwargs)


class ReaderStats(models.Model):
    """`User` bilan 1:1 — gamifikatsiya keshi. Haqiqat manbai — PointTransaction ledger."""

    user = models.OneToOneField(
        User, verbose_name="Foydalanuvchi", on_delete=models.CASCADE,
        primary_key=True, related_name="reader_stats",
    )
    points_balance = models.PositiveIntegerField("Sarflanadigan balans", default=0)
    points_lifetime = models.PositiveIntegerField("Umrbod yig'ilgan XP", default=0)
    level = models.ForeignKey(
        "gamification.Level", verbose_name="Joriy daraja",
        on_delete=models.PROTECT, null=True, blank=True, related_name="+",
    )
    current_streak = models.PositiveIntegerField("Joriy streak", default=0)
    longest_streak = models.PositiveIntegerField("Eng uzun streak", default=0)
    last_activity_date = models.DateField("Oxirgi faollik sanasi", null=True, blank=True)
    books_completed = models.PositiveIntegerField("Tugatilgan kitoblar (kesh)", default=0)
    books_in_progress = models.PositiveIntegerField("Jarayondagi kitoblar (kesh)", default=0)
    total_reading_seconds = models.PositiveBigIntegerField("Umumiy o'qish vaqti, s (kesh)", default=0)
    total_pages_read = models.PositiveBigIntegerField("O'qilgan sahifalar (kesh)", default=0)
    badges_count = models.PositiveIntegerField("Nishonlar soni (kesh)", default=0)
    global_rank = models.PositiveIntegerField("Global reyting o'rni", null=True, blank=True)
    stats_rebuilt_at = models.DateTimeField("Oxirgi to'liq qayta hisoblash", null=True, blank=True)

    class Meta:
        verbose_name = "Kitobxon statistikasi"
        verbose_name_plural = "Kitobxon statistikalari"
        constraints = [
            models.CheckConstraint(
                check=models.Q(points_balance__gte=0), name="reader_stats_balance_gte_0"
            ),
            models.CheckConstraint(
                check=models.Q(points_lifetime__gte=0), name="reader_stats_lifetime_gte_0"
            ),
        ]
        indexes = [
            models.Index(fields=["-points_lifetime", "user"], name="rs_points_lifetime_idx"),
        ]

    def __str__(self):
        return f"{self.user} statistikasi"
