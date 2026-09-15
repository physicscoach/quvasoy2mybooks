from rest_framework import serializers

from .models import Author, Book, BookFile, Category


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Author
        fields = ("public_id", "full_name", "slug", "bio", "photo", "birth_year", "death_year", "books_count")


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "parent", "name", "slug", "sort_order")


class BookFilePublicSerializer(serializers.ModelSerializer):
    """Reader uchun - storage_key/fayl yolini hech qachon ochmaydi."""

    class Meta:
        model = BookFile
        fields = ("public_id", "format", "page_count", "location_count", "is_primary", "is_downloadable")


class BookListSerializer(serializers.ModelSerializer):
    authors = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    formats = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = (
            "public_id", "title", "subtitle", "slug", "language", "cover_url",
            "cover_blurhash", "page_count", "difficulty", "is_downloadable",
            "is_featured", "rating_avg", "rating_count", "authors", "formats",
            "published_at",
        )

    def get_authors(self, obj):
        return [ba.author.full_name for ba in obj.book_authors.all()]

    def get_cover_url(self, obj):
        if not obj.cover:
            return None
        request = self.context.get("request")
        url = obj.cover.url
        return request.build_absolute_uri(url) if request else url

    def get_formats(self, obj):
        # files prefetch qilingan (get_queryset) -> qo'shimcha so'rov yo'q
        return sorted({f.format for f in obj.files.all()})


class BookDetailSerializer(serializers.ModelSerializer):
    authors = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    files = BookFilePublicSerializer(many=True, read_only=True)
    cover_url = serializers.SerializerMethodField()

    def get_cover_url(self, obj):
        if not obj.cover:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.cover.url) if request else obj.cover.url

    class Meta:
        model = Book
        fields = (
            "public_id", "title", "subtitle", "slug", "description", "language",
            "publisher", "publication_year", "cover_blurhash",
            "page_count", "word_count", "difficulty", "is_downloadable",
            "protection_level", "rating_avg", "rating_count", "reader_count",
            "completed_count", "authors", "categories", "files", "cover_url", "published_at",
        )

    def get_authors(self, obj):
        return [
            {"full_name": ba.author.full_name, "slug": ba.author.slug, "role": ba.role}
            for ba in obj.book_authors.all()
        ]

    def get_categories(self, obj):
        return [{"name": bc.category.name, "slug": bc.category.slug} for bc in obj.book_categories.all()]
