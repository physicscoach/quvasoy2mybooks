from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
AUTH_COOKIE_SECURE = False
# Devda alohida `qcluster` ishga tushirmasdan ham fayl qayta ishlansin (vazifa shu so'rovda bajariladi).
Q_CLUSTER = {**Q_CLUSTER, "sync": True}  # noqa: F405
# Dev: Next.js /api ni localhost:8000 ga proksi qiladi (next.config rewrites)
# -> bitta origin, CORS kerak emas.

# Admin'dagi «Saytga qaytish» dev'da Next.js (:3000) ga olib boradi
UNFOLD = {**UNFOLD, "SITE_URL": "http://localhost:3000/"}  # noqa: F405
