"""Public katalog API - faqat AllowAny, faqat status=published korinadi."""
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Author, Book, BookAuthor, BookCategory, Category, Review
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


class RecentReviewsView(APIView):
    """GET: so'nggi tasdiqlangan, matnli sharhlar (bosh sahifa uchun, ochiq)."""

    permission_classes = [AllowAny]
    LIMIT = 9

    def get(self, request):
        from rest_framework.response import Response

        from .serializers import RecentReviewSerializer

        reviews = (
            Review.objects.filter(
                moderation_status=Review.ModerationStatus.APPROVED,
                book__status=Book.Status.PUBLISHED,
            )
            .exclude(body="")
            .select_related("user", "book")
            .order_by("-created_at")[: self.LIMIT]
        )
        return Response(RecentReviewSerializer(reviews, many=True).data)


class BookReviewsView(APIView):
    """GET: kitobning tasdiqlangan sharhlari. POST: sharh yozish (faqat tugatgan)."""

    def get_permissions(self):
        from rest_framework.permissions import AllowAny, IsAuthenticated

        return [AllowAny()] if self.request.method == "GET" else [IsAuthenticated()]

    def get(self, request, slug):
        from rest_framework.response import Response

        from .serializers import ReviewSerializer

        book = get_object_or_404(Book, slug=slug, status=Book.Status.PUBLISHED)
        reviews = book.reviews.filter(moderation_status=Review.ModerationStatus.APPROVED).select_related("user")
        return Response(ReviewSerializer(reviews, many=True).data)

    def post(self, request, slug):
        from rest_framework import status
        from rest_framework.response import Response

        from apps.reading.models import ReadingProgress

        from .serializers import ReviewCreateSerializer, ReviewSerializer

        book = get_object_or_404(Book, slug=slug, status=Book.Status.PUBLISHED)

        # Faqat kitobni tugatgan kitobxon sharh yoza oladi
        completed = ReadingProgress.objects.filter(
            user=request.user, book=book, status=ReadingProgress.Status.COMPLETED,
        ).exists()
        if not completed:
            return Response(
                {"detail": "Sharh yozish uchun avval kitobni oxirigacha o'qishingiz kerak."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if Review.objects.filter(user=request.user, book=book).exists():
            return Response({"detail": "Siz bu kitobga allaqachon sharh yozgansiz."}, status=status.HTTP_409_CONFLICT)

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = Review.objects.create(
            user=request.user, book=book,
            rating=serializer.validated_data["rating"],
            body=serializer.validated_data.get("body", ""),
        )
        return Response(
            {**ReviewSerializer(review).data, "detail": "Sharhingiz moderatsiyaga yuborildi."},
            status=status.HTTP_201_CREATED,
        )
