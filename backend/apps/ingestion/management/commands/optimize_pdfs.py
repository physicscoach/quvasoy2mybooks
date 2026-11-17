"""Mavjud PDF kitoblarni onlayn o'qishga moslab qayta saqlaydi (qarang: ingestion/optimize.py).

    python manage.py optimize_pdfs            # hammasi (asl nusxa BOOKS_ROOT/_asl/ ga)
    python manage.py optimize_pdfs --dry-run  # faqat hisobot

Yangi yuklangan kitoblar process_book_file ichida avtomatik optimallashadi — bu buyruq
faqat eski fayllar uchun bir marta kerak.
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.ingestion.optimize import optimize_pdf_bytes


class Command(BaseCommand):
    help = "PDF kitoblarni onlayn o'qishga moslab qayta saqlaydi (asl nusxalar zaxiraga olinadi)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Faylga yozmasdan faqat hisobot")

    def handle(self, *args, dry_run=False, **opts):
        from apps.catalog.models import BookFile

        backup_root = Path(settings.BOOKS_ROOT) / "_asl"
        done = skipped = 0
        for bf in BookFile.objects.filter(format="pdf").select_related("book").order_by("pk"):
            path = Path(bf.file.path)
            data = path.read_bytes()
            out = optimize_pdf_bytes(data)
            title = bf.book.title[:40]
            if out is None:
                skipped += 1
                self.stdout.write(f"  o'tkazildi: {title}")
                continue
            self.stdout.write(f"  {title}: {len(data) / 1048576:.1f} -> {len(out) / 1048576:.1f} MB")
            if dry_run:
                continue
            backup = backup_root / bf.file.name
            backup.parent.mkdir(parents=True, exist_ok=True)
            if not backup.exists():
                shutil.copy2(path, backup)
            tmp = path.with_suffix(path.suffix + ".tmp")
            tmp.write_bytes(out)
            tmp.replace(path)
            bf.size_bytes = len(out)
            bf.sha256 = hashlib.sha256(out).hexdigest()
            bf.save(update_fields=["size_bytes", "sha256", "updated_at"])
            done += 1
        self.stdout.write(self.style.SUCCESS(f"Tayyor: {done} ta optimallashtirildi, {skipped} ta o'zgarmadi."))
