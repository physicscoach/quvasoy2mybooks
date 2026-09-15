from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import DownloadLog


@admin.register(DownloadLog)
class DownloadLogAdmin(ModelAdmin):
    list_display = ("user", "file_name_snapshot", "file_format", "status", "created_at")
    list_filter = ("status", "file_format")
    search_fields = ("user__username", "file_name_snapshot", "watermark_id")
    readonly_fields = [f.name for f in DownloadLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
