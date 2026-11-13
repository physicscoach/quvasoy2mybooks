"""M3-M4 — katalog API, fayl quvuri va nashr validatsiyasi testlari."""
import io

import fitz
from django.core.files.base import ContentFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from PIL import Image

from apps.catalog.models import Book, BookFile
from apps.ingestion.tasks import process_book_file


def make_pdf(pages=3):
    doc = fitz.open()
    for i in range(pages):
        doc.new_page().insert_text((72, 72), f"Sahifa {i + 1}")
    data = doc.tobytes()
    doc.close()
    return data


def tiny_webp():
    out = io.BytesIO()
    Image.new("RGB", (10, 10), "white").save(out, format="WEBP")
    return out.getvalue()


class CatalogApiTests(TestCase):
    def setUp(self):
        self.pub = Book.objects.create(
            title="Nashr kitob", status=Book.Status.PUBLISHED, published_at=timezone.now(), page_count=10
        )
        self.draft = Book.objects.create(title="Qoralama", status=Book.Status.DRAFT, page_count=5)

    def test_list_shows_only_published(self):
        resp = self.client.get(reverse("book-list"))
        self.assertEqual(resp.status_code, 200)
        titles = [b["title"] for b in resp.data["results"]]
        self.assertIn("Nashr kitob", titles)
        self.assertNotIn("Qoralama", titles)

    def test_draft_detail_404_for_anonymous(self):
        url = reverse("book-detail", kwargs={"slug": self.draft.slug})
        self.assertEqual(self.client.get(url).status_code, 404)

    def test_search(self):
        resp = self.client.get(reverse("book-list"), {"search": "Nashr"})
        self.assertEqual(resp.data["count"], 1)


class IngestionTests(TestCase):
    def test_auto_publish_puts_book_in_catalog_without_second_step(self):
        """Admin panelda qo'shilgan kitob (auto_publish) fayl tayyor bo'lishi bilan katalogga chiqadi."""
        book = Book.objects.create(title="Avto kitob", status=Book.Status.DRAFT, auto_publish=True)
        bf = BookFile.objects.create(book=book, format="pdf", processing_status="pending")
        bf.file.save("avto.pdf", ContentFile(make_pdf(2)), save=True)

        process_book_file(bf.pk)
        book.refresh_from_db()
        self.assertEqual(book.status, Book.Status.PUBLISHED)
        self.assertIsNotNone(book.published_at)

    def test_pdf_processing_sets_pages_cover_and_ready(self):
        book = Book.objects.create(title="PDF kitob", status=Book.Status.DRAFT)
        bf = BookFile.objects.create(book=book, format="pdf", processing_status="pending")
        bf.file.save("t.pdf", ContentFile(make_pdf(4)), save=True)
        bf.size_bytes = bf.file.size
        bf.save(update_fields=["size_bytes"])

        process_book_file(bf.pk)
        bf.refresh_from_db()
        book.refresh_from_db()
        self.assertEqual(bf.processing_status, "ready")
        self.assertEqual(bf.page_count, 4)
        self.assertEqual(book.status, Book.Status.READY)
        self.assertTrue(book.cover)

    def test_duplicate_rejected(self):
        data = make_pdf(2)
        for i in range(2):
            b = Book.objects.create(title=f"Dubl {i}", status=Book.Status.DRAFT)
            bf = BookFile.objects.create(book=b, format="pdf", processing_status="pending")
            bf.file.save(f"d{i}.pdf", ContentFile(data), save=True)
            bf.size_bytes = bf.file.size
            bf.save(update_fields=["size_bytes"])
            process_book_file(bf.pk)
            bf.refresh_from_db()
            if i == 0:
                self.assertEqual(bf.processing_status, "ready")
            else:
                self.assertEqual(bf.processing_status, "failed")
                self.assertIn("dublikat", bf.processing_error.lower())

    def test_wrong_magic_bytes_rejected(self):
        book = Book.objects.create(title="Soxta", status=Book.Status.DRAFT)
        bf = BookFile.objects.create(book=book, format="pdf", processing_status="pending")
        bf.file.save("fake.pdf", ContentFile(b"BU PDF EMAS"), save=True)
        bf.size_bytes = bf.file.size
        bf.save(update_fields=["size_bytes"])
        process_book_file(bf.pk)
        bf.refresh_from_db()
        self.assertEqual(bf.processing_status, "failed")


class PublishValidationTests(TestCase):
    def test_incomplete_book_has_blockers(self):
        book = Book.objects.create(title="Chala", status=Book.Status.DRAFT)
        blockers = book.publish_blockers()
        self.assertTrue(blockers)  # muqova yo'q, fayl yo'q, page_count yo'q

    def test_ready_book_has_no_blockers(self):
        book = Book.objects.create(title="Tayyor", status=Book.Status.READY, page_count=10)
        book.cover.save("c.webp", ContentFile(tiny_webp()), save=True)
        BookFile.objects.create(book=book, format="pdf", processing_status="ready", sha256="x" * 64)
        self.assertEqual(book.publish_blockers(), [])


