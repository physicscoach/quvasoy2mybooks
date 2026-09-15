"""django-q2 Schedule yozuvlarini o'rnatadi (prod deploy'da bir marta)."""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Telemetriya/gamifikatsiya fon vazifalari uchun django-q2 Schedule yaratadi."

    def handle(self, *args, **options):
        from django_q.models import Schedule

        specs = [
            ("apps.reading.tasks.flush_dirty_sessions", 1),
            ("apps.reading.tasks.close_stale_sessions", 2),
            ("apps.gamification.tasks.process_events", 1),
            ("apps.integrity.tasks.scan_users", 1440),
        ]
        created = 0
        for func, minutes in specs:
            _, was_created = Schedule.objects.get_or_create(
                func=func,
                defaults={"schedule_type": Schedule.MINUTES, "minutes": minutes, "repeats": -1},
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"{created} ta yangi Schedule yaratildi."))
