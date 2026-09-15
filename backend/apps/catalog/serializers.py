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

    class Meta:
        model = Book
        fields = (
            "public_id", "title", "subtitle", "slug", "language", "cover",
            "cover_blurhash", "page_count", "difficulty", "is_downloadable",
            "is_featured", "rating_avg", "rating_count", "authors", "published_at",
        )

    def get_authors(self, obj):
        return [ba.author.full_name for ba in obj.book_authors.all()]


class BookDetailSerializer(serializers.ModelSerializer):
    authors = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    files = BookFilePublicSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = (
            "public_id", "title", "subtitle", "slug", "description", "language",
            "publisher", "publication_year", "cover", "cover_blurhash",
            "page_count", "word_count", "difficulty", "is_downloadable",
            "protection_level", "rating_avg", "rating_count", "reader_count",
            "completed_count", "authors", "categories", "files", "published_at",
        )

    def get_authors(self, obj):
        return [
            {"full_name": ba.author.full_name, "slug": ba.author.slug, "role": ba.role}
            for ba in obj.book_authors.all()
        ]

    def get_categories(self, obj):
        return [{"name": bc.category.name, "slug": bc.category.slug} for bc in obj.book_categories.all()]
