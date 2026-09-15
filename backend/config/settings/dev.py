from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
AUTH_COOKIE_SECURE = False
# Dev: Next.js /api ni localhost:8000 ga proksi qiladi (next.config rewrites)
# -> bitta origin, CORS kerak emas.
