from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Loyihadagi barcha ro'yxat endpointlari uchun standart sahifalash."""

    page_size = 24
    page_size_query_param = "page_size"
    max_page_size = 100
