"""`can_download` uchun asosiy testlar (talab: yagona funksiya + test)."""
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import Book, BookFile

from .models import DownloadLog
from .services import can_download


def _make_book_file(is_downloadable=True, book_downloadable=True, ready=True):
    book = Book.objects.create(
        title="Test kitob",
        status=Book.Status.PUBLISHED,
        is_downloadable=book_downloadable,
        published_at=timezone.now(),
    )
    file = BookFile.objects.create(
        book=book,
        format=BookFile.Format.PDF,
        file="books/test.pdf",
        size_bytes=1000,
        is_downloadable=is_downloadable,
        processing_status=BookFile.ProcessingStatus.READY if ready else BookFile.ProcessingStatus.PENDING,
    )
    return file


class CanDownloadTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reader1", password="pass12345")

    def test_denied_when_book_not_downloadable(self):
        file = _make_book_file(book_downloadable=False)
        decision = can_download(self.user, file)
        self.assertFalse(decision.allowed)

    def test_denied_when_file_not_downloadable(self):
        file = _make_book_file(is_downloadable=False)
        decision = can_download(self.user, file)
        self.assertFalse(decision.allowed)

    def test_denied_when_file_not_ready(self):
        file = _make_book_file(ready=False)
        decision = can_download(self.user, file)
        self.assertFalse(decision.allowed)

    def test_allowed_when_everything_ok(self):
        file = _make_book_file()
        decision = can_download(self.user, file)
        self.assertTrue(decision.allowed)

    def test_denied_when_daily_limit_reached(self):
        file = _make_book_file()
        for _ in range(10):
            DownloadLog.objects.create(
                user=self.user,
                book_file=file,
                book=file.book,
                file_format="pdf",
                file_name_snapshot="test.pdf",
                size_bytes_snapshot=1000,
                status=DownloadLog.Status.SUCCESS,
            )
        decision = can_download(self.user, file)
        self.assertFalse(decision.allowed)

    def test_denied_for_anonymous(self):
        from django.contrib.auth.models import AnonymousUser

        file = _make_book_file()
        decision = can_download(AnonymousUser(), file)
        self.assertFalse(decision.allowed)
