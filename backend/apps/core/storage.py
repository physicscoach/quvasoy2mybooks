"""Himoyalangan kitob fayllari uchun alohida storage.

Kitob PDF/EPUB fayllari `BOOKS_ROOT` (masalan /data/books) da saqlanadi —
muqova/thumbnail (MEDIA_ROOT = /data/derived) dan ATaylab ajratilgan.
Bu papkaga Caddy `root` bevosita kirmaydi; faqat X-Accel-Redirect orqali
(tiket tekshiruvidan keyin) fayl uzatiladi.
"""
from django.conf import settings
from django.core.files.storage import FileSystemStorage


class ProtectedBookStorage(FileSystemStorage):
    def __init__(self, **kwargs):
        kwargs.setdefault("location", str(settings.BOOKS_ROOT))
        kwargs.setdefault("base_url", None)  # URL yo'q — bevosita xizmat qilinmaydi
        super().__init__(**kwargs)


protected_book_storage = ProtectedBookStorage()
