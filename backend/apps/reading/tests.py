"""M9 — o'qish telemetriyasi va anti-cheat validatsiyasi testlari.

Server vaqti (server_ts) nazorat qilinadi: heartbeat'lar ma'lum oraliqlarda
yaratiladi, so'ng validatsiya natijasi tekshiriladi.
"""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog.models import Book
from apps.reading.models import ReadingHeartbeat, ReadingSession
from apps.reading.validation import evaluate_session

INTERVAL = 30
DWELL = 20  # MIN_PAGE_DWELL_SEC


def make_session(user, book, started_ago_sec=600):
    s = ReadingSession.objects.create(user=user, book=book, start_page=1, max_page=1)
    ReadingSession.objects.filter(pk=s.pk).update(started_at=timezone.now() - timedelta(seconds=started_ago_sec))
    s.refresh_from_db()
    return s


def add_heartbeats(session, specs):
    """specs: [(seq, page, active_seconds, is_focused, scroll, viewport, gap_sec), ...]

    gap_sec — oldingi heartbeatdan server_ts farqi.
    """
    base = session.started_at
    cursor = base
    created = []
    for seq, page, active, focused, scroll, vp, gap in specs:
        cursor = cursor + timedelta(seconds=gap)
        from django.db import IntegrityError, transaction
        try:
            with transaction.atomic():
                hb = ReadingHeartbeat.objects.create(
                    session=session, client_seq=seq, client_ts=cursor, page=page,
                    active_seconds=active, is_focused=focused, scroll_delta=scroll, viewport_pct=vp,
                )
            ReadingHeartbeat.objects.filter(pk=hb.pk).update(server_ts=cursor)
            created.append(hb)
        except IntegrityError:
            pass  # takroriy client_seq (UNIQUE) — DB darajasida rad etiladi
    return list(session.heartbeats.order_by("client_seq"))


class AntiCheatTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="okuvchi", password="x", role="reader")
        cls.book = Book.objects.create(title="Test", page_count=100, status=Book.Status.PUBLISHED)

    def test_real_reading_credits_pages(self):
        """Har sahifada ~30s (dwell > 20s) real o'qish -> sahifalar kreditlanadi."""
        s = make_session(self.user, self.book)
        # 1-sahifa: 2 heartbeat x 25s = 50s dwell; 2-sahifa: 2 x 25s
        hbs = add_heartbeats(s, [
            (1, 1, 25, True, 5, 100, 25),
            (2, 1, 25, True, 5, 100, 25),
            (3, 2, 25, True, 5, 100, 25),
            (4, 2, 25, True, 5, 100, 25),
        ])
        r = evaluate_session(s, hbs)
        self.assertIn(1, r.credited_pages)
        self.assertIn(2, r.credited_pages)
        self.assertGreater(r.credited_active_seconds, 0)

    def test_fast_flipping_no_credit(self):
        """Har sahifada bitta qisqa heartbeat (dwell < 20s) -> sahifa kreditlanmaydi."""
        s = make_session(self.user, self.book)
        # har sahifada 1 heartbeat, 5s active -> dwell 5s < 20s
        specs = [(i, i, 5, True, 2, 100, 5) for i in range(1, 8)]
        hbs = add_heartbeats(s, specs)
        r = evaluate_session(s, hbs)
        self.assertEqual(len(r.credited_pages), 0)

    def test_inflated_active_seconds_capped(self):
        """Soxta katta active_seconds (120) interval*1.5=45 ga kesiladi."""
        s = make_session(self.user, self.book)
        hbs = add_heartbeats(s, [
            (1, 1, 120, True, 5, 100, 30),
            (2, 1, 120, True, 5, 100, 30),
        ])
        r = evaluate_session(s, hbs)
        # har heartbeat max interval*1.5=45 -> 2 ta = 90 (240 emas)
        self.assertLessEqual(r.credited_active_seconds, 90)

    def test_idle_windows_no_credit(self):
        """Fokussiz + viewport 0 (ochib qo'yib ketish) -> kredit yo'q, suspicion."""
        s = make_session(self.user, self.book)
        hbs = add_heartbeats(s, [
            (1, 1, 30, False, 0, 0, 30),
            (2, 1, 30, False, 0, 0, 30),
            (3, 1, 30, False, 0, 0, 30),
        ])
        r = evaluate_session(s, hbs)
        self.assertEqual(r.credited_active_seconds, 0)
        self.assertTrue(r.suspicion_flags.get("idle_streak"))

    def test_replay_duplicate_seq_ignored(self):
        """Takroriy/kamayuvchi client_seq o'tkazib yuboriladi."""
        s = make_session(self.user, self.book)
        add_heartbeats(s, [
            (1, 1, 25, True, 5, 100, 25),
            (1, 1, 25, True, 5, 100, 25),  # takror seq=1
            (2, 1, 25, True, 5, 100, 25),
        ])
        # DB'da 2 ta (UNIQUE session+client_seq), lekin validatsiya ham qat'iy o'sishni talab qiladi
        r = evaluate_session(s, list(s.heartbeats.order_by("client_seq")))
        # sahifa 1 baribir kreditlanadi (yetarli dwell), lekin dublikat hisoblanmaydi
        self.assertIn(1, r.credited_pages)


