"""Papkadagi PDF/EPUB fayllarni ommaviy import qiladi (M20, bulk import).

Har fayl uchun DRAFT kitob yaratadi va qayta ishlash quvuriga yuboradi.
Fayl nomi sarlavha sifatida ishlatiladi (kutubxonachi keyin admin'da tahrirlaydi).

Ishlatish:
    python manage.py import_books /path/to/folder
    python manage.py import_books /path/to/folder --publish   # darhol nashr
"""
from __future__ import annotations

from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

EXT_FORMAT = {".pdf": "pdf", ".epub": "epub"}


class Command(BaseCommand):
    help = "Papkadagi PDF/EPUB fayllardan ommaviy DRAFT kitoblar yaratadi."

    def add_arguments(self, parser):
        parser.add_argument("folder", type=str, help="Kitob fayllari papkasi")
        parser.add_argument("--publish", action="store_true", help="Import qilingach darhol nashr qilish")

    def handle(self, *args, **options):
        from apps.catalog.models import Book, BookFile
        from apps.ingestion.tasks import process_book_file

        folder = Path(options["folder"])
        if not folder.is_dir():
            raise CommandError(f"Papka topilmadi: {folder}")

        files = [p for p in sorted(folder.iterdir()) if p.suffix.lower() in EXT_FORMAT]
        if not files:
            self.stdout.write(self.style.WARNING("PDF/EPUB fayl topilmadi."))
            return

        created, failed, skipped = 0, 0, 0
        for path in files:
            title = path.stem.replace("_", " ").replace("-", " ").strip().title()
            if Book.objects.filter(title=title).exists():
                skipped += 1
                self.stdout.write(f"  o'tkazildi (mavjud): {title}")
                continue

            fmt = EXT_FORMAT[path.suffix.lower()]
            book = Book.objects.create(title=title, language="uz", status=Book.Status.DRAFT)
            bf = BookFile.objects.create(book=book, format=fmt, is_primary=True, processing_status="pending")
            with path.open("rb") as fh:
                bf.file.save(path.name, File(fh), save=True)
            bf.size_bytes = bf.file.size
            bf.save(update_fields=["size_bytes"])

            # sinxron qayta ishlaymiz (management command — worker kutmaymiz)
            process_book_file(bf.pk)
            bf.refresh_from_db()
            book.refresh_from_db()

            if bf.processing_status == "failed":
                failed += 1
                self.stdout.write(self.style.ERROR(f"  XATO: {title} — {bf.processing_error}"))
                continue

            if options["publish"] and not book.publish_blockers():
                book.status = Book.Status.PUBLISHED
                from django.utils import timezone
                book.published_at = timezone.now()
                book.save(update_fields=["status", "published_at"])

            created += 1
            self.stdout.write(self.style.SUCCESS(f"  qo'shildi: {title} ({book.status})"))

        self.stdout.write(self.style.SUCCESS(
            f"\nJami: {created} qo'shildi, {skipped} o'tkazildi, {failed} xato."
        ))
