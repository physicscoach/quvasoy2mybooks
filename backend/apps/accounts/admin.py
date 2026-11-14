from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.shortcuts import redirect, render
from django.urls import path, reverse
from unfold.admin import ModelAdmin
from unfold.decorators import action
from unfold.widgets import UnfoldAdminTextareaWidget, UnfoldAdminTextInputWidget

from .models import ReaderStats, Student, User
from .students import clean_line, create_student, find_existing, reset_password, split_name


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    """Barcha hisoblar (xodimlar ham) — faqat administrator uchun. O'quvchilar uchun `StudentAdmin`."""

    list_display = ("username", "email", "first_name", "last_name", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    readonly_fields = ("public_id", "token_version", "last_login_at", "date_joined")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Loyihaga oid", {"fields": ("role", "class_name", "avatar", "timezone", "locale", "token_version", "public_id", "deleted_at")}),
    )


class StudentAddForm(forms.ModelForm):
    """Yangi o'quvchi: faqat ism kerak — login va parolni tizim o'zi beradi."""

    class Meta:
        model = Student
        fields = ("first_name", "last_name", "class_name")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["first_name"].required = True
        self.fields["first_name"].label = "Ismi"
        self.fields["last_name"].label = "Familiyasi"


class StudentChangeForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = ("first_name", "last_name", "class_name", "username", "is_active")
        labels = {
            "first_name": "Ismi", "last_name": "Familiyasi", "username": "Login",
            "is_active": "Hisob faol",
        }
        help_texts = {
            "username": "O'quvchi saytga shu login bilan kiradi.",
            "is_active": "Belgini olib tashlasangiz, o'quvchi saytga kira olmaydi (hisob o'chirilmaydi).",
        }


class BulkStudentsForm(forms.Form):
    class_name = forms.CharField(
        label="Sinf", max_length=16, required=False, widget=UnfoldAdminTextInputWidget,
        help_text="Masalan: 7-A. Ro'yxatdagi hamma o'quvchiga shu sinf yoziladi.",
    )
    names = forms.CharField(
        label="O'quvchilar ro'yxati",
        widget=UnfoldAdminTextareaWidget(attrs={"rows": 12, "placeholder": "Aliyev Sardor\nKarimova Malika\nYusupov Bekzod"}),
        help_text="Har qatorga bitta o'quvchi: avval familiyasi, keyin ismi. Jurnaldan nusxalab qo'yishingiz mumkin.",
    )

    def clean_names(self):
        lines = [clean_line(line) for line in self.cleaned_data["names"].splitlines()]
        lines = [line for line in lines if line]
        if not lines:
            raise forms.ValidationError("Kamida bitta ism yozing.")
        if len(lines) > 200:
            raise forms.ValidationError("Bir martada ko'pi bilan 200 ta o'quvchi qo'shish mumkin.")
        return lines


