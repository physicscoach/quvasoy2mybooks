from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Badge, GamificationEvent, GamificationRule, Level, PointTransaction, UserBadge, Reward, RewardRedemption, Challenge


@admin.register(Level)
class LevelAdmin(ModelAdmin):
    list_display = ("name", "code", "min_points", "max_points", "sort_order")
    ordering = ("sort_order",)


@admin.register(GamificationRule)
class GamificationRuleAdmin(ModelAdmin):
    list_display = ("code", "name", "points", "daily_cap_points", "max_per_object", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(Badge)
class BadgeAdmin(ModelAdmin):
    list_display = ("name", "code", "category", "tier", "points_reward", "is_active", "is_secret")
    list_filter = ("category", "tier", "is_active", "is_secret")
    search_fields = ("code", "name")


@admin.register(UserBadge)
class UserBadgeAdmin(ModelAdmin):
    list_display = ("user", "badge", "awarded_at", "points_awarded")
    search_fields = ("user__username", "badge__code")
    list_select_related = ("user", "badge")


@admin.register(GamificationEvent)
class GamificationEventAdmin(ModelAdmin):
    list_display = ("event_type", "user", "status", "source", "created_at")
    list_filter = ("status", "event_type", "source")
    search_fields = ("user__username",)
    readonly_fields = ("created_at", "processed_at")


@admin.register(PointTransaction)
class PointTransactionAdmin(ModelAdmin):
    list_display = ("user", "delta", "balance_after", "reason_code", "created_at")
    list_filter = ("reason_code",)
    search_fields = ("user__username", "idempotency_key")
    readonly_fields = [f.name for f in PointTransaction._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Reward)
class RewardAdmin(ModelAdmin):
    list_display = ("name", "reward_type", "cost_points", "stock", "is_active")
    list_filter = ("reward_type", "is_active")
    search_fields = ("name", "code")


@admin.register(RewardRedemption)
class RewardRedemptionAdmin(ModelAdmin):
    list_display = ("user", "reward", "spent_points", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username", "reward__name")
    readonly_fields = ("user", "reward", "spent_points", "transaction", "created_at")


@admin.register(Challenge)
class ChallengeAdmin(ModelAdmin):
    list_display = ("name", "challenge_type", "target", "points_reward", "start_date", "end_date", "is_active")
    list_filter = ("challenge_type", "is_active")
    search_fields = ("name", "code")
