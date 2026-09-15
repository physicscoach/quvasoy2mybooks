from django.urls import path

from .views import BadgeListView, LeaderboardView, LevelListView, MyBadgesView, MyPointHistoryView

urlpatterns = [
    path("levels", LevelListView.as_view(), name="levels"),
    path("badges", BadgeListView.as_view(), name="badges"),
    path("me/badges", MyBadgesView.as_view(), name="my-badges"),
    path("me/points", MyPointHistoryView.as_view(), name="my-points"),
    path("leaderboard", LeaderboardView.as_view(), name="leaderboard"),
]
