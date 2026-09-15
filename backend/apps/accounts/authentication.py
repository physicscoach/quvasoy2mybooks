"""JWT httpOnly cookie orqali autentifikatsiya (reja 11.3 / A-ilova 4.3)."""
from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class CookieJWTAuthentication(JWTAuthentication):
    """Access tokenni Authorization header o'rniga `at` cookie'dan o'qiydi.

    `token_version` ni user bilan solishtiradi — admin foydalanuvchini
    darhol tizimdan chiqarmoqchi bo'lsa, shu maydonni oshirishi kifoya.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.AUTH_COOKIE_ACCESS)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        token_version = validated_token.get("token_version")
        if token_version is not None and token_version != user.token_version:
            raise AuthenticationFailed("Token bekor qilingan, qaytadan kiring.")

        if user.deleted_at is not None:
            raise AuthenticationFailed("Hisob o'chirilgan.")

        return user, validated_token
