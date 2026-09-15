"""E2E: kutubxonachi kitob qo'shadi -> kitobxon o'qiydi (M3-M5 to'liq zanjir)."""
import fitz
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from apps.catalog.models import Book, BookFile
from apps.ingestion.tasks import process_book_file


def make_pdf(pages=5):
    doc = fitz.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"Sahifa {i + 1}")
    data = doc.tobytes()
    doc.close()
    return data


@override_settings(REST_FRAMEWORK={
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {k: None for k in settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]},
})
class EndToEndFlowTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_full_flow_add_publish_read_download(self):
        # 1. Kutubxonachi kitob va faylni qo'shadi
        book = Book.objects.create(title="E2E kitobi", status=Book.Status.DRAFT, is_downloadable=True)
        bf = BookFile.objects.create(
            book=book, format="pdf", is_primary=True, is_downloadable=True, processing_status="pending"
        )
        bf.file.save("e2e.pdf", ContentFile(make_pdf(5)), save=True)
        bf.size_bytes = bf.file.size
        bf.save(update_fields=["size_bytes"])

        # 2. Fayl qayta ishlanadi
        process_book_file(bf.pk)
        bf.refresh_from_db()
        book.refresh_from_db()
        self.assertEqual(bf.processing_status, "ready")
        self.assertEqual(bf.page_count, 5)
        self.assertEqual(book.status, Book.Status.READY)

        # 3. Nashr to'siqlari yo'q -> nashr
        self.assertEqual(book.publish_blockers(), [])
        book.status = Book.Status.PUBLISHED
        book.published_at = timezone.now()
        book.save(update_fields=["status", "published_at"])

        # 4. Kitobxon ro'yxatdan o'tadi (JWT cookie test client'da qoladi)
        reg = self.client.post(
            reverse("accounts:register"),
            {"username": "okuvchi", "email": "o@example.com", "password": "Kitob2026xyz"},
            content_type="application/json",
        )
        self.assertEqual(reg.status_code, 201)

        # 5. Katalogda kitob ko'rinadi
        listing = self.client.get(reverse("book-list"))
        self.assertEqual(listing.data["count"], 1)

        # 6. O'qish tiketi + fayl X-Accel-Redirect bilan keladi
        ticket_resp = self.client.post(
            reverse("delivery-ticket"),
            {"book_public_id": str(book.public_id), "file_public_id": str(bf.public_id), "mode": "read"},
            content_type="application/json",
        )
        self.assertEqual(ticket_resp.status_code, 200, ticket_resp.data)
        token = ticket_resp.data["token"]

        file_resp = self.client.get(reverse("file-delivery", kwargs={"token": token}))
        self.assertEqual(file_resp.status_code, 200)
        self.assertIn("X-Accel-Redirect", file_resp)
        self.assertEqual(file_resp["Content-Type"], "application/pdf")

        # 7. Soxta tiket -> 403
        bad = self.client.get(reverse("file-delivery", kwargs={"token": "buzuq.tiket"}))
        self.assertEqual(bad.status_code, 403)

        # 8. Yuklab olish tiketi -> DownloadLog yoziladi
        from apps.delivery.models import DownloadLog

        dl_ticket = self.client.post(
            reverse("delivery-ticket"),
            {"book_public_id": str(book.public_id), "file_public_id": str(bf.public_id), "mode": "download"},
            content_type="application/json",
        )
        self.assertEqual(dl_ticket.status_code, 200)
        self.client.get(reverse("file-delivery", kwargs={"token": dl_ticket.data["token"]}))
        self.assertEqual(DownloadLog.objects.filter(book=book, status="success").count(), 1)
