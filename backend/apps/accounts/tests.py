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
            {"username": "reader1", "password": "notogri"},
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
