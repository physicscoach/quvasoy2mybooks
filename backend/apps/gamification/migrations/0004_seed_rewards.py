from django.db import migrations

REWARDS = [
    ("frame_gold", "Oltin ramka", "Profilingizga oltin ramka.", "🖼️", "frame", 200, None, 1),
    ("title_bibliophile", "Bibliofil unvoni", "Profilda maxsus unvon.", "📛", "title", 500, None, 2),
    ("certificate_reader", "O'quvchi sertifikati", "Shaxsiy PDF sertifikat.", "📜", "certificate", 300, None, 3),
    ("download_boost", "Yuklash limiti +5", "1 oyga kunlik yuklash +5.", "⬇️", "download_boost", 150, None, 4),
]


def seed(apps, schema_editor):
    Reward = apps.get_model("gamification", "Reward")
    for code, name, desc, icon, rtype, cost, stock, order in REWARDS:
        Reward.objects.update_or_create(
            code=code,
            defaults={"name": name, "description": desc, "icon": icon,
                      "reward_type": rtype, "cost_points": cost, "stock": stock, "sort_order": order},
        )


def unseed(apps, schema_editor):
    apps.get_model("gamification", "Reward").objects.filter(
        code__in=[r[0] for r in REWARDS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("gamification", "0003_reward_rewardredemption")]
    operations = [migrations.RunPython(seed, unseed)]
