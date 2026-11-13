"""O'quvchi uchun test API: savollarni olish va javob topshirish.

To'g'ri javoblar hech qachon mijozga yuborilmaydi — natijada faqat ball qaytadi,
aks holda javoblar o'quvchilar orasida tarqalib ketadi.
"""
from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Book
from apps.core.events import emit
from apps.reading.models import ReadingProgress

from .models import Quiz, QuizAttempt

MAX_ATTEMPTS_PER_DAY = 3


def _get_quiz(slug):
    book = get_object_or_404(Book, slug=slug, status=Book.Status.PUBLISHED)
    return get_object_or_404(Quiz.objects.select_related("book"), book=book, is_active=True)


def _blocker(user, quiz):
    """Topshirishga to'siq (kod, xabar) yoki None."""
    if QuizAttempt.objects.filter(user=user, quiz=quiz, passed=True).exists():
        return "already_passed", "Siz bu testdan o'tgansiz."
    if quiz.require_completed:
        done = ReadingProgress.objects.filter(
            user=user, book=quiz.book, status=ReadingProgress.Status.COMPLETED,
        ).exists()
        if not done:
            return "not_completed", "Test kitobni oxirigacha o'qiganingizdan keyin ochiladi."
    since = timezone.now() - timedelta(hours=24)
    if QuizAttempt.objects.filter(user=user, quiz=quiz, created_at__gte=since).count() >= MAX_ATTEMPTS_PER_DAY:
        return "too_many", "Bugungi urinishlar tugadi. Ertaga yana urinib ko'ring."
    return None


class BookQuizView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        quiz = _get_quiz(slug)
        questions = list(quiz.questions.all())
        best = QuizAttempt.objects.filter(user=request.user, quiz=quiz).order_by("-percent").first()
        blocker = _blocker(request.user, quiz)
        return Response({
            "title": quiz.display_title,
            "pass_percent": quiz.pass_percent,
            "points_reward": quiz.points_reward,
            "question_count": len(questions),
            "can_attempt": blocker is None and bool(questions),
            "blocked_code": blocker[0] if blocker else None,
            "blocked_reason": blocker[1] if blocker else None,
            "best": {"percent": best.percent, "passed": best.passed} if best else None,
            # Savollar faqat topshira oladigan o'quvchiga ko'rsatiladi
            "questions": [
                {"id": q.id, "text": q.text, "options": [{"key": k, "text": t} for k, t in q.options()]}
                for q in questions
            ] if blocker is None else [],
        })


class QuizAttemptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        quiz = _get_quiz(slug)
        blocker = _blocker(request.user, quiz)
        if blocker:
            code = status.HTTP_429_TOO_MANY_REQUESTS if blocker[0] == "too_many" else status.HTTP_403_FORBIDDEN
            return Response({"detail": blocker[1], "code": blocker[0]}, status=code)

        questions = list(quiz.questions.all())
        if not questions:
            return Response({"detail": "Bu testga hali savol qo'shilmagan."}, status=status.HTTP_409_CONFLICT)

        answers = request.data.get("answers")
        if not isinstance(answers, dict):
            return Response({"detail": "Javoblar yuborilmadi."}, status=status.HTTP_400_BAD_REQUEST)

        correct = sum(1 for q in questions if str(answers.get(str(q.id), "")).upper() == q.correct)
        total = len(questions)
        percent = round(correct * 100 / total)
        passed = percent >= quiz.pass_percent
        QuizAttempt.objects.create(
            user=request.user, quiz=quiz, correct_count=correct, total=total, percent=percent, passed=passed,
        )
        if passed and quiz.points_reward:
            # Ball fon vazifasida beriladi; kalit tufayli bitta testga faqat bir marta
            emit(
                request.user, "quiz_passed", source="quiz", book_id=quiz.book_id,
                points_override=quiz.points_reward,
                description=f"Testdan o'tildi: {quiz.book.title}",
                idempotency_key=f"quiz:{quiz.pk}:{request.user.pk}",
            )
        return Response(
            {
                "correct_count": correct, "total": total, "percent": percent, "passed": passed,
                "pass_percent": quiz.pass_percent, "points_reward": quiz.points_reward if passed else 0,
            },
            status=status.HTTP_201_CREATED,
        )
