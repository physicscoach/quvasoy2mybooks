"""Admin panel bosh sahifasi uchun ma'lumot: uch asosiy ish va e'tibor talab qiladigan narsalar."""
from django.urls import reverse


def dashboard_callback(request, context):
    from apps.accounts.models import Student
    from apps.catalog.models import Book, BookFile, Review
    from apps.quiz.models import Quiz

    user = request.user
    cards = []
    if user.has_perm("catalog.view_book"):
        cards.append({
            "icon": "menu_book", "title": "Kitoblar",
            "count": Book.objects.filter(status=Book.Status.PUBLISHED).count(), "count_label": "ta kitob katalogda",
            "primary": ("Kitob qo'shish", reverse("admin:catalog_book_add")) if user.has_perm("catalog.add_book") else None,
            "secondary": ("Hamma kitoblar", reverse("admin:catalog_book_changelist")),
        })
    if user.has_perm("accounts.view_student"):
        cards.append({
            "icon": "school", "title": "O'quvchilar",
            "count": Student.objects.filter(is_active=True).count(), "count_label": "ta o'quvchi",
            "primary": ("Ro'yxat bilan qo'shish", reverse("admin:accounts_student_bulk")) if user.has_perm("accounts.add_student") else None,
            "secondary": ("Hamma o'quvchilar", reverse("admin:accounts_student_changelist")),
        })
    if user.has_perm("quiz.view_quiz"):
        cards.append({
            "icon": "quiz", "title": "Testlar",
            "count": Quiz.objects.filter(is_active=True).count(), "count_label": "ta test",
            "primary": ("Test tuzish", reverse("admin:quiz_quiz_add")) if user.has_perm("quiz.add_quiz") else None,
            "secondary": ("Hamma testlar", reverse("admin:quiz_quiz_changelist")),
        })

    # E'tibor talab qiladigan ishlar — faqat bori ko'rsatiladi
    todos = []
    if user.has_perm("catalog.view_review"):
        n = Review.objects.filter(moderation_status=Review.ModerationStatus.PENDING).count()
        if n:
            todos.append((f"{n} ta sharh tasdiqlashingizni kutyapti", reverse("admin:catalog_review_changelist") + "?moderation_status__exact=pending"))
    if user.has_perm("catalog.view_book"):
        n = BookFile.objects.filter(processing_status=BookFile.ProcessingStatus.FAILED).values("book").distinct().count()
        if n:
            todos.append((f"{n} ta kitobning fayli qabul qilinmadi — qayta yuklash kerak", reverse("admin:catalog_book_changelist")))
        n = Book.objects.filter(status=Book.Status.READY).count()
        if n:
            todos.append((f"{n} ta kitob tayyor, lekin katalogga chiqarilmagan", reverse("admin:catalog_book_changelist") + "?status__exact=ready"))
        n = Book.objects.filter(status=Book.Status.PUBLISHED, quiz__isnull=True).count()
        if n and user.has_perm("quiz.add_quiz"):
            todos.append((f"{n} ta kitobga hali test tuzilmagan", reverse("admin:quiz_quiz_add")))

    context.update({"cards": cards, "todos": todos})
    return context
