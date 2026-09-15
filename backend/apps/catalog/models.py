"""Katalog: muallif, janr, kitob, fayl, sharh (B ilova 1.2 - 1.3, 1.4 review)."""
from django.conf import settings
from django.db import models
from django.utils.text import slugify

from apps.core.models import TimeStampedModel


class Author(TimeStampedModel):
    full_name = models.CharField("Toliq ismi", max_length=255)
    slug = models.SlugField("Slug", max_length=280, unique=True, blank=True)
    bio = models.TextField("Tarjimai hol", blank=True, default="")
    photo = models.CharField("Rasm (fayl kaliti)", max_length=255, null=True, blank=True)
    birth_year = models.SmallIntegerField("Tugilgan yili", null=True, blank=True)
    death_year = models.SmallIntegerField("Vafot etgan yili", null=True, blank=True)
    books_count = models.PositiveIntegerField("Kitoblar soni (kesh)", default=0)

    class Meta:
        verbose_name = "Muallif"
        verbose_name_plural = "Mualliflar"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.full_name)[:280]
        super().save(*args, **kwargs)


class Category(TimeStampedModel):
    parent = models.ForeignKey(
        "self", verbose_name="Ota kategoriya", null=True, blank=True,
        on_delete=models.PROTECT, related_name="children",
    )
    name = models.CharField("Nomi", max_length=120)
    slug = models.SlugField("Slug", max_length=140, unique=True, blank=True)
    sort_order = models.SmallIntegerField("Tartib raqami", default=0)
    is_active = models.BooleanField("Faolmi", default=True)

    class Meta:
        verbose_name = "Janr / Kategoriya"
        verbose_name_plural = "Janrlar / Kategoriyalar"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:140]
        super().save(*args, **kwargs)


