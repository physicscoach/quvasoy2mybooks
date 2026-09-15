from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import SystemSetting


@admin.register(SystemSetting)
class SystemSettingAdmin(ModelAdmin):
    list_display = ("key", "value_type", "is_public", "updated_at", "updated_by")
    list_filter = ("value_type", "is_public")
    search_fields = ("key", "description")
    readonly_fields = ("updated_at",)

    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
