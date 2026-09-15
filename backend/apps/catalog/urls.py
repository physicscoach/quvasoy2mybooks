from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import AuthorViewSet, BookReviewsView, BookViewSet, CategoryViewSet

router = DefaultRouter(trailing_slash=False)
router.register("books", BookViewSet, basename="book")
router.register("authors", AuthorViewSet, basename="author")
router.register("categories", CategoryViewSet, basename="category")

urlpatterns = router.urls + [
    path("books/<slug:slug>/reviews", BookReviewsView.as_view(), name="book-reviews"),
]
