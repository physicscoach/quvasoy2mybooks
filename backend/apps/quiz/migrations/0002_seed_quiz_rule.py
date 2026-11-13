"""Testdan o'tgani uchun ball qoidasi. Ball miqdori har testda o'zi belgilanadi
(`Quiz.points_reward`), bu qoida — ledger yozuvi uchun asos va zaxira qiymat."""
from django.db import migrations


def seed(apps, schema_editor):
    GamificationRule = apps.get_model("gamification", "GamificationRule")
    GamificationRule.objects.get_or_create(
        code="quiz_passed",
        defaults={
            "name": "Testdan o'tildi",
            "description": "Kitob bo'yicha testdan o'tgani uchun. Miqdor testning o'zida belgilanadi.",
            "points": 30,
            "max_per_object": 1,
            "is_active": True,
        },
    )


def unseed(apps, schema_editor):
    apps.get_model("gamification", "GamificationRule").objects.filter(code="quiz_passed").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("quiz", "0001_initial"),
        ("gamification", "0006_seed_challenge"),
    ]

    operations = [migrations.RunPython(seed, unseed)]
