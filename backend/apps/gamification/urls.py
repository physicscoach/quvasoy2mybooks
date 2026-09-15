from django.urls import path

from .views import (
    BadgeListView, LeaderboardView, LevelListView, MyBadgesView,
    ChallengeListView, MyPointHistoryView, RedeemView, RewardListView,
)

urlpatterns = [
    path("levels", LevelListView.as_view(), name="levels"),
    path("badges", BadgeListView.as_view(), name="badges"),
    path("me/badges", MyBadgesView.as_view(), name="my-badges"),
    path("me/points", MyPointHistoryView.as_view(), name="my-points"),
    path("leaderboard", LeaderboardView.as_view(), name="leaderboard"),
    path("rewards", RewardListView.as_view(), name="rewards"),
    path("challenges", ChallengeListView.as_view(), name="challenges"),
    path("rewards/<str:code>/redeem", RedeemView.as_view(), name="reward-redeem"),
]
