"""Test (viktorina): topshirish qoidalari, ball va admin panelning sodda formalari."""
from django.core.cache import cache
from django.test import TestCase, override_settings

from apps.accounts.models import Student, User
from apps.accounts.students import create_student, make_username, split_name
from apps.catalog.models import Book
from apps.gamification.models import GamificationEvent
from apps.reading.models import ReadingProgress

from .models import Question, Quiz, QuizAttempt


class QuizApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.book = Book.objects.create(title="Sinov kitobi", page_count=20, status=Book.Status.PUBLISHED)
        self.quiz = Quiz.objects.create(book=self.book, pass_percent=60, points_reward=40)
        self.q1 = Question.objects.create(quiz=self.quiz, text="1+1?", option_a="2", option_b="3", correct="A")
        self.q2 = Question.objects.create(quiz=self.quiz, text="Poytaxt?", option_a="Buxoro", option_b="Toshkent", correct="B")
        self.user = User.objects.create_user(username="u1", password="Kitob2026xyz", role="reader")
        self.url = f"/api/v1/books/{self.book.slug}/quiz"

    def _login(self):
        self.client.post("/api/v1/auth/login", {"login": "u1", "password": "Kitob2026xyz"}, content_type="application/json")

    def _finish_book(self):
        ReadingProgress.objects.create(user=self.user, book=self.book, status="completed", percent=100)

    def _submit(self, answers):
        return self.client.post(f"{self.url}/attempts", {"answers": answers}, content_type="application/json")

    def test_guest_cannot_see_quiz(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_locked_until_book_completed(self):
        self._login()
        data = self.client.get(self.url).json()
        self.assertFalse(data["can_attempt"])
        self.assertEqual(data["blocked_code"], "not_completed")
        self.assertEqual(data["questions"], [])  # savollar oldindan ko'rinmaydi
        self.assertEqual(self._submit({str(self.q1.id): "A"}).status_code, 403)

    def test_questions_never_expose_correct_answer(self):
        self._login()
        self._finish_book()
        data = self.client.get(self.url).json()
        self.assertTrue(data["can_attempt"])
        self.assertEqual(len(data["questions"]), 2)
        self.assertNotIn("correct", data["questions"][0])
        self.assertEqual([o["key"] for o in data["questions"][0]["options"]], ["A", "B"])  # bo'sh C, D chiqmaydi

    def test_pass_awards_points_once_and_blocks_retake(self):
        self._login()
        self._finish_book()
        r = self._submit({str(self.q1.id): "a", str(self.q2.id): "B"})  # kichik harf ham qabul qilinadi
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["percent"], r.json()["passed"], r.json()["points_reward"]), (100, True, 40))
        event = GamificationEvent.objects.get(user=self.user, event_type="quiz_passed")
        self.assertEqual(event.payload["points_override"], 40)
        self.assertEqual(self._submit({str(self.q1.id): "A"}).status_code, 403)  # o'tgan — qayta topshirmaydi
        self.assertEqual(QuizAttempt.objects.count(), 1)

    def test_fail_gives_no_points_and_daily_limit_applies(self):
        self._login()
        self._finish_book()
        for _ in range(3):
            r = self._submit({str(self.q1.id): "B", str(self.q2.id): "A"})
            self.assertEqual((r.status_code, r.json()["passed"]), (201, False))
        self.assertFalse(GamificationEvent.objects.filter(event_type="quiz_passed").exists())
        self.assertEqual(self._submit({str(self.q1.id): "A"}).status_code, 429)

    def test_quiz_points_reach_ledger_with_quiz_amount(self):
        """Hodisa fon vazifasida ishlanganda testning o'z mukofoti (40 XP) yoziladi, qoidadagi 30 emas."""
        from apps.accounts.models import ReaderStats
        from apps.gamification.tasks import process_events

        ReaderStats.objects.get_or_create(user=self.user)
        self._login()
        self._finish_book()
        self._submit({str(self.q1.id): "A", str(self.q2.id): "B"})
        process_events()
        self.assertEqual(ReaderStats.objects.get(user=self.user).points_lifetime, 40)

    def test_hidden_quiz_is_404(self):
        self.quiz.is_active = False
        self.quiz.save()
        self._login()
        self.assertEqual(self.client.get(self.url).status_code, 404)


