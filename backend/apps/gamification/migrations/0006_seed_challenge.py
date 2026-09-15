from datetime import date, timedelta

from django.db import migrations


def seed(apps, schema_editor):
    Rule = apps.get_model("gamification", "GamificationRule")
    Rule.objects.update_or_create(
        code="challenge_completed",
        defaults={"name": "Challenge bajarildi", "points": 0, "is_active": True},
    )
    Challenge = apps.get_model("gamification", "Challenge")
    today = date.today()
    Challenge.objects.update_or_create(
        code="monthly_5_books",
        defaults={
            "name": "Oylik challenge: 5 kitob",
            "description": "Shu oy ichida 5 ta kitob o'qib tugating.",
            "icon": "📚", "challenge_type": "books_completed", "target": 5,
            "points_reward": 100, "start_date": today.replace(day=1),
            "end_date": today.replace(day=1) + timedelta(days=30), "is_active": True,
        },
    )


def unseed(apps, schema_editor):
    apps.get_model("gamification", "Challenge").objects.filter(code="monthly_5_books").delete()


class Migration(migrations.Migration):
    dependencies = [("gamification", "0005_challenge_userchallengeprogress")]
    operations = [migrations.RunPython(seed, unseed)]
