"""Kitob faylini fonda qayta ishlash (django-q2 vazifasi).

Sinxron ishlamaydi - kutubxonachi faylni yuklaganda BookFile.processing_status
`pending` bolib qoladi, bu vazifa `async_task("apps.ingestion.tasks.process_book_file", file_id)`
orqali navbatga qoyiladi (signal orqali, quyida `connect_signals`).
"""
from __future__ import annotations

import hashlib
import logging

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

MAGIC_BYTES = {
    b"%PDF": "pdf",
    b"PK\x03\x04": "epub",  # EPUB - ZIP konteyner
}

MAX_UPLOAD_SIZE = 200 * 1024 * 1024  # 200 MB, settings.MAX_UPLOAD_SIZE_MB bilan mos


def _detect_format(head: bytes) -> str | None:
    for magic, fmt in MAGIC_BYTES.items():
        if head.startswith(magic):
            return fmt
    return None


def _sha256_of(file_obj) -> str:
    file_obj.seek(0)
    digest = hashlib.sha256()
    for chunk in iter(lambda: file_obj.read(1024 * 1024), b""):
        digest.update(chunk)
    file_obj.seek(0)
    return digest.hexdigest()


def _mark_failed(book_file, reason: str):
    from apps.catalog.models import BookFile

    book_file.processing_status = BookFile.ProcessingStatus.FAILED
    book_file.processing_error = reason
    book_file.save(update_fields=["processing_status", "processing_error", "updated_at"])
    logger.warning("Fayl qayta ishlash muvaffaqiyatsiz: %s - %s", book_file.pk, reason)


def process_book_file(book_file_id: int):
    """django-q2 vazifasi: validatsiya -> checksum -> metadata -> muqova."""
    from apps.catalog.models import Book, BookFile

    try:
        book_file = BookFile.objects.select_related("book").get(pk=book_file_id)
    except BookFile.DoesNotExist:
        logger.error("BookFile topilmadi: %s", book_file_id)
        return

    book_file.processing_status = BookFile.ProcessingStatus.PROCESSING
    book_file.save(update_fields=["processing_status", "updated_at"])

    try:
        if book_file.size_bytes and book_file.size_bytes > MAX_UPLOAD_SIZE:
            _mark_failed(book_file, "Fayl hajmi 200 MB dan katta.")
            return

        with book_file.file.open("rb") as f:
            head = f.read(8)
            fmt = _detect_format(head)
            if fmt is None or fmt != book_file.format:
                _mark_failed(book_file, "Fayl turi (magic bytes) format bilan mos emas yoki qollab-quvvatlanmaydi.")
                return

            checksum = _sha256_of(f)

        duplicate = BookFile.objects.filter(sha256=checksum).exclude(pk=book_file.pk).exists()
        if duplicate:
            _mark_failed(book_file, "Bu fayl allaqachon boshqa yozuvda mavjud (checksum dublikat).")
            return

        book_file.sha256 = checksum
        book_file.size_bytes = book_file.file.size

        if fmt == "pdf":
            _process_pdf(book_file)
        else:
            _process_epub(book_file)

        book_file.processing_status = BookFile.ProcessingStatus.READY
        book_file.processing_error = ""
        book_file.save()

        book = book_file.book
        if book.status == Book.Status.DRAFT:
            book.status = Book.Status.READY
            book.save(update_fields=["status", "updated_at"])

    except Exception as exc:  # noqa: BLE001 - fon vazifasi hech qachon serverni qulatmasligi kerak
        logger.exception("process_book_file xato: %s", exc)
        _mark_failed(book_file, f"Kutilmagan xatolik: {exc}")


def _process_pdf(book_file):
    """PyMuPDF bilan sahifa soni va 0-sahifadan muqova (WebP)."""
    import fitz  # PyMuPDF

    with book_file.file.open("rb") as f:
        data = f.read()

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if doc.is_encrypted:
            raise ValueError("PDF parol bilan himoyalangan - avval parolni olib tashlang.")

        book_file.page_count = doc.page_count
        book = book_file.book
        if not book.page_count:
            book.page_count = doc.page_count

        if not book.cover and doc.page_count > 0:
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            webp_bytes = pix.tobytes("webp")
            book.cover.save(f"{book.slug or book.pk}.webp", ContentFile(webp_bytes), save=False)

        book.save()
    finally:
        doc.close()


def _process_epub(book_file):
    """ebooklib bilan EPUB metadata + muqova."""
    import ebooklib
    from ebooklib import epub

    with book_file.file.open("rb") as f:
        tmp_path = book_file.file.path if hasattr(book_file.file, "path") else None

    # ebooklib fayl yolini talab qiladi (storage FileSystemStorage bolgani uchun mavjud)
    book_epub = epub.read_epub(tmp_path) if tmp_path else None
    if book_epub is None:
        return

    book = book_file.book
    titles = book_epub.get_metadata("DC", "title")
    if titles and not book.subtitle and titles[0][0] != book.title:
        pass  # sarlavha - kutubxonachi kiritganini ustun qoyamiz

    cover_item = None
    for item in book_epub.get_items_of_type(ebooklib.ITEM_COVER):
        cover_item = item
        break
    if cover_item is None:
        for item in book_epub.get_items_of_type(ebooklib.ITEM_IMAGE):
            if "cover" in item.get_name().lower():
                cover_item = item
                break

    if cover_item is not None and not book.cover:
        book.cover.save(f"{book.slug or book.pk}-cover.jpg", ContentFile(cover_item.get_content()), save=False)

    spine_count = len(book_epub.spine)
    book_file.location_count = spine_count
    book.save()