class StudentAccountTests(TestCase):
    def test_username_is_built_from_name_and_stays_unique(self):
        self.assertEqual(make_username("Sardor", "Aliyev"), "sardor.aliyev")
        create_student("Sardor", "Aliyev")
        self.assertEqual(make_username("Sardor", "Aliyev"), "sardor.aliyev2")
        self.assertEqual(make_username("O'g'iloy", ""), "ogiloy")

    def test_split_name_puts_surname_first(self):
        self.assertEqual(split_name("Aliyev Sardor"), ("Sardor", "Aliyev"))
        self.assertEqual(split_name("Malika"), ("Malika", ""))

    def test_created_student_can_log_in_with_generated_password(self):
        cache.clear()
        student, password = create_student("Malika", "Karimova", "7-A")
        self.assertEqual((student.role, student.class_name, len(password)), ("reader", "7-A", 8))
        self.assertTrue(hasattr(student, "reader_stats"))
        r = self.client.post("/api/v1/auth/login", {"login": student.username, "password": password}, content_type="application/json")
        self.assertEqual(r.status_code, 200)

    def test_student_list_excludes_staff(self):
        create_student("Bekzod")
        User.objects.create_user(username="kutubxonachi", password="x", role="librarian")
        self.assertEqual(list(Student.objects.values_list("username", flat=True)), ["bekzod"])

    def test_librarian_role_grants_panel_access_without_manual_permissions(self):
        from apps.accounts.signals import sync_librarian_group

        sync_librarian_group()
        lib = User.objects.create_user(username="lib", password="x", role="librarian")
        lib = User.objects.get(pk=lib.pk)
        self.assertTrue(lib.is_staff)
        self.assertTrue(lib.has_perm("catalog.add_book"))
        self.assertTrue(lib.has_perm("quiz.add_quiz"))
        self.assertTrue(lib.has_perm("accounts.add_student"))
        self.assertFalse(lib.has_perm("accounts.change_user"))  # xodim hisoblariga tega olmaydi
        self.assertFalse(lib.has_perm("gamification.change_gamificationrule"))


# Sahifa chizilganda statik fayllar manifesti (collectstatic) talab qilinmasin
_PLAIN_STATIC = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


