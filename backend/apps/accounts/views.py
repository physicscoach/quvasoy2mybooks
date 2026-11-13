"""Royxatdan otish / kirish / yangilash / chiqish - JWT httpOnly cookie'da.

Access - `at` cookie, refresh - `rt` cookie (faqat `/api/v1/auth` yolida
korinadi). Refresh rotatsiyasi SIMPLE_JWT sozlamasida yoqilgan.
"""
from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ReaderStats, User
from .serializers import LoginSerializer, MeSerializer, RegisterSerializer


def _issue_tokens_for(user: User) -> RefreshToken:
    refresh = RefreshToken.for_user(user)
    refresh["token_version"] = user.token_version
    refresh.access_token["token_version"] = user.token_version
    return refresh


def _set_auth_cookies(response: Response, refresh: RefreshToken):
    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    refresh_lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]

    response.set_cookie(
        settings.AUTH_COOKIE_ACCESS,
        str(refresh.access_token),
        max_age=int(access_lifetime.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        settings.AUTH_COOKIE_REFRESH,
        str(refresh),
        max_age=int(refresh_lifetime.total_seconds()),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_REFRESH_PATH,
    )
    return response


def _clear_auth_cookies(response: Response):
    response.delete_cookie(settings.AUTH_COOKIE_ACCESS, path="/")
    response.delete_cookie(settings.AUTH_COOKIE_REFRESH, path=settings.AUTH_COOKIE_REFRESH_PATH)
    return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = _issue_tokens_for(user)
        response = Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)
        return _set_auth_cookies(response, refresh)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_id = serializer.validated_data["login"]
        password = serializer.validated_data["password"]
        # "login" maydoni username yoki email bo'lishi mumkin
        username = login_id
        if "@" in login_id:
            match = User.objects.filter(email__iexact=login_id).first()
            username = match.username if match else login_id
        user = authenticate(request, username=username, password=password)
        if user is None or user.deleted_at is not None:
            return Response({"detail": "Login yoki parol xato."}, status=status.HTTP_401_UNAUTHORIZED)

        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at"])
        ReaderStats.objects.get_or_create(user=user)

        refresh = _issue_tokens_for(user)
        response = Response(MeSerializer(user, context={"request": request}).data, status=status.HTTP_200_OK)
        return _set_auth_cookies(response, refresh)


class RefreshView(APIView):
    """Refresh cookie'dan yangi access + rotatsiyalangan refresh chiqaradi."""

    permission_classes = [AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if not raw_refresh:
            return Response({"detail": "Refresh token topilmadi."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_refresh = RefreshToken(raw_refresh)
            user = User.objects.get(id=old_refresh["user_id"])
            if old_refresh.get("token_version") != user.token_version or user.deleted_at is not None:
                raise TokenError("Token bekor qilingan.")

            if settings.SIMPLE_JWT.get("BLACKLIST_AFTER_ROTATION"):
                old_refresh.blacklist()

            new_refresh = _issue_tokens_for(user)
        except (TokenError, User.DoesNotExist):
            response = Response({"detail": "Refresh token yaroqsiz."}, status=status.HTTP_401_UNAUTHORIZED)
            return _clear_auth_cookies(response)

        response = Response({"detail": "Yangilandi."}, status=status.HTTP_200_OK)
        return _set_auth_cookies(response, new_refresh)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.AUTH_COOKIE_REFRESH)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass
        response = Response({"detail": "Chiqildi."}, status=status.HTTP_200_OK)
        return _clear_auth_cookies(response)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user, context={"request": request}).data)
