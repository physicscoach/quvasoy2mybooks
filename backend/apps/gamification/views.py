from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.models import ReaderStats

from .models import Badge, Level, PointTransaction, UserBadge
from .serializers import BadgeSerializer, LevelSerializer, PointTransactionSerializer, UserBadgeSerializer


class LevelListView(ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = LevelSerializer
    queryset = Level.objects.all().order_by("sort_order")


class BadgeListView(ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = BadgeSerializer
    queryset = Badge.objects.filter(is_active=True, is_secret=False).order_by("sort_order")


class MyBadgesView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserBadgeSerializer

    def get_queryset(self):
        return UserBadge.objects.filter(user=self.request.user).select_related("badge").order_by("-awarded_at")


class MyPointHistoryView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PointTransactionSerializer

    def get_queryset(self):
        return PointTransaction.objects.filter(user=self.request.user).order_by("-created_at")


class LeaderboardView(ListAPIView):
    """MVP'da alohida jadvalsiz - ReaderStats ustidan togridan-togri (reja 10.4)."""

    permission_classes = [AllowAny]
    pagination_class = None

    def get(self, request, *args, **kwargs):
        from rest_framework.response import Response

        top = (
            ReaderStats.objects.select_related("user")
            .order_by("-points_lifetime", "user_id")[:100]
        )
        data = [
            {
                "username": s.user.username,
                "points_lifetime": s.points_lifetime,
                "current_streak": s.current_streak,
                "level": s.level.name if s.level_id else None,
            }
            for s in top
        ]
        return Response(data)


class RewardListView(ListAPIView):
    permission_classes = [AllowAny]
    pagination_class = None

    def get_serializer_class(self):
        from .serializers import RewardSerializer
        return RewardSerializer

    def get_queryset(self):
        from .models import Reward
        return Reward.objects.filter(is_active=True).order_by("sort_order", "cost_points")


class RedeemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, code):
        from django.shortcuts import get_object_or_404
        from rest_framework import status
        from rest_framework.response import Response

        from .models import Reward
        from .serializers import RedemptionSerializer
        from .services import InsufficientPoints, OutOfStock, spend_points

        reward = get_object_or_404(Reward, code=code, is_active=True)
        try:
            redemption = spend_points(request.user, reward)
        except InsufficientPoints:
            return Response({"detail": "Tanga yetarli emas."}, status=status.HTTP_400_BAD_REQUEST)
        except OutOfStock:
            return Response({"detail": "Mukofot tugagan."}, status=status.HTTP_409_CONFLICT)
        return Response(RedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)