class EpubIngestionTests(TestCase):
    def test_epub_processing(self):
        import io

        from ebooklib import epub

        b = epub.EpubBook()
        b.set_identifier("id1")
        b.set_title("EPUB test")
        b.set_language("uz")
        c1 = epub.EpubHtml(title="Bob", file_name="ch1.xhtml")
        c1.content = "<h1>Bob</h1><p>Matn</p>"
        b.add_item(c1)
        b.spine = ["nav", c1]
        b.add_item(epub.EpubNcx())
        b.add_item(epub.EpubNav())
        buf = io.BytesIO()
        epub.write_epub(buf, b)

        book = Book.objects.create(title="EPUB kitob", status=Book.Status.DRAFT)
        bf = BookFile.objects.create(book=book, format="epub", processing_status="pending")
        bf.file.save("t.epub", ContentFile(buf.getvalue()), save=True)
        bf.size_bytes = bf.file.size
        bf.save(update_fields=["size_bytes"])
        process_book_file(bf.pk)
        bf.refresh_from_db()
        self.assertEqual(bf.processing_status, "ready")
        self.assertIsNotNone(bf.location_count)


class ReviewTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.book = Book.objects.create(title="Sharh kitob", slug="sharh-kitob",
                                        status=Book.Status.PUBLISHED, page_count=10)
        from apps.accounts.models import User
        self.user = User.objects.create_user(username="oquvchi", password="Kitob2026xyz", role="reader")

    def _login(self):
        self.client.post("/api/v1/auth/login", {"login": "oquvchi", "password": "Kitob2026xyz"},
                         content_type="application/json")

    def test_cannot_review_without_completing(self):
        self._login()
        resp = self.client.post(f"/api/v1/books/{self.book.slug}/reviews",
                                {"rating": 5, "body": "Zo'r"}, content_type="application/json")
        self.assertEqual(resp.status_code, 403)

    def test_review_after_completion(self):
        from apps.reading.models import ReadingProgress
        ReadingProgress.objects.create(user=self.user, book=self.book, status="completed", max_page_reached=10)
        self._login()
        resp = self.client.post(f"/api/v1/books/{self.book.slug}/reviews",
                                {"rating": 4, "body": "Yaxshi kitob"}, content_type="application/json")
        self.assertEqual(resp.status_code, 201)

    def test_approved_review_updates_rating_and_shows(self):
        from apps.catalog.admin import _recalc_rating
        from apps.catalog.models import Review
        Review.objects.create(user=self.user, book=self.book, rating=5, body="A'lo",
                                  moderation_status=Review.ModerationStatus.APPROVED)
        _recalc_rating(self.book)
        self.book.refresh_from_db()
        self.assertEqual(self.book.rating_count, 1)
        self.assertEqual(float(self.book.rating_avg), 5.0)
        # public'da faqat approved ko'rinadi
        resp = self.client.get(f"/api/v1/books/{self.book.slug}/reviews")
        self.assertEqual(len(resp.data), 1)

    def test_pending_review_hidden(self):
        from apps.catalog.models import Review
        Review.objects.create(user=self.user, book=self.book, rating=3, moderation_status="pending")
        resp = self.client.get(f"/api/v1/books/{self.book.slug}/reviews")
        self.assertEqual(len(resp.data), 0)

    def test_recent_reviews_only_approved_with_text(self):
        from apps.accounts.models import User
        from apps.catalog.models import Review
        other = User.objects.create_user(username="ikkinchi", password="Kitob2026xyz", role="reader",
                                         first_name="Madina", last_name="Karimova")
        third = User.objects.create_user(username="uchinchi", password="Kitob2026xyz", role="reader")
        Review.objects.create(user=other, book=self.book, rating=5, body="Juda qiziq ekan",
                              moderation_status=Review.ModerationStatus.APPROVED)
        Review.objects.create(user=self.user, book=self.book, rating=4, body="Kutilmoqda",
                              moderation_status=Review.ModerationStatus.PENDING)
        Review.objects.create(user=third, book=self.book, rating=5, body="",
                              moderation_status=Review.ModerationStatus.APPROVED)
        resp = self.client.get("/api/v1/reviews/recent")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        item = resp.data[0]
        self.assertEqual(item["name"], "Madina")  # familiya ochilmaydi
        self.assertEqual(item["book_slug"], self.book.slug)
        self.assertNotIn("Karimova", str(item))
