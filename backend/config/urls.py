import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

ADMIN_PATH = os.environ.get("ADMIN_PATH", "admin")

urlpatterns = [
    # APPEND_SLASH=False (API slash'siz) — admin'ga slash'siz kirilsa ham ochilsin
    path(ADMIN_PATH, RedirectView.as_view(url="/" + ADMIN_PATH + "/", permanent=False)),
    path(ADMIN_PATH + "/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
]

if settings.DEBUG:
    # API hujjatlari faqat dev'da ochiq (prod'da hujum yuzasini oshkor qilmaslik uchun)
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    ]
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
