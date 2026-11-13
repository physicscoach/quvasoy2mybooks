"""Kutubxonachi roli berilganda admin panel ruxsatlari o'zi sozlanadi.

Administrator xodimga faqat "Kutubxonachi" rolini tanlaydi — `is_staff` belgisi va
kerakli ruxsatlar (guruh) shu yerda qo'yiladi, ruxsatlar jadvalini qo'lda belgilash shart emas.
"""
from django.contrib.auth.models import Group, Permission
from django.db.models.signals import post_migrate, post_save, pre_save
from django.dispatch import receiver

from .models import User

LIBRARIAN_GROUP = "Kutubxonachi"

# (app_label, model): ruxsat turlari
LIBRARIAN_PERMS = {
    ("catalog", "book"): ("add", "change", "view"),
    ("catalog", "author"): ("add", "change", "view"),
    ("catalog", "category"): ("view",),
    ("catalog", "review"): ("change", "view"),
    ("accounts", "student"): ("add", "change", "view"),
    ("quiz", "quiz"): ("add", "change", "delete", "view"),
    ("quiz", "question"): ("add", "change", "delete", "view"),
    ("quiz", "quizattempt"): ("view",),
}


def sync_librarian_group():
    group, _ = Group.objects.get_or_create(name=LIBRARIAN_GROUP)
    perms = []
    for (app_label, model), kinds in LIBRARIAN_PERMS.items():
        codenames = [f"{kind}_{model}" for kind in kinds]
        perms += list(Permission.objects.filter(content_type__app_label=app_label, codename__in=codenames))
    group.permissions.set(perms)
    return group


@receiver(post_migrate)
def _ensure_group(sender, **kwargs):
    # Barcha ilovalar migratsiyadan o'tgach bir marta — ruxsatlar shu paytda mavjud bo'ladi
    if sender.name == "apps.quiz":
        sync_librarian_group()


@receiver(pre_save, sender=User)
def _staff_flag_follows_role(sender, instance, **kwargs):
    if instance.role in (User.Role.LIBRARIAN, User.Role.ADMIN):
        instance.is_staff = True


@receiver(post_save, sender=User)
def _librarian_joins_group(sender, instance, **kwargs):
    group = Group.objects.filter(name=LIBRARIAN_GROUP).first()
    if group is None:
        return
    if instance.role == User.Role.LIBRARIAN:
        instance.groups.add(group)
    else:
        instance.groups.remove(group)
