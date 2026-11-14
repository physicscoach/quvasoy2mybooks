"""O'quvchi hisoblarini yaratish yordamchilari: login va parolni tizim o'zi o'ylab topadi."""
from __future__ import annotations

import re
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


# Kirill -> lotin (o'zbekcha imlo bo'yicha soddalashtirilgan): "Шоҳрух" -> "shohruh"
_CYR = {
    "а": "a", "б": "b", "в": "v", "г": "g", "ғ": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j",
    "з": "z", "и": "i", "й": "y", "к": "k", "қ": "q", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ў": "o", "ф": "f", "х": "x", "ҳ": "h",
    "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "i", "ь": "", "э": "e", "ю": "yu",
    "я": "ya",
}


def _latin(text: str) -> str:
    return "".join(_CYR.get(ch, ch) for ch in text.lower())


def _login_part(text: str) -> str:
    return slugify(_latin(text)).replace("-", "")


def make_username(first_name: str, last_name: str = "") -> str:
    """Ismdan band bo'lmagan login yasaydi: `sardor.aliyev`, band bo'lsa `sardor.aliyev2`."""
    parts = [_login_part(p) for p in (first_name, last_name) if p and _login_part(p)]
    base = ".".join(parts)[:28] or "oquvchi"
    candidate, n = base, 1
    while User.objects.filter(username__iexact=candidate).exists():
        n += 1
        candidate = f"{base}{n}"
    return candidate


# Jurnaldan nusxalanganda qator boshidagi tartib raqami: "1.", "12)", "3 -", "4	"
_NUMBERING = re.compile(r"^\s*\d+\s*[.)\-:]?\s*")


def clean_line(line: str) -> str:
    """Tartib raqamini va ortiqcha bo'shliqlarni olib tashlaydi."""
    return " ".join(_NUMBERING.sub("", line).split())


def find_existing(first_name: str, last_name: str, class_name: str) -> Student | None:
    """Shu sinfda xuddi shu ism-familiyali o'quvchi bormi (ikki marta qo'shilib qolmasin)."""
    return Student.objects.filter(
        first_name__iexact=first_name.strip(), last_name__iexact=last_name.strip(),
        class_name__iexact=class_name.strip(),
    ).first()


def split_name(line: str) -> tuple[str, str]:
    """"Aliyev Sardor" -> ("Sardor", "Aliyev"). Ro'yxatlarda odatda familiya oldin yoziladi.

    Otasining ismi ham yozilgan bo'lsa ("Aliyev Sardor Akmal o'g'li") — u ismga qo'shilmaydi.
    """
    words = line.split()
    if len(words) >= 3 and words[-1].lower().replace("‘", "'").replace("’", "'") in {"o'g'li", "qizi", "ugli", "kizi", "ўғли", "қизи", "угли", "кизи"}:
        words = words[:-2]
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
