"""M2 — autentifikatsiya zanjiri regression testlari.

Qo'lda tekshirilgan holatlar shu yerda muhrlanadi: cookie httpOnly,
refresh rotatsiyasi, reuse-detection, token_version bilan bekor qilish.
"""
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.accounts.models import User

PWD = "Kitob2026xyz"
AT = settings.AUTH_COOKIE_ACCESS
RT = settings.AUTH_COOKIE_REFRESH


@override_settings(REST_FRAMEWORK={
    **settings.REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {**settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
                              "login": None, "register": None},
})
class AuthFlowTests(TestCase):
    def setUp(self):
        cache.clear()  # throttle holati testlar orasida oqib ketmasin

    def _register(self):
        return self.client.post(
            reverse("accounts:register"),
            {"username": "reader1", "email": "r1@example.com", "password": PWD},
            content_type="application/json",
        )

    def test_register_sets_httponly_cookies_and_reader_role(self):
        resp = self._register()
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["role"], "reader")
        self.assertTrue(resp.cookies[AT]["httponly"])
        self.assertTrue(resp.cookies[RT]["httponly"])
        # refresh cookie faqat auth yo'lida ko'rinadi
        self.assertEqual(resp.cookies[RT]["path"], settings.AUTH_COOKIE_REFRESH_PATH)

    def test_login_wrong_password_401(self):
        self._register()
        resp = self.client.post(
            reverse("accounts:login"),
            {"login": "reader1", "password": "notogri"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get(reverse("accounts:me")).status_code, 401)

    def test_refresh_rotates_and_old_token_rejected(self):
        self._register()
        old_rt = self.client.cookies[RT].value
        # 1-refresh — yangi rt beriladi, eskisi blacklist bo'ladi
        r1 = self.client.post(reverse("accounts:refresh"))
        self.assertEqual(r1.status_code, 200)
        # eski rt bilan qayta urinish — reuse, 401
        self.client.cookies[RT] = old_rt
        r2 = self.client.post(reverse("accounts:refresh"))
        self.assertEqual(r2.status_code, 401)

    def test_logout_clears_cookies(self):
        self._register()
        resp = self.client.post(reverse("accounts:logout"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.cookies[AT].value, "")
        self.assertEqual(resp.cookies[RT].value, "")

    def test_token_version_bump_revokes_access(self):
        self._register()
        self.assertEqual(self.client.get(reverse("accounts:me")).status_code, 200)
        user = User.objects.get(username="reader1")
        user.token_version += 1
        user.save(update_fields=["token_version"])
        # eski access endi bekor
        self.assertEqual(self.client.get(reverse("accounts:me")).status_code, 401)


class AdminUrlTests(TestCase):
    """Boshqaruv paneli manzili faqat xodimga beriladi (prod'da ADMIN_PATH maxfiy)."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(username="nodira", password="Kutub2026xyz", role="librarian")
        User.objects.create_user(username="oquvchi", password="Kitob2026xyz", role="reader")

    def _login(self, username, password):
        return self.client.post("/api/v1/auth/login", {"login": username, "password": password},
                                content_type="application/json")

    def test_reader_gets_no_admin_url(self):
        self.assertIsNone(self._login("oquvchi", "Kitob2026xyz").data["admin_url"])
        self.assertIsNone(self.client.get("/api/v1/auth/me").data["admin_url"])

    def test_librarian_gets_admin_url(self):
        data = self._login("nodira", "Kutub2026xyz").data
        self.assertTrue(data["admin_url"].endswith(reverse("admin:index")))


@override_settings(STORAGES={
    **settings.STORAGES,
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
})
class StudentBulkTests(TestCase):
    """Kutubxonachi o'quvchilarni ro'yxat bilan qo'shadi (B yo'l)."""

    def setUp(self):
        self.librarian = User.objects.create_user(
            "kutub", password=PWD, role=User.Role.LIBRARIAN, is_staff=True, is_superuser=True,
        )
        self.client.force_login(self.librarian)

    def test_helpers(self):
        from apps.accounts.students import clean_line, make_username, split_name

        self.assertEqual(clean_line("12. Aliyev  Sardor"), "Aliyev Sardor")
        self.assertEqual(clean_line("3)\tKarimova Malika"), "Karimova Malika")
        self.assertEqual(split_name("Aliyev Sardor Akmal o'g'li"), ("Sardor", "Aliyev"))
        self.assertEqual(make_username(*split_name("Алиев Шоҳрух")), "shohrux.aliev")
        self.assertEqual(make_username(*split_name("G'ulomova Mo'tabar")), "motabar.gulomova")

    def test_bulk_add_creates_and_skips_duplicates(self):
        url = reverse("admin:accounts_student_bulk")
        names = "1. Aliyev Sardor\n2. Karimova Malika\n\n3. Aliyev Sardor"
        resp = self.client.post(url, {"class_name": "7-A", "names": names})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.context["rows"]), 2)
        self.assertEqual(len(resp.context["skipped"]), 1)
        self.assertContains(resp, "kartochka")
        sardor = User.objects.get(username="sardor.aliyev")
        self.assertEqual((sardor.role, sardor.class_name), ("reader", "7-A"))
        self.assertTrue(hasattr(sardor, "reader_stats"))
        password = next(r["password"] for r in resp.context["rows"] if r["username"] == "sardor.aliyev")
        self.assertTrue(sardor.check_password(password))
        # ikkinchi marta yuborilsa — hech kim qayta yaratilmaydi
        resp = self.client.post(url, {"class_name": "7-A", "names": names})
        self.assertEqual(len(resp.context["rows"]), 0)
        self.assertEqual(User.objects.filter(role="reader").count(), 2)
