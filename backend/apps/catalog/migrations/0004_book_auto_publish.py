from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0003_alter_bookfile_file"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="auto_publish",
            field=models.BooleanField(
                default=False,
                help_text="Fayl tekshirilib bo'lgach kitob o'quvchilarga avtomatik ko'rinadi. Avval o'zingiz ko'rib chiqmoqchi bo'lsangiz, belgini olib tashlang.",
                verbose_name="Tayyor bo'lgach o'zi katalogga chiqsin",
            ),
        ),
    ]
