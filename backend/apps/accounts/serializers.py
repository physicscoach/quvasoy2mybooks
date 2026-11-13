from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import ReaderStats, User


class RegisterSerializer(serializers.ModelSerializer):
    """Ro'yxatdan o'tish — faqat oq ro'yxatdagi maydonlar."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name")

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu email allaqachon royxatdan otgan.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data, role=User.Role.READER)
        user.set_password(password)
        user.save()
        ReaderStats.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(help_text="Foydalanuvchi nomi yoki email")
    password = serializers.CharField(write_only=True)


class MeSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()
    admin_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "public_id", "username", "email", "first_name", "last_name",
            "role", "avatar", "timezone", "locale", "stats", "admin_url",
        )
        read_only_fields = fields

    def get_admin_url(self, obj):
        """Boshqaruv paneli manzili — faqat kutubxonachi/administratorga (prod'da yo'l maxfiy)."""
        if obj.role not in (User.Role.LIBRARIAN, User.Role.ADMIN):
            return None
        from django.urls import reverse

        path = reverse("admin:index")
        request = self.context.get("request")
        if request is None:
            return path
        # Dev'da sayt :3000 da, admin esa Django'da (:8000) — to'liq manzil kerak.
        # Prod'da ikkalasi bitta domenda (Caddy), nisbiy yo'l yetarli.
        from django.conf import settings

        return request.build_absolute_uri(path) if settings.DEBUG else path

    def get_stats(self, obj):
        from apps.gamification.models import Level

        rs = getattr(obj, "reader_stats", None)
        if rs is None:
            return {
                "points_balance": 0, "points_lifetime": 0, "streak_days": 0,
                "longest_streak": 0, "last_activity_date": None,
                "level": {"title": "Yangi kitobxon", "min_points": 0, "next_level_min_points": None},
            }
        current = rs.level
        # keyingi daraja: joriy min_points'dan katta eng kichik min_points
        next_level = Level.objects.filter(min_points__gt=(current.min_points if current else 0)).order_by("min_points").first()
        return {
            "points_balance": rs.points_balance,
            "points_lifetime": rs.points_lifetime,
            "streak_days": rs.current_streak,
            "longest_streak": rs.longest_streak,
            "last_activity_date": rs.last_activity_date,
            "level": {
                "title": current.name if current else "Yangi kitobxon",
                "min_points": current.min_points if current else 0,
                "next_level_min_points": next_level.min_points if next_level else None,
            },
        }