@override_settings(STORAGES=_PLAIN_STATIC)
class AdminPagesTests(TestCase):
    """Kutubxonachining uch asosiy sahifasi ochilishi va saqlashi."""

    def setUp(self):
        from apps.accounts.signals import sync_librarian_group

        sync_librarian_group()
        self.lib = User.objects.create_user(username="lib", password="Kitob2026xyz", role="librarian")
        self.client.force_login(self.lib)

    def test_pages_open_for_librarian(self):
        for path in ["/admin/", "/admin/catalog/book/", "/admin/catalog/book/add/", "/admin/accounts/student/",
                     "/admin/accounts/student/add/", "/admin/accounts/student/royxat/", "/admin/quiz/quiz/",
                     "/admin/quiz/quiz/add/", "/admin/quiz/quizattempt/"]:
            self.assertEqual(self.client.get(path).status_code, 200, path)
        self.assertEqual(self.client.get("/admin/accounts/user/").status_code, 403)

    def test_bulk_add_creates_students_and_shows_passwords_once(self):
        r = self.client.post("/admin/accounts/student/royxat/", {"class_name": "6-B", "names": "Aliyev Sardor\n\nKarimova Malika\n"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Student.objects.filter(class_name="6-B").count(), 2)
        self.assertContains(r, "aliyev")
        rows = r.context["rows"]
        self.assertEqual([row["name"] for row in rows], ["Sardor Aliyev", "Malika Karimova"])
        self.assertTrue(Student.objects.get(username=rows[0]["username"]).check_password(rows[0]["password"]))

    def test_single_add_generates_login(self):
        r = self.client.post("/admin/accounts/student/add/", {"first_name": "Dilnoza", "last_name": "Rahimova", "class_name": "5-A", "_save": "1"})
        self.assertEqual(r.status_code, 302)
        s = Student.objects.get(first_name="Dilnoza")
        self.assertEqual((s.username, s.role, s.has_usable_password()), ("dilnoza.rahimova", "reader", True))

    def test_book_add_creates_author_category_and_file(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.catalog.models import Category

        cat = Category.objects.create(name="Ertak")
        pdf = SimpleUploadedFile("kitob.pdf", b"%PDF-1.4 sinov", content_type="application/pdf")
        r = self.client.post("/admin/catalog/book/add/", {
            "title": "Yangi kitob", "mualliflar": "Abdulla Qodiriy,  Cho'lpon", "janrlar": [cat.pk],
            "description": "", "kitob_fayli": pdf, "language": "uz", "difficulty": "medium",
            "publisher": "", "publication_year": "", "auto_publish": "on", "_save": "1",
        })
        self.assertEqual(r.status_code, 302, getattr(r, "context", None) and r.context["adminform"].form.errors)
        book = Book.objects.get(title="Yangi kitob")
        self.assertEqual(list(book.authors.values_list("full_name", flat=True)), ["Abdulla Qodiriy", "Cho'lpon"])
        self.assertEqual(list(book.categories.all()), [cat])
        self.assertEqual(book.files.get().format, "pdf")
        self.assertEqual(book.created_by, self.lib)

    def test_book_add_rejects_wrong_file_type(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        r = self.client.post("/admin/catalog/book/add/", {
            "title": "Xato fayl", "kitob_fayli": SimpleUploadedFile("rasm.docx", b"abc"), "language": "uz",
            "difficulty": "medium", "_save": "1",
        })
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "Faqat PDF yoki EPUB")
        self.assertFalse(Book.objects.filter(title="Xato fayl").exists())

    def test_quiz_add_with_questions(self):
        book = Book.objects.create(title="Testli kitob", status=Book.Status.PUBLISHED)
        r = self.client.post("/admin/quiz/quiz/add/", {
            "book": book.pk, "title": "", "pass_percent": 60, "points_reward": 30, "require_completed": "on", "is_active": "on",
            "questions-TOTAL_FORMS": 2, "questions-INITIAL_FORMS": 0, "questions-MIN_NUM_FORMS": 0, "questions-MAX_NUM_FORMS": 1000,
            "questions-0-text": "Bosh qahramon kim?", "questions-0-option_a": "Otabek", "questions-0-option_b": "Anvar", "questions-0-correct": "A",
            "questions-1-text": "", "questions-1-option_a": "", "questions-1-option_b": "", "questions-1-correct": "",
            "_save": "1",
        })
        self.assertEqual(r.status_code, 302)
        quiz = Quiz.objects.get(book=book)
        self.assertEqual(quiz.questions.count(), 1)  # bo'sh qoldirilgan savol saqlanmaydi

    def test_question_with_empty_correct_option_is_rejected(self):
        book = Book.objects.create(title="Xato test", status=Book.Status.PUBLISHED)
        r = self.client.post("/admin/quiz/quiz/add/", {
            "book": book.pk, "title": "", "pass_percent": 60, "points_reward": 30,
            "questions-TOTAL_FORMS": 1, "questions-INITIAL_FORMS": 0, "questions-MIN_NUM_FORMS": 0, "questions-MAX_NUM_FORMS": 1000,
            "questions-0-text": "Savol?", "questions-0-option_a": "Ha", "questions-0-option_b": "Yo'q", "questions-0-correct": "D",
            "_save": "1",
        })
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Quiz.objects.filter(book=book).exists())
