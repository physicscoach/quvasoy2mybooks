from django.contrib import admin
from django.utils import timezone
from unfold.admin import ModelAdmin

from .models import SuspiciousActivity


@admin.register(SuspiciousActivity)
class SuspiciousActivityAdmin(ModelAdmin):
    list_display = ("user", "risk_score", "status", "window_start", "window_end", "created_at")
    list_filter = ("status", "risk_score")
    search_fields = ("user__username", "user__email")
    readonly_fields = ("user", "risk_score", "reasons", "window_start", "window_end", "created_at")
    actions = ["mark_ignored", "reverse_points", "block_users"]

    @admin.action(description="E'tiborsiz qoldirish")
    def mark_ignored(self, request, queryset):
        n = queryset.update(status=SuspiciousActivity.Status.IGNORED, reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f"{n} ta yozuv e'tiborsiz qoldirildi.")

    @admin.action(description="Ballni qaytarish (bekor qilish)")
    def reverse_points(self, request, queryset):
        from apps.gamification.services import reverse_user_points

        total = 0
        for sa in queryset:
            reversed_pts = reverse_user_points(sa.user, description=f"Anti-cheat #{sa.pk}")
            total += reversed_pts
            sa.status = SuspiciousActivity.Status.REVERSED
            sa.reviewed_by = request.user
            sa.reviewed_at = timezone.now()
            sa.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        self.message_user(request, f"Jami {total} ball qaytarildi.")

    @admin.action(description="Foydalanuvchini bloklash")
    def block_users(self, request, queryset):
        from apps.accounts.models import User

        for sa in queryset:
            User.objects.filter(pk=sa.user_id).update(is_active=False)
            sa.status = SuspiciousActivity.Status.BLOCKED
            sa.reviewed_by = request.user
            sa.reviewed_at = timezone.now()
            sa.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        self.message_user(request, f"{queryset.count()} ta foydalanuvchi bloklandi.")
