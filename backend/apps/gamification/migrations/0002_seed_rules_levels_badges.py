"""Boshlang'ich gamifikatsiya sozlamalari (reja 7.1 / 7.3 / 7.4 jadvallari)."""
from django.db import migrations


LEVELS = [
    {"code": "newbie", "name": "Yangi kitobxon", "min_points": 0, "max_points": 299, "sort_order": 1,
     "perks": {"daily_download_limit": 1}},
    {"code": "friend", "name": "Kitob dosti", "min_points": 300, "max_points": 999, "sort_order": 2,
     "perks": {"daily_download_limit": 2, "profile_frame": True}},
    {"code": "worm", "name": "Kitob qurti", "min_points": 1000, "max_points": 2499, "sort_order": 3,
     "perks": {"daily_download_limit": 3, "early_access": True}},
    {"code": "master", "name": "Kitobxon ustasi", "min_points": 2500, "max_points": 4999, "sort_order": 4,
     "perks": {"daily_download_limit": 5, "bookmark_export": True}},
    {"code": "bibliophile", "name": "Bibliofil", "min_points": 5000, "max_points": 9999, "sort_order": 5,
     "perks": {"daily_download_limit": 10, "suggest_book": True}},
    {"code": "legend", "name": "Kutubxona afsonasi", "min_points": 10000, "max_points": None, "sort_order": 6,
     "perks": {"daily_download_limit": 10, "hall_of_fame": True}},
]

RULES = [
    {"code": "book_started", "name": "Kitobni boshladi", "description": ">=3 validatsiyalangan sahifa oqildi",
     "points": 5, "max_per_object": 1},
    {"code": "pages_read", "name": "Sahifalar oqildi", "description": "Har 10 validatsiyalangan sahifa",
     "points": 3, "daily_cap_points": 120},
    {"code": "daily_goal", "name": "Kunlik maqsad", "description": "Kuniga >=20 daqiqa validatsiyalangan oqish",
     "points": 10, "daily_cap_points": 10},
    {"code": "book_completed", "name": "Kitob tugatildi", "description": "6.4-bolim shartlari",
     "points": 50, "max_per_object": 1},
    {"code": "streak_3", "name": "3 kunlik streak", "description": "Ketma-ket 3 kun", "points": 15, "max_per_object": None},
    {"code": "streak_7", "name": "7 kunlik streak", "description": "Ketma-ket 7 kun", "points": 40, "max_per_object": None},
    {"code": "streak_30", "name": "30 kunlik streak", "description": "Ketma-ket 30 kun", "points": 150, "max_per_object": None},
    {"code": "new_category", "name": "Yangi janr", "description": "Yangi janrdagi birinchi tugatilgan kitob",
     "points": 25, "max_per_object": 1},
    {"code": "review_approved", "name": "Sharh tasdiqlandi", "description": "Kitob tugatilgan bolsa",
     "points": 20, "max_per_object": 1},
]

BADGES = [
    {"code": "first_book", "name": "Birinchi qadam", "category": "reading", "tier": "bronze",
     "criteria": {"type": "books_completed", "threshold": 1}, "points_reward": 10, "sort_order": 1},
    {"code": "reader_10", "name": "Onlik", "category": "reading", "tier": "silver",
     "criteria": {"type": "books_completed", "threshold": 10}, "points_reward": 30, "sort_order": 2},
    {"code": "reader_50", "name": "Yarim yuzlik", "category": "reading", "tier": "gold",
     "criteria": {"type": "books_completed", "threshold": 50}, "points_reward": 100, "sort_order": 3},
    {"code": "streak_7", "name": "Bir hafta izchil", "category": "streak", "tier": "bronze",
     "criteria": {"type": "streak_days", "threshold": 7}, "points_reward": 20, "sort_order": 4},
    {"code": "streak_30", "name": "Oylik marafon", "category": "streak", "tier": "gold",
     "criteria": {"type": "streak_days", "threshold": 30}, "points_reward": 80, "sort_order": 5},
    {"code": "explorer_5", "name": "5 xil janr", "category": "reading", "tier": "silver",
     "criteria": {"type": "distinct_categories", "threshold": 5}, "points_reward": 30, "sort_order": 6},
    {"code": "marathon", "name": "Marafon", "category": "special", "tier": "gold",
     "criteria": {"type": "single_session_seconds", "threshold": 7200}, "points_reward": 25, "sort_order": 7},
    {"code": "night_owl", "name": "Tungi bugu", "category": "special", "tier": "silver",
     "criteria": {"type": "night_reading"}, "points_reward": 15, "is_secret": True, "sort_order": 8},
]


def seed(apps, schema_editor):
    Level = apps.get_model("gamification", "Level")
    GamificationRule = apps.get_model("gamification", "GamificationRule")
    Badge = apps.get_model("gamification", "Badge")

    for item in LEVELS:
        Level.objects.update_or_create(code=item["code"], defaults=item)

    for item in RULES:
        GamificationRule.objects.update_or_create(code=item["code"], defaults=item)

    for item in BADGES:
        Badge.objects.update_or_create(code=item["code"], defaults=item)


def unseed(apps, schema_editor):
    Level = apps.get_model("gamification", "Level")
    GamificationRule = apps.get_model("gamification", "GamificationRule")
    Badge = apps.get_model("gamification", "Badge")
    Level.objects.filter(code__in=[i["code"] for i in LEVELS]).delete()
    GamificationRule.objects.filter(code__in=[i["code"] for i in RULES]).delete()
    Badge.objects.filter(code__in=[i["code"] for i in BADGES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("gamification", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