class Book(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        PROCESSING = "processing", "Qayta ishlanmoqda"
        READY = "ready", "Tayyor (nashr kutilmoqda)"
        PUBLISHED = "published", "Nashr qilingan"
        HIDDEN = "hidden", "Yashirilgan"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Oson"
        MEDIUM = "medium", "Ortacha"
        HARD = "hard", "Qiyin"

    class ProtectionLevel(models.TextChoices):
        STANDARD = "standard", "Standart (Range oqim + watermark)"
        HIGH = "high", "Yuqori (server render, v1)"

    class RightsStatus(models.TextChoices):
        PUBLIC_DOMAIN = "public_domain", "Jamoat mulki"
        LICENSED = "licensed", "Litsenziyalangan"
        PERMISSION_GRANTED = "permission_granted", "Ruxsat olingan"
        UNKNOWN = "unknown", "Nomalum"

    title = models.CharField("Sarlavha", max_length=300)
    subtitle = models.CharField("Kichik sarlavha", max_length=300, blank=True, default="")
    slug = models.SlugField("Slug", max_length=320, unique=True, blank=True)
    isbn13 = models.CharField("ISBN-13", max_length=13, null=True, blank=True, unique=True)
    description = models.TextField("Tavsif", blank=True, default="")
    language = models.CharField("Til", max_length=8, default="uz")
    publisher = models.CharField("Nashriyot", max_length=200, blank=True, default="")
    publication_year = models.SmallIntegerField("Nashr yili", null=True, blank=True)
    cover = models.ImageField("Muqova", upload_to="covers/", null=True, blank=True)
    cover_blurhash = models.CharField("Muqova blurhash", max_length=64, blank=True, default="")

    page_count = models.PositiveIntegerField("Sahifalar soni (kanonik)", default=0)
    word_count = models.PositiveIntegerField("Sozlar soni (EPUB)", null=True, blank=True)
    difficulty = models.CharField("Qiyinlik darajasi", max_length=16, choices=Difficulty.choices, default=Difficulty.MEDIUM)

    status = models.CharField("Holati", max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    is_downloadable = models.BooleanField("Yuklab olish mumkinmi (kitob darajasi)", default=False)
    is_featured = models.BooleanField("Tavsiya etilganmi", default=False)
    protection_level = models.CharField(
        "Himoya darajasi", max_length=16, choices=ProtectionLevel.choices, default=ProtectionLevel.STANDARD,
    )
    rights_status = models.CharField("Huquqiy holati", max_length=24, choices=RightsStatus.choices, default=RightsStatus.UNKNOWN)

    completion_points = models.PositiveIntegerField("Tugatish balli (qoidani bekor qiladi)", null=True, blank=True)
    min_reading_seconds = models.PositiveIntegerField("Tugatish uchun minimal faol vaqt, s", null=True, blank=True)

    published_at = models.DateTimeField("Nashr qilingan vaqti", null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Kim qoshgan",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    # Kesh maydonlari
    view_count = models.PositiveIntegerField("Korishlar (kesh)", default=0)
    reader_count = models.PositiveIntegerField("Ochganlar soni (kesh)", default=0)
    completed_count = models.PositiveIntegerField("Tugatganlar soni (kesh)", default=0)
    download_count = models.PositiveIntegerField("Yuklab olishlar (kesh)", default=0)
    rating_avg = models.DecimalField("Ortacha baho (kesh)", max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField("Baholar soni (kesh)", default=0)

    authors = models.ManyToManyField(Author, through="BookAuthor", related_name="books", verbose_name="Mualliflar")
    categories = models.ManyToManyField(Category, through="BookCategory", related_name="books", verbose_name="Janrlar")

    class Meta:
        verbose_name = "Kitob"
        verbose_name_plural = "Kitoblar"
        ordering = ["-published_at", "-created_at"]
        constraints = [
            models.CheckConstraint(check=models.Q(page_count__gte=0), name="book_page_count_gte_0"),
            models.CheckConstraint(
                check=models.Q(rating_avg__gte=0) & models.Q(rating_avg__lte=5),
                name="book_rating_avg_range",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "-published_at"], name="book_status_pubdate_idx"),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)[:320] or str(self.public_id)
        super().save(*args, **kwargs)


class BookAuthor(models.Model):
    class Role(models.TextChoices):
        AUTHOR = "author", "Muallif"
        TRANSLATOR = "translator", "Tarjimon"
        EDITOR = "editor", "Muharrir"
        NARRATOR = "narrator", "Diktor"

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="book_authors", verbose_name="Kitob")
    author = models.ForeignKey(Author, on_delete=models.PROTECT, related_name="author_books", verbose_name="Muallif")
    role = models.CharField("Roli", max_length=16, choices=Role.choices, default=Role.AUTHOR)
    position = models.SmallIntegerField("Korsatish tartibi", default=0)

    class Meta:
        verbose_name = "Kitob - Muallif"
        verbose_name_plural = "Kitob - Mualliflar"
        constraints = [
            models.UniqueConstraint(fields=["book", "author", "role"], name="uniq_book_author_role"),
        ]
        ordering = ["position"]


class BookCategory(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="book_categories", verbose_name="Kitob")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="category_books", verbose_name="Janr")

    class Meta:
        verbose_name = "Kitob - Janr"
        verbose_name_plural = "Kitob - Janrlar"
        constraints = [
            models.UniqueConstraint(fields=["book", "category"], name="uniq_book_category"),
        ]


class BookFile(TimeStampedModel):
    class Format(models.TextChoices):
        PDF = "pdf", "PDF"
        EPUB = "epub", "EPUB"

    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Navbatda"
        PROCESSING = "processing", "Ishlanmoqda"
        READY = "ready", "Tayyor"
        FAILED = "failed", "Xatolik"

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="files", verbose_name="Kitob")
    format = models.CharField("Format", max_length=8, choices=Format.choices)
    file = models.FileField("Fayl", upload_to="books/%Y/%m/")
    original_filename = models.CharField("Original fayl nomi", max_length=255, blank=True, default="")
    size_bytes = models.PositiveBigIntegerField("Hajmi, bayt", default=0)
    sha256 = models.CharField("SHA-256 checksum", max_length=64, unique=True, null=True, blank=True)
    page_count = models.PositiveIntegerField("Sahifalar soni (PDF)", null=True, blank=True)
    location_count = models.PositiveIntegerField("Lokatsiyalar soni (EPUB)", null=True, blank=True)
    is_primary = models.BooleanField("Asosiy fayl", default=False)
    is_downloadable = models.BooleanField("Yuklab olish mumkinmi (fayl darajasi)", default=False)
    processing_status = models.CharField(
        "Qayta ishlash holati", max_length=16, choices=ProcessingStatus.choices, default=ProcessingStatus.PENDING,
    )
    processing_error = models.TextField("Xatolik matni", blank=True, default="")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Kim yukladi",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )

    class Meta:
        verbose_name = "Kitob fayli"
        verbose_name_plural = "Kitob fayllari"
        constraints = [
            models.UniqueConstraint(fields=["book", "format"], name="uniq_book_format"),
            models.UniqueConstraint(
                fields=["book"], condition=models.Q(is_primary=True), name="uniq_book_primary_file",
            ),
        ]

    def __str__(self):
        return f"{self.book.title} ({self.format})"

    @property
    def is_ready(self):
        return self.processing_status == self.ProcessingStatus.READY


class Review(TimeStampedModel):
    """v1 uchun yozma model — MVP'da ishlatilmaydi (task talabiga kora)."""

    class ModerationStatus(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        APPROVED = "approved", "Tasdiqlangan"
        REJECTED = "rejected", "Rad etilgan"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews", verbose_name="Foydalanuvchi")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews", verbose_name="Kitob")
    rating = models.SmallIntegerField("Baho")
    body = models.TextField("Matn", blank=True, default="")
    moderation_status = models.CharField("Moderatsiya holati", max_length=16, choices=ModerationStatus.choices, default=ModerationStatus.PENDING)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="Kim tekshirdi",
        on_delete=models.SET_NULL, null=True, blank=True, related_name="+",
    )
    moderated_at = models.DateTimeField("Tekshirilgan vaqti", null=True, blank=True)
    rejection_note = models.CharField("Rad etish sababi", max_length=255, blank=True, default="")
    helpful_count = models.PositiveIntegerField("Foydali deganlar (kesh)", default=0)

    class Meta:
        verbose_name = "Sharh"
        verbose_name_plural = "Sharhlar"
        constraints = [
            models.UniqueConstraint(fields=["user", "book"], name="uniq_review_user_book"),
            models.CheckConstraint(check=models.Q(rating__gte=1) & models.Q(rating__lte=5), name="review_rating_range"),
        ]
