"""O'quvchi hisoblarini yaratish yordamchilari: login va parolni tizim o'zi o'ylab topadi."""
from __future__ import annotations

import secrets

from django.db import transaction
from django.utils.text import slugify

from .models import ReaderStats, Student, User

# Chalkashadigan belgilarsiz (0/O, 1/l/I yo'q) — qog'ozdan ko'chirish oson bo'lsin
_LETTERS = "abcdefghjkmnpqrstuvwxyz"
_DIGITS = "23456789"


def generate_password() -> str:
    """Masalan: `kfmr4829` — 4 harf + 4 raqam."""
    return "".join(secrets.choice(_LETTERS) for _ in range(4)) + "".join(secrets.choice(_DIGITS) for _ in range(4))


def make_username(first_name: str, last_name: str = "") -> str:
    """Ismdan band bo'lmagan login yasaydi: `sardor.aliyev`, band bo'lsa `sardor.aliyev2`."""
    parts = [slugify(p).replace("-", "") for p in (first_name, last_name) if p and slugify(p)]
    base = ".".join(parts)[:28] or "oquvchi"
    candidate, n = base, 1
    while User.objects.filter(username__iexact=candidate).exists():
        n += 1
        candidate = f"{base}{n}"
    return candidate


def split_name(line: str) -> tuple[str, str]:
    """"Aliyev Sardor" -> ("Sardor", "Aliyev"). Ro'yxatlarda odatda familiya oldin yoziladi."""
    words = line.split()
    if len(words) == 1:
        return words[0], ""
    return " ".join(words[1:]), words[0]


@transaction.atomic
def create_student(first_name: str, last_name: str = "", class_name: str = "", username: str = "",
                   password: str = "") -> tuple[Student, str]:
    """O'quvchi yaratadi va (o'quvchi, ochiq parol) qaytaradi. Parol faqat shu yerda ko'rinadi."""
    password = password or generate_password()
    student = Student(
        username=username or make_username(first_name, last_name),
        first_name=first_name.strip(), last_name=last_name.strip(), class_name=class_name.strip(),
    )
    student.set_password(password)
    student.save()
    ReaderStats.objects.get_or_create(user=student)
    return student, password


def reset_password(student: User) -> str:
    """Yangi parol qo'yadi va eski kirishlarni bekor qiladi (token_version oshadi)."""
    password = generate_password()
    student.set_password(password)
    student.token_version += 1
    student.save(update_fields=["password", "token_version"])
    return password
