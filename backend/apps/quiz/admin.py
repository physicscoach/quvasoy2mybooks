from django.contrib import admin
from django.db.models import Count, Q
from unfold.admin import ModelAdmin, StackedInline

from .models import Question, Quiz, QuizAttempt


class QuestionInline(StackedInline):
    model = Question
    extra = 3
    verbose_name = "Savol"
    verbose_name_plural = "Savollar — har biriga kamida ikkita variant yozing va to'g'risini belgilang"
    fields = ("text", ("option_a", "option_b"), ("option_c", "option_d"), "correct")


@admin.register(Quiz)
class QuizAdmin(ModelAdmin):
    list_display = ("nomi", "book", "savollar", "otganlar", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title", "book__title")
    autocomplete_fields = ("book",)
    inlines = [QuestionInline]
    fieldsets = (
        (None, {"fields": ("book", "title")}),
        ("Qoidalar", {"fields": (("pass_percent", "points_reward"), "require_completed", "is_active")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("book").annotate(
            _savollar=Count("questions", distinct=True),
            _otganlar=Count("attempts__user", filter=Q(attempts__passed=True), distinct=True),
        )

    @admin.display(description="Test")
    def nomi(self, obj):
        return obj.display_title

    @admin.display(description="Savollar", ordering="_savollar")
    def savollar(self, obj):
        return f"{obj._savollar} ta"

    @admin.display(description="O'tgan o'quvchilar", ordering="_otganlar")
    def otganlar(self, obj):
        return f"{obj._otganlar} ta"


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ModelAdmin):
    """Natijalar faqat ko'rish uchun — ularni o'quvchi topshirganda tizim yozadi."""

    list_display = ("user", "quiz", "natija", "passed", "created_at")
    list_filter = ("passed", "quiz")
    search_fields = ("user__username", "user__first_name", "user__last_name", "quiz__book__title")

    @admin.display(description="Natija")
    def natija(self, obj):
        return f"{obj.correct_count} / {obj.total} ({obj.percent}%)"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
