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
    points_balance = serializers.IntegerField(source="reader_stats.points_balance", default=0, read_only=True)
    points_lifetime = serializers.IntegerField(source="reader_stats.points_lifetime", default=0, read_only=True)
    level = serializers.CharField(source="reader_stats.level.name", default=None, read_only=True)

    class Meta:
        model = User
        fields = (
            "public_id", "username", "email", "first_name", "last_name",
            "role", "avatar", "timezone", "locale",
            "points_balance", "points_lifetime", "level",
        )
        read_only_fields = fields
