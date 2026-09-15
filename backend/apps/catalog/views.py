"""Public katalog API - faqat AllowAny, faqat status=published korinadi."""
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny

from .models import Author, Book, BookAuthor, BookCategory, Category
from .serializers import AuthorSerializer, BookDetailSerializer, BookListSerializer, CategorySerializer


class BookViewSet(viewsets.ReadOnlyModelViewSet):
    """Katalog: royxat + detal. Qidiruv `search`, janr/til filtri."""

    permission_classes = [AllowAny]
    lookup_field = "slug"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        "language": ["exact"],
        "categories__slug": ["exact"],
        "difficulty": ["exact"],
    }
    search_fields = ["title", "subtitle", "description", "book_authors__author__full_name"]
    ordering_fields = ["published_at", "rating_avg", "title", "view_count"]
    ordering = ["-published_at"]

    def get_queryset(self):
        qs = Book.objects.filter(status=Book.Status.PUBLISHED)
        qs = qs.prefetch_related(
            "files",
            Prefetch("book_authors", queryset=BookAuthor.objects.select_related("author")),
            Prefetch("book_categories", queryset=BookCategory.objects.select_related("category")),
        )
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BookDetailSerializer
        return BookListSerializer


class AuthorViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    pagination_class = None
    lookup_field = "slug"
    serializer_class = AuthorSerializer
    queryset = Author.objects.all().order_by("full_name")
    filter_backends = [filters.SearchFilter]
    search_fields = ["full_name"]


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    pagination_class = None
    lookup_field = "slug"
    serializer_class = CategorySerializer
    queryset = Category.objects.filter(is_active=True).order_by("sort_order", "name")
