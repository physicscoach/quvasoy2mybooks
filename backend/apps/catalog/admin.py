from pathlib import Path

from django import forms
from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html, format_html_join
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.widgets import (
    UnfoldAdminCheckboxSelectMultiple,
    UnfoldAdminFileFieldWidget,
    UnfoldAdminSelectWidget,
    UnfoldAdminTextInputWidget,
)

from .models import Author, Book, BookAuthor, BookCategory, BookFile, Category, Review

MAX_UPLOAD_MB = 200
LANGUAGES = [("uz", "O'zbekcha"), ("ru", "Ruscha"), ("en", "Inglizcha")]


class BookForm(forms.ModelForm):
    """Kitob qo'shish formasi: nom, muallif, janr va fayl — bitta sahifada.

    Muallif va janr alohida jadvallarda saqlanadi, lekin kutubxonachi buni bilishi
    shart emas: muallifni matn qilib yozadi, janrni belgilab qo'yadi.
    """

    mualliflar = forms.CharField(
        label="Muallif", required=False, widget=UnfoldAdminTextInputWidget,
        help_text="Bir nechta bo'lsa, vergul bilan ajrating: Abdulla Qodiriy, Cho'lpon",
    )
    janrlar = forms.ModelMultipleChoiceField(
        label="Janr", required=False, queryset=Category.objects.filter(is_active=True),
        widget=UnfoldAdminCheckboxSelectMultiple,
    )
    kitob_fayli = forms.FileField(
        label="Kitob fayli (PDF yoki EPUB)", required=False, widget=UnfoldAdminFileFieldWidget,
        help_text=f"Eng ko'pi {MAX_UPLOAD_MB} MB. Sahifalar soni va muqova fayldan avtomatik olinadi.",
    )
    language = forms.ChoiceField(label="Til", choices=LANGUAGES, widget=UnfoldAdminSelectWidget)

    class Meta:
        model = Book
        fields = (
            "title", "description", "cover", "language", "difficulty", "publisher", "publication_year",
            "is_downloadable", "is_featured", "auto_publish",
            # Kengaytirilgan (asl admin'da bor edi)
            "subtitle", "isbn13", "status", "protection_level", "rights_status",
            "completion_points", "min_reading_seconds", "published_at",
        )
        labels = {
            "title": "Kitob nomi",
            "description": "Qisqacha tavsif",
            "cover": "Muqova rasmi",
            "difficulty": "Qiyinligi",
            "is_downloadable": "O'quvchilar yuklab olishi mumkin",
            "is_featured": "Bosh sahifada tavsiya etilsin",
        }
        help_texts = {
            "description": "Kitob nima haqida — 2–3 gap. O'quvchi kitob sahifasida shuni ko'radi.",
            "cover": "Yuklamasangiz, muqova kitob faylining birinchi betidan olinadi.",
            "is_downloadable": "Yuklangan faylga o'quvchining ismi yozib qo'yiladi.",
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for name in self.OPTIONAL_CHOICES:
            if name in self.fields:
                self.fields[name].required = False
        book = self.instance
        if book and book.pk:
            self.fields["mualliflar"].initial = ", ".join(
                ba.author.full_name for ba in book.book_authors.select_related("author")
            )
            self.fields["janrlar"].initial = list(book.categories.values_list("pk", flat=True))
            self.fields["kitob_fayli"].label = "Faylni almashtirish (PDF yoki EPUB)"
            self.fields["kitob_fayli"].help_text = "Faqat fayl noto'g'ri yuklangan bo'lsa. Aks holda bo'sh qoldiring."
        else:
            self.fields["kitob_fayli"].required = True
            # Admin panel orqali qo'shilgan kitob sukut bo'yicha o'zi katalogga chiqadi
            self.fields["auto_publish"].initial = True

    # Kengaytirilgan sozlamalar yig'ilgan holda turadi — to'ldirilmasa joriy/standart qiymat qoladi
    OPTIONAL_CHOICES = ("status", "protection_level", "rights_status")

    def _keep_default(self, name):
        value = self.cleaned_data.get(name)
        if value:
            return value
        current = getattr(self.instance, name, None)
        return current or Book._meta.get_field(name).get_default()

    def clean_status(self):
        return self._keep_default("status")

    def clean_protection_level(self):
        return self._keep_default("protection_level")

    def clean_rights_status(self):
        return self._keep_default("rights_status")

    def clean_kitob_fayli(self):
        f = self.cleaned_data.get("kitob_fayli")
        if not f:
            return f
        ext = Path(f.name).suffix.lower()
        if ext not in (".pdf", ".epub"):
            raise forms.ValidationError("Faqat PDF yoki EPUB fayl yuklash mumkin.")
        if f.size > MAX_UPLOAD_MB * 1024 * 1024:
            raise forms.ValidationError(f"Fayl {MAX_UPLOAD_MB} MB dan katta. Kichikroq fayl yuklang.")
        return f


class BookFileInline(StackedInline):
    """Kitob fayllari: format, hajm, checksum, sahifalar va ishlov holati (asl admin'dagi kabi).
    Yangi fayl yuqoridagi «Kitob fayli» maydoni orqali yuklanadi."""

    model = BookFile
    extra = 0
    max_num = 0  # qo'shish — «Kitob fayli» maydoni orqali
    verbose_name_plural = "Kitob fayllari (tafsilotlar)"
    fields = (
        "format", "file", "size_bytes", "sha256", "page_count", "location_count",
        "is_primary", "is_downloadable", "processing_status", "processing_error",
    )
    readonly_fields = (
        "format", "file", "size_bytes", "sha256", "page_count", "location_count",
        "processing_status", "processing_error",
    )
    classes = ["collapse"]


class BookContributorInline(TabularInline):
    """Tarjimon, muharrir, diktor. Mualliflar yuqoridagi «Muallif» maydonida yoziladi."""

    model = BookAuthor
    extra = 0
    autocomplete_fields = ("author",)
    verbose_name = "Ishtirokchi"
    verbose_name_plural = "Tarjimon, muharrir, diktor"
    classes = ["collapse"]

    def get_queryset(self, request):
        return super().get_queryset(request).exclude(role=BookAuthor.Role.AUTHOR)

    def formfield_for_choice_field(self, db_field, request, **kwargs):
        if db_field.name == "role":
            kwargs["choices"] = [c for c in BookAuthor.Role.choices if c[0] != BookAuthor.Role.AUTHOR]
        return super().formfield_for_choice_field(db_field, request, **kwargs)


@admin.register(Book)
class BookAdmin(ModelAdmin):
    form = BookForm
    list_display = (
        "title", "mualliflari", "holati", "til", "betlar", "baho", "tavsiya", "yuklab_olish", "nashr_sanasi",
    )
    list_filter = ("status", "categories", "is_featured", "language", "difficulty", "protection_level", "is_downloadable")
    search_fields = ("title", "subtitle", "isbn13", "slug", "book_authors__author__full_name")
    readonly_fields = (
        "holati", "fayl_holati", "statistika",
        "public_id", "slug", "view_count", "reader_count", "completed_count",
        "download_count", "rating_avg", "rating_count", "created_by",
    )
    inlines = [BookFileInline, BookContributorInline]
    actions = ["publish_books", "unpublish_books"]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("book_authors__author", "files")

    def get_fieldsets(self, request, obj=None):
        main = ["title", "mualliflar", "janrlar", "description", "kitob_fayli"]
        if obj is not None:
            main = ["holati", *main, "fayl_holati"]
        fieldsets = [
            (None, {"fields": main}),
            ("Qo'shimcha (to'ldirish shart emas)", {
                "classes": ["collapse"],
                "fields": ("cover", ("language", "difficulty"), ("publisher", "publication_year"),
                           "is_featured", "is_downloadable", "auto_publish"),
            }),
        ]
        fieldsets.append(("Kengaytirilgan sozlamalar", {
            "classes": ["collapse"],
            "fields": (("subtitle", "isbn13"), ("status", "published_at"), ("protection_level", "rights_status"),
                       ("completion_points", "min_reading_seconds")),
        }))
        if obj is not None:
            fieldsets.append(("Statistika", {
                "classes": ["collapse"],
                "fields": ("statistika", ("view_count", "reader_count", "completed_count", "download_count"),
                           ("rating_avg", "rating_count"), ("public_id", "slug", "created_by")),
            }))
        return fieldsets

    # --- ko'rsatiladigan qiymatlar (ro'yxat ustunlari qisqa nom bilan)
    @admin.display(description="Til", ordering="language")
    def til(self, obj):
        return dict(LANGUAGES).get(obj.language, obj.language)

    @admin.display(description="Bet", ordering="page_count")
    def betlar(self, obj):
        return obj.page_count or "—"

    @admin.display(description="Baho", ordering="rating_avg")
    def baho(self, obj):
        return f"★ {obj.rating_avg:.1f} ({obj.rating_count})" if obj.rating_count else "—"

    @admin.display(description="Tavsiya", boolean=True, ordering="is_featured")
    def tavsiya(self, obj):
        return obj.is_featured

    @admin.display(description="Yuklab olish", boolean=True, ordering="is_downloadable")
    def yuklab_olish(self, obj):
        return obj.is_downloadable

    @admin.display(description="Nashr qilingan", ordering="published_at")
    def nashr_sanasi(self, obj):
        return obj.published_at.strftime("%d.%m.%Y") if obj.published_at else "—"

    @admin.display(description="Muallif")
    def mualliflari(self, obj):
        return ", ".join(ba.author.full_name for ba in obj.book_authors.all()) or "—"

    @admin.display(description="Holati", ordering="status")
    def holati(self, obj):
        colors = {
            Book.Status.PUBLISHED: "#17694c", Book.Status.READY: "#b87f00", Book.Status.PROCESSING: "#b87f00",
            Book.Status.DRAFT: "#6b7280", Book.Status.HIDDEN: "#6b7280",
        }
        text = {
            Book.Status.PUBLISHED: "Katalogda",
            Book.Status.READY: "Tayyor, chiqarilmagan",
            Book.Status.PROCESSING: "Fayl tekshirilmoqda",
            Book.Status.DRAFT: "Qoralama — fayl kutilmoqda",
            Book.Status.HIDDEN: "Yashirilgan",
        }
        return format_html('<span style="color:{};font-weight:600">{}</span>', colors.get(obj.status, "#6b7280"), text.get(obj.status, obj.get_status_display()))

    @admin.display(description="Yuklangan fayl")
    def fayl_holati(self, obj):
        files = list(obj.files.all())
        if not files:
            return "Fayl hali yuklanmagan."
        labels = {
            BookFile.ProcessingStatus.PENDING: "navbatda",
            BookFile.ProcessingStatus.PROCESSING: "tekshirilmoqda",
            BookFile.ProcessingStatus.READY: "tayyor",
            BookFile.ProcessingStatus.FAILED: "XATO",
        }
        return format_html_join(
            format_html("<br>"), "{} — {}{}",
            (
                (
                    f.original_filename or f"{f.get_format_display()} fayl",
                    labels.get(f.processing_status, f.processing_status),
                    f": {f.processing_error}" if f.processing_error else (f" ({f.page_count} bet)" if f.page_count else ""),
                )
                for f in files
            ),
        )

    @admin.display(description="Ko'rsatkichlar")
    def statistika(self, obj):
        return (
            f"O'qiyotganlar: {obj.reader_count} · Tugatganlar: {obj.completed_count} · "
            f"Yuklab olishlar: {obj.download_count} · Baho: {obj.rating_avg} ({obj.rating_count} ta)"
        )

    # --- saqlash
    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        book = form.instance

        # Mualliflar: matndan — bor bo'lsa topiladi, yo'q bo'lsa yaratiladi
        names = [" ".join(n.split()) for n in form.cleaned_data.get("mualliflar", "").split(",")]
        names = [n for n in names if n]
        BookAuthor.objects.filter(book=book, role=BookAuthor.Role.AUTHOR).delete()
        for position, name in enumerate(names):
            author = Author.objects.filter(full_name__iexact=name).first() or Author.objects.create(full_name=name)
            BookAuthor.objects.get_or_create(
                book=book, author=author, role=BookAuthor.Role.AUTHOR, defaults={"position": position},
            )

        # Janrlar
        chosen = list(form.cleaned_data.get("janrlar") or [])
        BookCategory.objects.filter(book=book).exclude(category__in=chosen).delete()
        for category in chosen:
            BookCategory.objects.get_or_create(book=book, category=category)

        # Fayl: yangisi yuklansa, o'sha formatdagi eskisi almashtiriladi
        upload = form.cleaned_data.get("kitob_fayli")
        if upload:
            fmt = "epub" if Path(upload.name).suffix.lower() == ".epub" else "pdf"
            BookFile.objects.filter(book=book, format=fmt).delete()
            BookFile.objects.create(
                book=book, format=fmt, file=upload, original_filename=upload.name[:255], size_bytes=upload.size,
                is_primary=not book.files.filter(is_primary=True).exists(),
                is_downloadable=book.is_downloadable, uploaded_by=request.user,
            )
            book.refresh_from_db()
            failed = book.files.filter(processing_status=BookFile.ProcessingStatus.FAILED).first()
            if failed:
                self.message_user(request, f"Fayl qabul qilinmadi: {failed.processing_error}", level=messages.ERROR)
            elif book.status == Book.Status.PUBLISHED:
                self.message_user(request, "Kitob katalogga chiqdi — o'quvchilar uni ko'ra oladi.")
            elif book.status == Book.Status.READY:
                self.message_user(request, "Fayl tayyor. Kitobni katalogga chiqarish uchun ro'yxatda uni belgilab, «Katalogga chiqarish»ni tanlang.")
            else:
                self.message_user(request, "Fayl qabul qilindi va tekshirilmoqda. Bir daqiqadan so'ng sahifani yangilang.")

    # --- amallar
    @admin.action(description="Katalogga chiqarish (o'quvchilarga ko'rsatish)")
    def publish_books(self, request, queryset):
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

    @admin.action(description="Katalogdan yashirish")
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
    fields = ("name", "parent", "sort_order", "is_active", "slug")


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
