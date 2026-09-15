"""Telemetriya va gamifikatsiyani qo'lda ishga tushiradi (django-q2 Schedule o'rniga dev/cron).

Ishlatish: python manage.py process_reading
Prod'da django-q2 Schedule bilan har 60s avtomatik chaqiriladi.
"""
from django.core.management.base import BaseCommand

from apps.gamification.tasks import process_events
from apps.reading.tasks import close_stale_sessions, flush_dirty_sessions


class Command(BaseCommand):
    help = "Osilgan seanslarni yopadi, telemetriyani validatsiya qiladi, ballni beradi."

    def handle(self, *args, **options):
        stale = close_stale_sessions()
        flushed = flush_dirty_sessions()
        events = process_events()
        self.stdout.write(self.style.SUCCESS(
            f"Yopilgan: {stale['closed']} | Validatsiya: {flushed['processed']} | "
            f"Ball hodisalari: {events['processed']} (xato: {events['failed']})"
        ))
