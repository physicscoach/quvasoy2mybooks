"""M20 — ommaviy import (bulk import) testi."""
import tempfile
from pathlib import Path

import fitz
from django.core.management import call_command
from django.test import TestCase

from apps.catalog.models import Book


def make_pdf_file(path: Path, pages=5):
    doc = fitz.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"Sahifa {i + 1}")
    doc.save(str(path))
    doc.close()


class BulkImportTests(TestCase):
    def test_import_creates_books(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            make_pdf_file(folder / "birinchi_kitob.pdf")
            make_pdf_file(folder / "ikkinchi-kitob.pdf")
            call_command("import_books", str(folder))

        # Sarlavhalar fayl nomidan (underscore/dash -> bo'sh joy, Title Case)
        self.assertTrue(Book.objects.filter(title="Birinchi Kitob").exists())
        self.assertTrue(Book.objects.filter(title="Ikkinchi Kitob").exists())
        # Draft holatda (--publish yo'q), lekin qayta ishlangan
        book = Book.objects.get(title="Birinchi Kitob")
        self.assertEqual(book.status, Book.Status.READY)
        self.assertEqual(book.page_count, 5)

    def test_import_publish_flag(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            make_pdf_file(folder / "nashr_kitob.pdf")
            call_command("import_books", str(folder), "--publish")
        book = Book.objects.get(title="Nashr Kitob")
        self.assertEqual(book.status, Book.Status.PUBLISHED)

    def test_import_skips_duplicates_by_title(self):
        Book.objects.create(title="Mavjud Kitob", status=Book.Status.DRAFT)
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            make_pdf_file(folder / "mavjud_kitob.pdf")
            call_command("import_books", str(folder))
        # bir xil sarlavha -> o'tkazib yuboriladi (bitta qoladi)
        self.assertEqual(Book.objects.filter(title="Mavjud Kitob").count(), 1)


class OptimizePdfTests(TestCase):
    """Sahifa obyektlari object stream'ga yig'iladi — pdf.js butun faylni tortmasin."""

    def _scattered_pdf(self, pages=12) -> bytes:
        # Har sahifada katta (siqilmaydigan) rasm: sahifa obyektlari rasmlar orasiga sochiladi
        import io
        import os

        from PIL import Image

        doc = fitz.open()
        for i in range(pages):
            page = doc.new_page()
            buf = io.BytesIO()
            Image.frombytes("L", (300, 300), os.urandom(90000)).save(buf, "PNG")
            page.insert_image(page.rect, stream=buf.getvalue())
            page.insert_text((72, 72), f"Sahifa {i + 1}")
        data = doc.tobytes()
        doc.close()
        return data

    def test_optimize_keeps_pages_and_packs_objects(self):
        from apps.ingestion.optimize import optimize_pdf_bytes

        data = self._scattered_pdf()
        out = optimize_pdf_bytes(data)
        self.assertIsNotNone(out)
        self.assertIn(b"/ObjStm", out)
        doc = fitz.open(stream=out, filetype="pdf")
        self.assertEqual(doc.page_count, 12)
        self.assertFalse(doc.is_repaired)
        # Sahifa obyektlari endi alohida "N 0 obj << /Type /Page" bo'lib sochilmagan
        self.assertNotIn(b"/Type/Page/", out.replace(b" ", b""))
        doc.close()

    def test_optimize_rejects_garbage(self):
        from apps.ingestion.optimize import optimize_pdf_bytes

        self.assertIsNone(optimize_pdf_bytes(b"%PDF-1.4 bu pdf emas"))

    def test_optimize_command_dry_run(self):
        from io import StringIO

        out = StringIO()
        call_command("optimize_pdfs", "--dry-run", stdout=out)
        self.assertIn("Tayyor", out.getvalue())
