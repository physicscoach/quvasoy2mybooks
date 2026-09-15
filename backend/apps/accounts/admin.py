from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from unfold.admin import ModelAdmin

from .models import ReaderStats, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    list_display = ("username", "email", "role", "is_active", "date_joined")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    readonly_fields = ("public_id", "token_version", "last_login_at", "date_joined")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Loyihaga oid", {"fields": ("role", "avatar", "timezone", "locale", "token_version", "public_id", "deleted_at")}),
    )


@admin.register(ReaderStats)
class ReaderStatsAdmin(ModelAdmin):
    list_display = ("user", "points_balance", "points_lifetime", "level", "current_streak", "longest_streak")
    list_filter = ("level",)
    search_fields = ("user__username", "user__email")
    autocomplete_fields = ("user",)
