"""Umumiy sozlamalar. Reja: Elektron-Kutubxona-Loyiha-Rejasi.md"""
import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "0") == "1"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "django_q",
    "apps.core",
    "apps.accounts",
    "apps.catalog",
    "apps.ingestion",
    "apps.delivery",
    "apps.reading",
    "apps.gamification",
    "apps.integrity",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

if os.environ.get("POSTGRES_DB"):
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ.get("POSTGRES_USER", "kutubxona"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }}
else:
    DATABASES = {"default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "dev.sqlite3",
    }}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "data" / "derived"))
BOOKS_ROOT = Path(os.environ.get("BOOKS_ROOT", BASE_DIR / "data" / "books"))
INTERNAL_FILES_PREFIX = os.environ.get("INTERNAL_FILES_PREFIX", "/books")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
# SPA integratsiyasi: API slashsiz (DRF trailing_slash=False bilan mos)
APPEND_SLASH = False

# --- DRF: default YOPIQ (ruxsatni yozishni unutish ochiq endpoint bermaydi) ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "120/min",
        "login": "5/min",
        "register": "3/hour",
        "heartbeat": "6/min",
        "ticket": "30/hour",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Elektron kutubxona API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- JWT httpOnly cookie (reja: A ilovasi 4.3) ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "SIGNING_KEY": os.environ.get("JWT_SIGNING_KEY", SECRET_KEY),
}
AUTH_COOKIE_ACCESS = "at"
AUTH_COOKIE_REFRESH = "rt"
AUTH_COOKIE_SECURE = not DEBUG
AUTH_COOKIE_SAMESITE = "Lax"
AUTH_COOKIE_REFRESH_PATH = "/api/v1/auth"

# --- Fon vazifalari: django-q2, broker = Postgres (Redis yo'q; reja 9.3) ---
Q_CLUSTER = {
    "name": "kutubxona",
    "workers": 2,
    "timeout": 600,
    "retry": 900,
    "max_attempts": 3,
    "queue_limit": 50,
    "bulk": 5,
    "orm": "default",
    "catch_up": False,
}

# --- Fayl yetkazish; SystemSetting bazadan ustidan yozadi ---
DELIVERY_TICKET_TTL_READ = 120
DELIVERY_TICKET_TTL_DOWNLOAD = 60
DOWNLOAD_DAILY_LIMIT = 10
MAX_UPLOAD_SIZE_MB = 200

# --- Anti-cheat chegaralari (reja 6.3) ---
READING = {
    "HEARTBEAT_INTERVAL_SEC": 30,
    "BATCH_INTERVAL_SEC": 120,
    "MIN_PAGE_DWELL_SEC": 20,
    "MAX_PAGES_PER_HOUR": 60,
    "MAX_DAILY_CREDITED_SEC": 21600,
    "MAX_DAILY_PAGES": 400,
    "COMPLETION_MIN_PCT": 95,
    "COMPLETION_MIN_SESSIONS": 2,
    "IDLE_TIMEOUT_SEC": 60,
    "SESSION_TIMEOUT_SEC": 300,
}

UNFOLD = {
    "SITE_TITLE": "Elektron kutubxona",
    "SITE_HEADER": "Elektron kutubxona",
    "SITE_SYMBOL": "local_library",
    "SHOW_HISTORY": True,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}
