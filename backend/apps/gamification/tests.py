"""M11 — ball dvigateli: award_points, process_events, idempotentlik, cap."""
from django.test import TestCase

from apps.accounts.models import ReaderStats, User
from apps.catalog.models import Book
from apps.core.events import emit
from apps.gamification.models import GamificationEvent, PointTransaction
from apps.gamification.services import award_points
from apps.gamification.tasks import process_events


class AwardPointsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="u", password="x", role="reader")
        cls.book = Book.objects.create(title="K", page_count=100, status=Book.Status.PUBLISHED)

    def test_award_writes_ledger_and_balance(self):
        r = award_points(self.user, "book_started", "k1", book=self.book)
        self.assertTrue(r.ok)
        stats = ReaderStats.objects.get(user=self.user)
        self.assertEqual(stats.points_balance, 5)
        self.assertEqual(stats.points_lifetime, 5)

    def test_idempotency_key_prevents_double(self):
        award_points(self.user, "book_started", "same-key", book=self.book)
        award_points(self.user, "book_started", "same-key", book=self.book)  # takror
        self.assertEqual(PointTransaction.objects.filter(user=self.user).count(), 1)
        self.assertEqual(ReaderStats.objects.get(user=self.user).points_balance, 5)

    def test_max_per_object_limit(self):
        # book_started qoidasi max_per_object=1 (kitob uchun bir marta)
        award_points(self.user, "book_started", "a", book=self.book)
        r2 = award_points(self.user, "book_started", "b", book=self.book)
        self.assertFalse(r2.ok)
        self.assertEqual(PointTransaction.objects.filter(user=self.user, book=self.book, reason_code="book_started").count(), 1)

    def test_direct_save_blocked_outside_service(self):
        """PointTransaction faqat servis orqali yozilishi kerak."""
        txn = PointTransaction(user=self.user, delta=999, balance_after=999, reason_code="hack", idempotency_key="x")
        with self.assertRaises(Exception):
            txn.save()


class EventToPointsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="u2", password="x", role="reader")
        cls.book = Book.objects.create(title="K2", page_count=100, status=Book.Status.PUBLISHED)

    def test_emit_then_process_awards_points(self):
        """To'liq zanjir: emit -> GamificationEvent -> process_events -> ball."""
        emit(self.user, "book_started", source="reading", book_id=self.book.id,
             idempotency_key=f"book:{self.book.id}:start:{self.user.id}")
        self.assertEqual(GamificationEvent.objects.filter(status="pending").count(), 1)

        process_events()

        self.assertEqual(GamificationEvent.objects.filter(status="processed").count(), 1)
        self.assertEqual(ReaderStats.objects.get(user=self.user).points_balance, 5)

    def test_process_events_idempotent(self):
        """Ikki marta process_events -> ball ikki marta berilmaydi (idempotency_key)."""
        key = f"book:{self.book.id}:start:{self.user.id}"
        emit(self.user, "book_started", source="reading", book_id=self.book.id, idempotency_key=key)
        process_events()
        # yana o'sha hodisani qo'lda pending qilib qayta process
        emit(self.user, "book_started", source="reading", book_id=self.book.id, idempotency_key=key)
        process_events()
        self.assertEqual(PointTransaction.objects.filter(user=self.user, reason_code="book_started").count(), 1)
        self.assertEqual(ReaderStats.objects.get(user=self.user).points_balance, 5)


class BadgeStreakLevelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="u3", password="x", role="reader")
        cls.book = Book.objects.create(title="K3", page_count=10, status=Book.Status.PUBLISHED)

    def test_level_updates_with_xp(self):
        from apps.gamification.badges import update_level
        # 300 XP -> "Kitob do'sti" (2-daraja, min_points 300 seed'da)
        stats = __import__("apps.accounts.models", fromlist=["ReaderStats"]).ReaderStats.objects.create(
            user=self.user, points_lifetime=350, points_balance=350
        )
        update_level(self.user)
        stats.refresh_from_db()
        self.assertIsNotNone(stats.level_id)
        self.assertGreaterEqual(stats.points_lifetime, stats.level.min_points)

    def test_first_book_badge_on_completion(self):
        """Kitob tugatilsa first_book nishoni beriladi."""
        from apps.gamification.badges import check_and_award_badges
        from apps.gamification.models import UserBadge
        from apps.reading.models import ReadingProgress

        ReadingProgress.objects.create(
            user=self.user, book=self.book, status="completed", max_page_reached=10
        )
        awarded = check_and_award_badges(self.user)
        self.assertIn("first_book", awarded)
        self.assertTrue(UserBadge.objects.filter(user=self.user, badge__code="first_book").exists())

    def test_badge_idempotent(self):
        from apps.gamification.badges import check_and_award_badges
        from apps.gamification.models import UserBadge
        from apps.reading.models import ReadingProgress

        ReadingProgress.objects.create(user=self.user, book=self.book, status="completed", max_page_reached=10)
        check_and_award_badges(self.user)
        check_and_award_badges(self.user)  # ikkinchi marta
        self.assertEqual(UserBadge.objects.filter(user=self.user, badge__code="first_book").count(), 1)

    def test_streak_consecutive_days(self):
        from datetime import timedelta

        from django.utils import timezone

        from apps.gamification.badges import update_streak
        from apps.reading.models import DailyActivity

        today = timezone.localdate()
        for delta in (0, 1, 2):
            DailyActivity.objects.create(
                user=self.user, activity_date=today - timedelta(days=delta),
                active_seconds=25 * 60, counts_for_streak=True,
            )
        streak = update_streak(self.user)
        self.assertEqual(streak, 3)


class RewardTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="xaridor", password="x", role="reader")

    def _reward(self, cost=100, stock=None):
        from apps.gamification.models import Reward
        return Reward.objects.create(code=f"r{cost}_{stock}", name="Test mukofot", cost_points=cost, stock=stock)

    def test_spend_deducts_balance_only(self):
        from apps.gamification.services import spend_points
        stats = ReaderStats.objects.create(user=self.user, points_balance=200, points_lifetime=200)
        reward = self._reward(cost=100)
        spend_points(self.user, reward)
        stats.refresh_from_db()
        self.assertEqual(stats.points_balance, 100)
        self.assertEqual(stats.points_lifetime, 200)  # XP tegmaydi (daraja tushmaydi)

    def test_insufficient_points(self):
        from apps.gamification.services import InsufficientPoints, spend_points
        ReaderStats.objects.create(user=self.user, points_balance=50, points_lifetime=50)
        reward = self._reward(cost=100)
        with self.assertRaises(InsufficientPoints):
            spend_points(self.user, reward)

    def test_out_of_stock(self):
        from apps.gamification.services import OutOfStock, spend_points
        ReaderStats.objects.create(user=self.user, points_balance=500, points_lifetime=500)
        reward = self._reward(cost=100, stock=0)
        with self.assertRaises(OutOfStock):
            spend_points(self.user, reward)

    def test_redemption_recorded(self):
        from apps.gamification.models import RewardRedemption
        from apps.gamification.services import spend_points
        ReaderStats.objects.create(user=self.user, points_balance=300, points_lifetime=300)
        reward = self._reward(cost=150)
        spend_points(self.user, reward)
        self.assertTrue(RewardRedemption.objects.filter(user=self.user, reward=reward, spent_points=150).exists())


class ChallengeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username="chuser", password="x", role="reader")

    def _challenge(self, target=2):
        from datetime import date, timedelta
        from apps.gamification.models import Challenge
        today = date.today()
        return Challenge.objects.create(
            code=f"ch{target}", name="Test challenge", challenge_type="books_completed",
            target=target, points_reward=50, start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=30), is_active=True,
        )

    def test_progress_updates(self):
        from apps.gamification.badges import update_challenges
        from apps.gamification.models import UserChallengeProgress
        from apps.catalog.models import Book
        from apps.reading.models import ReadingProgress
        from django.utils import timezone

        ch = self._challenge(target=2)
        for i in range(2):
            b = Book.objects.create(title=f"B{i}", page_count=10, status="published")
            ReadingProgress.objects.create(user=self.user, book=b, status="completed", completed_at=timezone.now(), max_page_reached=10)
        update_challenges(self.user)
        prog = UserChallengeProgress.objects.get(user=self.user, challenge=ch)
        self.assertEqual(prog.current, 2)
        self.assertIsNotNone(prog.completed_at)

    def test_completion_awards_points(self):
        from apps.gamification.badges import update_challenges
        from apps.gamification.models import PointTransaction
        from apps.catalog.models import Book
        from apps.reading.models import ReadingProgress
        from django.utils import timezone

        self._challenge(target=1)
        b = Book.objects.create(title="B", page_count=10, status="published")
        ReadingProgress.objects.create(user=self.user, book=b, status="completed", completed_at=timezone.now(), max_page_reached=10)
        update_challenges(self.user)
        # 50 ball berilgan (points_override)
        self.assertTrue(PointTransaction.objects.filter(user=self.user, reason_code="challenge_completed", delta=50).exists())

    def test_challenge_list_api(self):
        self._challenge()
        resp = self.client.get("/api/v1/gamification/challenges")
        self.assertEqual(resp.status_code, 200)
        codes = [c["code"] for c in resp.data]
        self.assertIn("ch2", codes)  # o'z challenge'im ro'yxatda
