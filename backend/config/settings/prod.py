import os

from .base import *  # noqa: F403

from django.core.exceptions import ImproperlyConfigured

# Prod'da maxfiy kalitlar majburiy — default/bo'sh bilan ishga tushmaydi (M21 audit #2)
if os.environ.get("SECRET_KEY", "") in ("", "dev-insecure-change-me"):
    raise ImproperlyConfigured("SECRET_KEY muhit o'zgaruvchisi prod'da o'rnatilishi shart.")
if not os.environ.get("POSTGRES_PASSWORD"):
    raise ImproperlyConfigured("POSTGRES_PASSWORD prod'da o'rnatilishi shart.")

DEBUG = False
# Local Docker HTTP test uchun SSL_REDIRECT=0 qilinadi; prod'da default (1)
SECURE_SSL_REDIRECT = os.environ.get("SSL_REDIRECT", "1") == "1"
# Docker healthcheck ichkaridan http orqali so'raydi — 301 bo'lmasin
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health$"]
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "SAMEORIGIN"
CSRF_TRUSTED_ORIGINS = [
    "https://" + h for h in ALLOWED_HOSTS if h not in ("localhost", "127.0.0.1")  # noqa: F405
]
