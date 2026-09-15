from django.urls import path

from .views import (
    CloseSessionView,
    HeartbeatBatchView,
    OpenSessionView,
    ProgressDetailView,
    ProgressListView,
)

urlpatterns = [
    path("reading/sessions/open/", OpenSessionView.as_view(), name="reading-session-open"),
    path("reading/sessions/close/", CloseSessionView.as_view(), name="reading-session-close"),
    path("reading/heartbeats/", HeartbeatBatchView.as_view(), name="reading-heartbeats"),
    path("reading/progress/", ProgressListView.as_view(), name="reading-progress-list"),
    path("reading/progress/<uuid:book_public_id>/", ProgressDetailView.as_view(), name="reading-progress-detail"),
]
