from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import DailyActivity, ReadingHeartbeat, ReadingPageCredit, ReadingProgress, ReadingSession


@admin.register(ReadingSession)
class ReadingSessionAdmin(ModelAdmin):
    list_display = (
        "user", "book", "started_at", "ended_at", "validation_state",
        "suspicion_score", "points_awarded",
    )
    list_filter = ("validation_state", "end_reason")
    search_fields = ("user__username", "book__title")
    readonly_fields = [f.name for f in ReadingSession._meta.fields if f.name not in ("id",)]
    list_select_related = ("user", "book")

    def has_add_permission(self, request):
        return False


@admin.register(ReadingProgress)
class ReadingProgressAdmin(ModelAdmin):
    list_display = ("user", "book", "status", "percent", "last_read_at")
    list_filter = ("status",)
    search_fields = ("user__username", "book__title")
    list_select_related = ("user", "book")


@admin.register(DailyActivity)
class DailyActivityAdmin(ModelAdmin):
    list_display = ("user", "activity_date", "active_seconds", "pages_read", "counts_for_streak")
    list_filter = ("counts_for_streak",)
    search_fields = ("user__username",)


@admin.register(ReadingPageCredit)
class ReadingPageCreditAdmin(ModelAdmin):
    list_display = ("user", "book", "page", "credited_at")
    search_fields = ("user__username", "book__title")

    def has_add_permission(self, request):
        return False


@admin.register(ReadingHeartbeat)
class ReadingHeartbeatAdmin(ModelAdmin):
    list_display = ("session", "client_seq", "page", "active_seconds", "is_focused", "server_ts")
    search_fields = ("session__user__username",)

    def has_add_permission(self, request):
        return False
