import os

from .base import *  # noqa: F403

DEBUG = False
# Local Docker HTTP test uchun SSL_REDIRECT=0 qilinadi; prod'da default (1)
SECURE_SSL_REDIRECT = os.environ.get("SSL_REDIRECT", "1") == "1"
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
