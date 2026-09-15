from django.contrib import admin
from django.utils import timezone
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from .models import Author, Book, BookAuthor, BookCategory, BookFile, Category, Review


class BookFileInline(StackedInline):
    model = BookFile
    extra = 0
    fields = (
        "format", "file", "size_bytes", "sha256", "page_count", "location_count",
        "is_primary", "is_downloadable", "processing_status", "processing_error",
    )
    readonly_fields = ("size_bytes", "sha256", "page_count", "location_count", "processing_status", "processing_error")


class BookAuthorInline(TabularInline):
    model = BookAuthor
    extra = 1
    autocomplete_fields = ("author",)


class BookCategoryInline(TabularInline):
    model = BookCategory
    extra = 1
    autocomplete_fields = ("category",)


@admin.register(Book)
class BookAdmin(ModelAdmin):
    list_display = ("title", "status", "language", "is_downloadable", "page_count", "rating_avg", "published_at")
    list_filter = ("status", "language", "difficulty", "protection_level", "is_downloadable")
    search_fields = ("title", "subtitle", "isbn13", "slug")
    readonly_fields = (
        "public_id", "slug", "view_count", "reader_count", "completed_count",
        "download_count", "rating_avg", "rating_count", "created_by",
    )
    inlines = [BookFileInline, BookAuthorInline, BookCategoryInline]
    actions = ["publish_books", "unpublish_books"]
    autocomplete_fields = []

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Tanlangan kitoblarni nashr qilish")
    def publish_books(self, request, queryset):
        updated = queryset.update(status=Book.Status.PUBLISHED, published_at=timezone.now())
        self.message_user(request, f"{updated} ta kitob nashr qilindi.")

    @admin.action(description="Tanlangan kitoblarni yashirish")
    def unpublish_books(self, request, queryset):
        updated = queryset.update(status=Book.Status.HIDDEN)
        self.message_user(request, f"{updated} ta kitob yashirildi.")


@admin.register(Author)
class AuthorAdmin(ModelAdmin):
    list_display = ("full_name", "birth_year", "death_year", "books_count")
    search_fields = ("full_name", "slug")
    readonly_fields = ("books_count", "slug")


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("name", "parent", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    readonly_fields = ("slug",)


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = ("user", "book", "rating", "moderation_status", "created_at")
    list_filter = ("moderation_status", "rating")
    search_fields = ("user__username", "book__title")
