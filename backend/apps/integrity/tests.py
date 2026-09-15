"""M13 — anti-cheat skanerlash va ball qaytarish."""

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import ReaderStats, User
from apps.catalog.models import Book
from apps.integrity.models import SuspiciousActivity
from apps.integrity.tasks import scan_users
from apps.reading.models import ReadingProgress, ReadingSession


class ScanUsersTests(TestCase):
    def test_normal_user_not_flagged(self):
        u = User.objects.create_user(username="halol", password="x", role="reader")
        book = Book.objects.create(title="K", page_count=100, status=Book.Status.PUBLISHED)
        # bitta oddiy seans
        ReadingSession.objects.create(user=u, book=book, start_page=1, ended_at=timezone.now())
        result = scan_users()
        self.assertEqual(result["flagged"], 0)
        self.assertFalse(SuspiciousActivity.objects.filter(user=u).exists())

    def test_bot_user_flagged(self):
        u = User.objects.create_user(username="bot", password="x", role="reader")
        ReaderStats.objects.create(user=u, points_balance=150, points_lifetime=150)  # yangi akkaunt, yuqori ball
        book = Book.objects.create(title="K2", page_count=100, status=Book.Status.PUBLISHED)
        # ko'p flagged seans + 3 xil IP -> bir necha signal
        for i in range(4):
            ReadingSession.objects.create(
                user=u, book=book, start_page=1, ended_at=timezone.now(),
                suspicion_flags={"idle_streak": True}, ip_address=f"10.0.0.{i}",
            )
        b2 = Book.objects.create(title="K3", page_count=100, status=Book.Status.PUBLISHED)
        ReadingProgress.objects.create(user=u, book=book, status="completed", completed_at=timezone.now(), max_page_reached=100)
        ReadingProgress.objects.create(user=u, book=b2, status="completed", completed_at=timezone.now(), max_page_reached=100)
        result = scan_users()
        self.assertEqual(result["flagged"], 1)
        sa = SuspiciousActivity.objects.get(user=u)
        self.assertGreaterEqual(sa.risk_score, 60)

    def test_scan_idempotent_same_window(self):
        u = User.objects.create_user(username="bot2", password="x", role="reader")
        ReaderStats.objects.create(user=u, points_balance=150, points_lifetime=150)
        book = Book.objects.create(title="K4", page_count=100, status=Book.Status.PUBLISHED)
        for i in range(4):
            ReadingSession.objects.create(user=u, book=book, start_page=1, ended_at=timezone.now(), suspicion_flags={"x": True}, ip_address=f"10.0.1.{i}")
        ReadingProgress.objects.create(user=u, book=book, status="completed", completed_at=timezone.now(), max_page_reached=100)
        b2 = Book.objects.create(title="K5", page_count=100, status=Book.Status.PUBLISHED)
        ReadingProgress.objects.create(user=u, book=b2, status="completed", completed_at=timezone.now(), max_page_reached=100)
        scan_users()
        scan_users()  # ikkinchi marta — UNIQUE(user, window) tufayli yangilanadi
        self.assertEqual(SuspiciousActivity.objects.filter(user=u).count(), 1)


class ReverseTests(TestCase):
    def test_reverse_zeroes_balance_and_writes_negative(self):
        from apps.gamification.models import PointTransaction
        from apps.gamification.services import reverse_user_points

        u = User.objects.create_user(username="firibgar", password="x", role="reader")
        ReaderStats.objects.create(user=u, points_balance=50, points_lifetime=50)
        reversed_pts = reverse_user_points(u)
        self.assertEqual(reversed_pts, 50)
        u.refresh_from_db()
        stats = ReaderStats.objects.get(user=u)
        self.assertEqual(stats.points_balance, 0)
        self.assertEqual(stats.points_lifetime, 0)
        # manfiy korreksiya qatori yozilgan (ledger o'chirilmaydi)
        self.assertTrue(PointTransaction.objects.filter(user=u, delta=-50).exists())
