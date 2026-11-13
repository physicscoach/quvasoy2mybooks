"""Kitob bo'yicha test (viktorina): kutubxonachi tuzadi, o'quvchi topshiradi.

Ataylab sodda: har savolda to'rttagacha variant bitta qatorda saqlanadi —
kutubxonachi bitta sahifada butun testni to'ldiradi, ichma-ich jadvallarsiz.
"""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel


class Quiz(TimeStampedModel):
    book = models.OneToOneField(
        "catalog.Book", verbose_name="Kitob", on_delete=models.CASCADE, related_name="quiz",
        help_text="Test qaysi kitob bo'yicha? Har kitobga bitta test tuziladi.",
    )
    title = models.CharField(
        "Test nomi", max_length=200, blank=True, default="",
        help_text="Bo'sh qoldirsangiz, kitob nomi bilan ataladi.",
    )
    pass_percent = models.PositiveSmallIntegerField(
        "O'tish foizi", default=60, validators=[MinValueValidator(1), MaxValueValidator(100)],
        help_text="Testdan o'tish uchun kamida necha foiz to'g'ri javob kerak.",
    )
    points_reward = models.PositiveIntegerField(
        "O'tgani uchun XP", default=30, help_text="Testdan o'tgan o'quvchiga beriladigan ball.",
    )
    require_completed = models.BooleanField(
        "Faqat kitobni tugatganlar topshirsin", default=True,
        help_text="Belgilansa, kitobni oxirigacha o'qimagan o'quvchiga test ochilmaydi.",
    )
    is_active = models.BooleanField(
        "O'quvchilarga ko'rinsin", default=True,
        help_text="Belgini olib tashlasangiz, test vaqtincha yashiriladi.",
    )

    class Meta:
        verbose_name = "Test"
        verbose_name_plural = "Testlar"
        ordering = ["-created_at"]

    def __str__(self):
        return self.display_title

    @property
    def display_title(self):
        return self.title or f"«{self.book.title}» bo'yicha test"


class Question(models.Model):
    class Option(models.TextChoices):
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"
        D = "D", "D"

    quiz = models.ForeignKey(Quiz, verbose_name="Test", on_delete=models.CASCADE, related_name="questions")
    order = models.PositiveSmallIntegerField("Tartib raqami", default=0)
    text = models.TextField("Savol")
    option_a = models.CharField("A variant", max_length=300)
    option_b = models.CharField("B variant", max_length=300)
    option_c = models.CharField("C variant", max_length=300, blank=True, default="")
    option_d = models.CharField("D variant", max_length=300, blank=True, default="")
    correct = models.CharField("To'g'ri javob", max_length=1, choices=Option.choices)

    class Meta:
        verbose_name = "Savol"
        verbose_name_plural = "Savollar"
        ordering = ["order", "id"]

    def __str__(self):
        return self.text[:60]

    def options(self):
        """Bo'sh bo'lmagan variantlar: [("A", matn), ...]."""
        pairs = [("A", self.option_a), ("B", self.option_b), ("C", self.option_c), ("D", self.option_d)]
        return [(key, text) for key, text in pairs if text]

    def clean(self):
        if self.correct and not dict(self.options()).get(self.correct):
            raise ValidationError(
                {"correct": f"{self.correct} variant bo'sh — uni to'g'ri javob sifatida tanlab bo'lmaydi."}
            )


class QuizAttempt(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="O'quvchi", on_delete=models.CASCADE, related_name="quiz_attempts",
    )
    quiz = models.ForeignKey(Quiz, verbose_name="Test", on_delete=models.CASCADE, related_name="attempts")
    correct_count = models.PositiveSmallIntegerField("To'g'ri javoblar")
    total = models.PositiveSmallIntegerField("Savollar soni")
    percent = models.PositiveSmallIntegerField("Natija, %")
    passed = models.BooleanField("O'tdimi")

    class Meta:
        verbose_name = "Test natijasi"
        verbose_name_plural = "Test natijalari"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "quiz", "-created_at"], name="quiz_attempt_user_quiz_idx")]

    def __str__(self):
        return f"{self.user} — {self.quiz}: {self.percent}%"