class SessionViewTests(TestCase):
    def setUp(self):
        self.book = Book.objects.create(title="Kitob", page_count=50, status=Book.Status.PUBLISHED)
        User.objects.create_user(username="u1", password="Kitob2026xyz", role="reader")

    def _login(self):
        from django.core.cache import cache
        cache.clear()
        self.client.post(
            "/api/v1/auth/login",
            {"login": "u1", "password": "Kitob2026xyz"},
            content_type="application/json",
        )

    def test_opening_second_session_supersedes_first(self):
        """Ikkinchi seans ochilsa birinchi 'new_session' bilan yopiladi (bitta aktiv)."""
        self._login()
        r1 = self.client.post("/api/v1/reading/sessions/open",
                              {"book_public_id": str(self.book.public_id), "start_page": 1},
                              content_type="application/json")
        self.assertEqual(r1.status_code, 201)
        r2 = self.client.post("/api/v1/reading/sessions/open",
                              {"book_public_id": str(self.book.public_id), "start_page": 1},
                              content_type="application/json")
        self.assertEqual(r2.status_code, 201)
        active = ReadingSession.objects.filter(user__username="u1", ended_at__isnull=True).count()
        self.assertEqual(active, 1)  # faqat bitta aktiv seans

    def test_activity_lists_only_own_recent_days(self):
        """Faollik taqvimi: faqat o'ziniki va so'ralgan davr ichidagi kunlar qaytadi."""
        from apps.reading.models import DailyActivity

        me = User.objects.get(username="u1")
        other = User.objects.create_user(username="u2", password="Kitob2026xyz", role="reader")
        today = timezone.localdate()
        DailyActivity.objects.create(user=me, activity_date=today, active_seconds=1500, pages_read=12)
        DailyActivity.objects.create(user=me, activity_date=today - timedelta(days=200), active_seconds=600)
        DailyActivity.objects.create(user=other, activity_date=today, active_seconds=900)

        self.assertEqual(self.client.get("/api/v1/reading/activity").status_code, 401)
        self._login()
        r = self.client.get("/api/v1/reading/activity?days=30")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([d["active_seconds"] for d in r.json()], [1500])

    def test_progress_list_exposes_book_links(self):
        """'Davom ettirish' kartasi uchun progress javobida kitob slug va public_id bor."""
        from apps.reading.models import ReadingProgress

        me = User.objects.get(username="u1")
        ReadingProgress.objects.create(user=me, book=self.book, status="reading", current_page=5, percent=10)
        self._login()
        row = self.client.get("/api/v1/reading/progress").json()[0]
        self.assertEqual(row["book_slug"], self.book.slug)
        self.assertEqual(row["book_public_id"], str(self.book.public_id))
        self.assertIsNone(row["book_cover_url"])


class FlushE2ETests(TestCase):
    """flush_dirty_sessions to'liq zanjiri: heartbeat -> PageCredit -> gamifikatsiya emit."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="reader", password="x", role="reader")
        cls.book = Book.objects.create(title="Kitob", page_count=100, status=Book.Status.PUBLISHED)

    def test_flush_credits_pages_and_emits_events(self):
        from apps.gamification.models import GamificationEvent
        from apps.reading.models import ReadingPageCredit
        from apps.reading.tasks import flush_dirty_sessions

        s = make_session(self.user, self.book)
        add_heartbeats(s, [
            (1, 1, 25, True, 5, 100, 25),
            (2, 1, 25, True, 5, 100, 25),
            (3, 2, 25, True, 5, 100, 25),
            (4, 2, 25, True, 5, 100, 25),
            (5, 3, 25, True, 5, 100, 25),
            (6, 3, 25, True, 5, 100, 25),
        ])
        # seansni yopamiz (validatsiya VALID bo'lishi uchun)
        ReadingSession.objects.filter(pk=s.pk).update(
            ended_at=timezone.now(), heartbeat_count=6, max_page=3,
        )

        result = flush_dirty_sessions()
        self.assertEqual(result["processed"], 1)

        # 3 sahifa kreditlangan (har biri 50s > 20s dwell)
        credits = ReadingPageCredit.objects.filter(user=self.user, book=self.book).count()
        self.assertEqual(credits, 3)

        # book_started hodisasi chiqarilgan (>=3 sahifa)
        self.assertTrue(
            GamificationEvent.objects.filter(user=self.user, event_type="book_started").exists()
        )

        s.refresh_from_db()
        self.assertEqual(s.validation_state, "valid")

    def test_flush_idempotent_no_double_credit(self):
        """Ikki marta flush -> sahifa ikki marta kreditlanmaydi."""
        from apps.reading.models import ReadingPageCredit
        from apps.reading.tasks import flush_dirty_sessions

        s = make_session(self.user, self.book)
        add_heartbeats(s, [
            (1, 1, 25, True, 5, 100, 25),
            (2, 1, 25, True, 5, 100, 25),
        ])
        ReadingSession.objects.filter(pk=s.pk).update(ended_at=timezone.now(), heartbeat_count=2, max_page=1)

        flush_dirty_sessions()
        first = ReadingPageCredit.objects.filter(user=self.user, book=self.book).count()
        # qayta pending qilib flush (qayta hisoblash)
        ReadingSession.objects.filter(pk=s.pk).update(validation_state="pending")
        flush_dirty_sessions()
        second = ReadingPageCredit.objects.filter(user=self.user, book=self.book).count()
        self.assertEqual(first, second)  # dublikat yo'q