@admin.register(Student)
class StudentAdmin(ModelAdmin):
    """Kutubxonachi uchun sodda "O'quvchilar" bo'limi."""

    list_display = ("ism", "username", "class_name", "xp", "seriya", "oxirgi_faollik", "is_active")
    list_filter = ("class_name", "is_active")
    search_fields = ("username", "first_name", "last_name", "class_name")
    ordering = ("class_name", "last_name", "first_name")
    actions = ["yangi_parol_berish"]
    actions_list = ["royxat_bilan_qoshish"]
    readonly_fields = ("korsatkichlar",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("reader_stats", "reader_stats__level")

    # --- ro'yxat ustunlari
    @admin.display(description="O'quvchi", ordering="last_name")
    def ism(self, obj):
        return obj.get_full_name() or obj.username

    @admin.display(description="XP", ordering="reader_stats__points_lifetime")
    def xp(self, obj):
        stats = getattr(obj, "reader_stats", None)
        return stats.points_lifetime if stats else 0

    @admin.display(description="Seriya", ordering="reader_stats__current_streak")
    def seriya(self, obj):
        stats = getattr(obj, "reader_stats", None)
        return f"{stats.current_streak} kun" if stats and stats.current_streak else "—"

    @admin.display(description="Oxirgi marta o'qigan", ordering="reader_stats__last_activity_date")
    def oxirgi_faollik(self, obj):
        stats = getattr(obj, "reader_stats", None)
        return stats.last_activity_date if stats and stats.last_activity_date else "hali o'qimagan"

    @admin.display(description="Ko'rsatkichlari")
    def korsatkichlar(self, obj):
        stats = getattr(obj, "reader_stats", None)
        if not stats:
            return "Hali o'qimagan."
        level = stats.level.name if stats.level_id else "Yangi kitobxon"
        return (
            f"Daraja: {level} · XP: {stats.points_lifetime} · Tanga: {stats.points_balance} · "
            f"Seriya: {stats.current_streak} kun · Tugatgan kitoblari: {stats.books_completed}"
        )

    # --- formalar
    def get_form(self, request, obj=None, **kwargs):
        kwargs["form"] = StudentAddForm if obj is None else StudentChangeForm
        return super().get_form(request, obj, **kwargs)

    def get_fieldsets(self, request, obj=None):
        if obj is None:
            return ((None, {
                "fields": ("first_name", "last_name", "class_name"),
                "description": "Login va parolni tizim o'zi yaratadi va saqlaganingizdan keyin ko'rsatadi.",
            }),)
        return (
            (None, {"fields": (("first_name", "last_name"), "class_name", "username", "is_active")}),
            ("O'qish natijalari", {"fields": ("korsatkichlar",)}),
        )

    def save_model(self, request, obj, form, change):
        if change:
            super().save_model(request, obj, form, change)
            return
        student, password = create_student(
            form.cleaned_data["first_name"], form.cleaned_data.get("last_name", ""),
            form.cleaned_data.get("class_name", ""),
        )
        obj.pk = student.pk
        obj.username = student.username
        self.message_user(
            request,
            f"Login: {student.username}   Parol: {password}   — hozir yozib oling, parol qayta ko'rsatilmaydi.",
            level=messages.WARNING,
        )

    # --- ro'yxat bilan qo'shish va parol yangilash
    def get_urls(self):
        custom = [
            path("royxat/", self.admin_site.admin_view(self.bulk_add_view), name="accounts_student_bulk"),
        ]
        return custom + super().get_urls()

    @action(description="Ro'yxat bilan qo'shish", url_path="royxat-bilan")
    def royxat_bilan_qoshish(self, request):
        return redirect(reverse("admin:accounts_student_bulk"))

    def _context(self, request, **extra):
        from django.conf import settings

        site = getattr(settings, "UNFOLD", {}).get("SITE_URL", "/")
        site_label = site.split("://", 1)[-1].rstrip("/") if "://" in site else ""
        return {
            **self.admin_site.each_context(request),
            "site_label": site_label,
            "opts": self.model._meta,
            "changelist_url": reverse("admin:accounts_student_changelist"),
            **extra,
        }

    def bulk_add_view(self, request):
        if not self.has_add_permission(request):
            from django.core.exceptions import PermissionDenied

            raise PermissionDenied
        form = BulkStudentsForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            class_name = form.cleaned_data["class_name"]
            rows, skipped = [], []
            for line in form.cleaned_data["names"]:
                first, last = split_name(line)
                existing = find_existing(first, last, class_name)
                if existing:
                    skipped.append({"name": existing.get_full_name(), "username": existing.username})
                    continue
                student, password = create_student(first, last, class_name)
                rows.append({"name": student.get_full_name(), "username": student.username,
                             "password": password, "class_name": student.class_name})
            return render(request, "admin/accounts/student/credentials.html", self._context(
                request, title=f"{len(rows)} ta o'quvchi qo'shildi", rows=rows, skipped=skipped,
                class_name=class_name,
            ))
        return render(request, "admin/accounts/student/bulk_add.html", self._context(
            request, title="O'quvchilarni ro'yxat bilan qo'shish", form=form,
        ))

    @admin.action(description="Tanlanganlarga yangi parol berish")
    def yangi_parol_berish(self, request, queryset):
        rows = [
            {"name": s.get_full_name() or s.username, "username": s.username,
             "password": reset_password(s), "class_name": s.class_name}
            for s in queryset.order_by("class_name", "last_name", "first_name")
        ]
        return render(request, "admin/accounts/student/credentials.html", self._context(
            request, title=f"{len(rows)} ta o'quvchiga yangi parol berildi", rows=rows, class_name="",
        ))


@admin.register(ReaderStats)
class ReaderStatsAdmin(ModelAdmin):
    list_display = ("user", "points_balance", "points_lifetime", "level", "current_streak", "longest_streak")
    list_filter = ("level",)
    search_fields = ("user__username", "user__email")
    autocomplete_fields = ("user",)
