from rest_framework import serializers

from .models import DailyActivity, ReadingProgress, ReadingSession


class OpenSessionSerializer(serializers.Serializer):
    book_public_id = serializers.UUIDField()
    book_file_public_id = serializers.UUIDField(required=False, allow_null=True)
    start_page = serializers.IntegerField(min_value=0, default=0)
    start_locator = serializers.CharField(required=False, allow_blank=True, default="")
    device_type = serializers.ChoiceField(choices=["desktop", "tablet", "mobile"], required=False, default="")
    device_fingerprint = serializers.CharField(required=False, allow_blank=True, default="")


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadingSession
        fields = (
            "public_id", "book", "book_file", "started_at", "ended_at",
            "start_page", "max_page", "validation_state", "points_awarded",
        )
        read_only_fields = fields


class HeartbeatItemSerializer(serializers.Serializer):
    client_seq = serializers.IntegerField(min_value=0)
    client_ts = serializers.DateTimeField()
    page = serializers.IntegerField(min_value=0)
    locator = serializers.CharField(required=False, allow_blank=True, default="")
    active_seconds = serializers.IntegerField(min_value=0, max_value=120)
    is_focused = serializers.BooleanField()
    scroll_delta = serializers.IntegerField(required=False, default=0)
    viewport_pct = serializers.IntegerField(required=False, allow_null=True, default=None)


class HeartbeatBatchSerializer(serializers.Serializer):
    session_public_id = serializers.UUIDField()
    heartbeats = HeartbeatItemSerializer(many=True)

    def validate_heartbeats(self, value):
        if not value:
            raise serializers.ValidationError("Kamida bitta heartbeat kerak.")
        if len(value) > 20:
            raise serializers.ValidationError("Bitta paketda juda kop heartbeat.")
        return value


class CloseSessionSerializer(serializers.Serializer):
    session_public_id = serializers.UUIDField()
    end_page = serializers.IntegerField(min_value=0, required=False)
    end_locator = serializers.CharField(required=False, allow_blank=True, default="")


class ReadingProgressSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(source="book.title", read_only=True)

    class Meta:
        model = ReadingProgress
        fields = (
            "book", "book_title", "status", "current_page", "max_page_reached",
            "current_locator", "percent", "total_active_seconds", "sessions_count",
            "started_at", "last_read_at", "completed_at", "is_favorite",
        )
        read_only_fields = fields


class DailyActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyActivity
        fields = ("activity_date", "active_seconds", "pages_read", "counts_for_streak")
