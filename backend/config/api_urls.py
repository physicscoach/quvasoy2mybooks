"""API marshrutlari. Guruhlar reja A-ilova 9-bo'limiga mos."""
from django.urls import include, path

from apps.core.views import health

urlpatterns = [
    path("health", health, name="health"),
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.catalog.urls")),
    path("", include("apps.delivery.urls")),
    path("", include("apps.reading.urls")),
    path("", include("apps.gamification.urls")),
]
