from rest_framework import serializers

from .models import Badge, Level, PointTransaction, UserBadge


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ("code", "name", "min_points", "max_points", "icon", "color", "perks")


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ("code", "name", "description", "icon", "category", "tier", "points_reward")


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ("badge", "awarded_at", "points_awarded")


class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = ("public_id", "delta", "balance_after", "reason_code", "description", "created_at")
