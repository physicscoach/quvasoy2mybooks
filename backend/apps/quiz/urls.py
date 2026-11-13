from django.urls import path

from .views import BookQuizView, QuizAttemptView

urlpatterns = [
    path("books/<slug:slug>/quiz", BookQuizView.as_view(), name="book-quiz"),
    path("books/<slug:slug>/quiz/attempts", QuizAttemptView.as_view(), name="book-quiz-attempts"),
]
