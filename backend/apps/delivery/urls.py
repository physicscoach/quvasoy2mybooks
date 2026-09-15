from django.urls import path

from .views import FileDeliveryView, TicketView

urlpatterns = [
    path("delivery/tickets/", TicketView.as_view(), name="delivery-ticket"),
    path("files/t/<str:token>", FileDeliveryView.as_view(), name="file-delivery"),
]
