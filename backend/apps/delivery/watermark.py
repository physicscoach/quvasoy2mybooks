"""PDF watermark (M19): yuklab olishda foydalanuvchi izini qo'yadi.

Har sahifa pastiga: "F.I.Sh. · ID:xxxx · sana · domen" + diagonal shaffof matn.
Nusxa ID DownloadLog'ga bog'lanadi -> tarqalgan fayl manbasini aniqlash mumkin.
Natija keshlanadi: BOOKS_ROOT/../derived/wm/{book}/{user}.pdf
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from django.conf import settings
from django.utils import timezone


def _cache_path(book_id: int, user_id: int, file_hash: str) -> Path:
    root = Path(settings.BOOKS_ROOT) / "wm" / str(book_id)
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{user_id}_{file_hash[:8]}.pdf"


def watermarked_pdf(book_file, user) -> Path:
    """Watermarklangan PDF yo'lini qaytaradi (keshdan yoki yangi generatsiya)."""
    import fitz  # PyMuPDF

    src_path = Path(book_file.file.path)
    file_hash = book_file.sha256 or hashlib.sha256(src_path.read_bytes()).hexdigest()
    cache = _cache_path(book_file.book_id, user.id, file_hash)
    if cache.exists():
        return cache

    copy_id = hashlib.sha256(f"{user.id}:{book_file.pk}:{file_hash}".encode()).hexdigest()[:8]
    full_name = (user.get_full_name() or user.username).strip()
    date_str = timezone.now().strftime("%Y-%m-%d")
    domain = getattr(settings, "SITE_DOMAIN", "kutubxona.uz")
    footer = f"{full_name} · ID:{copy_id} · {date_str} · {domain}"

    doc = fitz.open(str(src_path))
    try:
        for page in doc:
            rect = page.rect
            # pastki qatordagi iz
            page.insert_text(
                (36, rect.height - 20), footer, fontsize=8, color=(0.4, 0.4, 0.4),
            )
            # markazda katta shaffof iz (gorizontal — insert_text 45° bermaydi)
            page.insert_text(
                (rect.width * 0.15, rect.height * 0.5), f"ID:{copy_id}",
                fontsize=36, color=(0.88, 0.88, 0.88),
            )
        # nusxa ID metadata'ga
        doc.set_metadata({**doc.metadata, "keywords": f"copy:{copy_id}:user:{user.id}"})
        doc.save(str(cache), garbage=3, deflate=True)
    finally:
        doc.close()

    return cache
