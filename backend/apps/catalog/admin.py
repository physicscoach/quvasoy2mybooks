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
        from django.contrib import messages

        published, skipped = 0, 0
        for book in queryset:
            blockers = book.publish_blockers()
            if blockers:
                skipped += 1
                self.message_user(
                    request,
                    f"'{book.title}' nashr qilinmadi: {', '.join(blockers)}.",
                    level=messages.WARNING,
                )
                continue
            book.status = Book.Status.PUBLISHED
            if book.published_at is None:
                book.published_at = timezone.now()
            book.save(update_fields=["status", "published_at", "updated_at"])
            published += 1
        if published:
            self.message_user(request, f"{published} ta kitob nashr qilindi.")
        if skipped and not published:
            self.message_user(request, f"{skipped} ta kitob nashr qilinmadi (yuqoriga qarang).", level=messages.WARNING)

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


def _recalc_rating(book):
    from django.db.models import Avg, Count

    from .models import Review

    agg = Review.objects.filter(book=book, moderation_status=Review.ModerationStatus.APPROVED).aggregate(
        avg=Avg("rating"), n=Count("id")
    )
    book.rating_avg = round(agg["avg"] or 0, 2)
    book.rating_count = agg["n"] or 0
    book.save(update_fields=["rating_avg", "rating_count"])


@admin.register(Review)
class ReviewAdmin(ModelAdmin):
    list_display = ("user", "book", "rating", "moderation_status", "created_at")
    list_filter = ("moderation_status", "rating")
    search_fields = ("user__username", "book__title")
    actions = ["approve_reviews", "reject_reviews"]

    @admin.action(description="Sharhlarni tasdiqlash")
    def approve_reviews(self, request, queryset):
        from apps.core.events import emit

        for review in queryset.exclude(moderation_status=Review.ModerationStatus.APPROVED):
            review.moderation_status = Review.ModerationStatus.APPROVED
            review.moderated_by = request.user
            review.moderated_at = timezone.now()
            review.save(update_fields=["moderation_status", "moderated_by", "moderated_at"])
            _recalc_rating(review.book)
            # tasdiqlangach ball (review_approved)
            emit(review.user, "review_approved", source="reviews", book_id=review.book_id,
                 idempotency_key=f"review:{review.book_id}:{review.user_id}")
        self.message_user(request, "Tanlangan sharhlar tasdiqlandi.")

    @admin.action(description="Sharhlarni rad etish")
    def reject_reviews(self, request, queryset):
        for review in queryset:
            review.moderation_status = Review.ModerationStatus.REJECTED
            review.moderated_by = request.user
            review.moderated_at = timezone.now()
            review.save(update_fields=["moderation_status", "moderated_by", "moderated_at"])
            _recalc_rating(review.book)
        self.message_user(request, "Tanlangan sharhlar rad etildi.")
