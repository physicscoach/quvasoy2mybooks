"""Umumiy DRF permission klasslari. Barcha app'lar shundan foydalanadi."""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsLibrarian(BasePermission):
    """Kutubxonachi yoki admin ruxsati."""

    message = "Bu amal faqat kutubxonachi yoki administratorga ruxsat etilgan."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in ("librarian", "admin")
        )


class IsAdmin(BasePermission):
    """Faqat administrator."""

    message = "Bu amal faqat administratorga ruxsat etilgan."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")


class IsOwner(BasePermission):
    """Obyekt darajasidagi tekshiruv — foydalanuvchi faqat o'ziniki bilan ishlaydi.

    Obyektda `user` yoki `user_id` maydoni bo'lishi kutiladi.
    """

    message = "Bu obyekt sizga tegishli emas."

    def has_object_permission(self, request, view, obj):
        owner_id = getattr(obj, "user_id", None)
        if owner_id is None:
            owner = getattr(obj, "user", None)
            owner_id = getattr(owner, "id", None)
        return bool(request.user and request.user.is_authenticated and owner_id == request.user.id)


class ReadOnlyOrIsOwner(IsOwner):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return super().has_object_permission(request, view, obj)
