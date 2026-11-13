"""Fayl yetkazish endpointlari (reja 5.1, 9.2).

POST /delivery/tickets/   - ruxsat + limitni tekshiradi, qisqa muddatli tiket beradi
GET  /files/t/<token>     - tiketni tekshiradi, DownloadLog yozadi, X-Accel-Redirect qaytaradi

Fayl baytlarini Django ozi stream QILMAYDI - faqat header orqali
proksi (Caddy/nginx)ga "shu ichki yoldan uzat" deb aytadi.
"""
from __future__ import annotations

import os

from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Book, BookFile

from .models import DownloadLog
from .services import can_download
from .tickets import TicketError, issue_ticket, verify_ticket


class TicketRequestSerializer(serializers.Serializer):
    book_public_id = serializers.UUIDField()
    file_public_id = serializers.UUIDField()
    mode = serializers.ChoiceField(choices=["read", "download"])


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class TicketView(APIView):
    """Reader "oqish" yoki "yuklab olish" bosganda chaqiriladi."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ticket"

    def post(self, request):
        serializer = TicketRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        book = get_object_or_404(Book, public_id=data["book_public_id"], status=Book.Status.PUBLISHED)
        file = get_object_or_404(BookFile, public_id=data["file_public_id"], book=book)

        if data["mode"] == "download":
            decision = can_download(request.user, file)
            if not decision.allowed:
                return Response({"detail": decision.reason}, status=status.HTTP_403_FORBIDDEN)
        else:
            if not file.is_ready:
                return Response({"detail": "Fayl hali tayyor emas."}, status=status.HTTP_409_CONFLICT)

        token = issue_ticket(request.user, book_id=book.id, file_id=file.id, mode=data["mode"])
        return Response({"token": token})


class FileDeliveryView(APIView):
    """Caddy/nginx `forward_auth` yoki togridan-togri sorov shu yerga keladi.

    Tiket ozi autentifikatsiya - cookie shart emas (`AllowAny`), chunki
    ruxsat allaqachon tiket berilganda tekshirilgan.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    # pdf.js faylni yuzlab Range so'rovlarda oladi; anon 60/min (IP bo'yicha — maktabda butun
    # sinf bitta IP) kitobni ochilmas qilardi. Himoya — imzolangan, muddatli tiket.
    throttle_classes = []

    def get(self, request, token: str):
        try:
            payload = verify_ticket(token)
        except TicketError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        from apps.accounts.models import User

        try:
            user = User.objects.select_related("reader_stats").get(pk=payload.user_id)
        except User.DoesNotExist:
            return Response({"detail": "Foydalanuvchi topilmadi."}, status=status.HTTP_403_FORBIDDEN)

        if user.token_version != payload.token_version or user.deleted_at is not None:
            return Response({"detail": "Tiket bekor qilingan."}, status=status.HTTP_403_FORBIDDEN)

        try:
            file = BookFile.objects.select_related("book").get(pk=payload.file_id, book_id=payload.book_id)
        except BookFile.DoesNotExist:
            return Response({"detail": "Fayl topilmadi."}, status=status.HTTP_404_NOT_FOUND)

        if payload.mode == "download":
            decision = can_download(user, file)
            log_status = DownloadLog.Status.SUCCESS if decision.allowed else DownloadLog.Status.DENIED_PERMISSION
            DownloadLog.objects.create(
                user=user,
                book_file=file,
                book=file.book,
                file_format=file.format,
                file_name_snapshot=os.path.basename(file.file.name),
                size_bytes_snapshot=file.size_bytes,
                ip_address=_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:400],
                status=log_status,
            )
            if not decision.allowed:
                return Response({"detail": decision.reason}, status=status.HTTP_403_FORBIDDEN)

        content_type = "application/pdf" if file.format == "pdf" else "application/epub+zip"

        # Yuklab olish + PDF -> watermark (foydalanuvchi izi)
        serve_path = None
        if payload.mode == "download" and file.format == "pdf":
            try:
                from .watermark import watermarked_pdf
                serve_path = watermarked_pdf(file, user)
            except Exception:  # noqa: BLE001 - watermark xatosi yuklashni to'smasin
                import logging
                logging.getLogger(__name__).exception(
                    "Watermark yaratib bo'lmadi: file=%s user=%s", file.pk, user.id
                )
                serve_path = None

        # DEV: Caddy yo'q, X-Accel-Redirect'ni bajaruvchi yo'q -> Django faylni o'zi beradi
        # (Range qo'llab-quvvatlanadi). PROD: X-Accel-Redirect, baytlarni Caddy uzatadi.
        from django.conf import settings as dj_settings

        if dj_settings.DEBUG:
            from django.http import FileResponse

            fh = open(serve_path, "rb") if serve_path else file.file.open("rb")
            response = FileResponse(fh, content_type=content_type)
            if payload.mode == "download":
                response["Content-Disposition"] = f'attachment; filename="{os.path.basename(file.file.name)}"'
            return response

        response = HttpResponse(status=200)
        if serve_path:
            rel = str(serve_path).replace(str(__import__("django.conf", fromlist=["settings"]).settings.BOOKS_ROOT), "").replace("\\", "/").lstrip("/")
            response["X-Accel-Redirect"] = _accel_quote(f"{settings.INTERNAL_FILES_PREFIX.rstrip('/')}/{rel}")
        else:
            response["X-Accel-Redirect"] = _internal_accel_path(file)
        response["Content-Type"] = content_type
        if payload.mode == "download":
            response["Content-Disposition"] = _attachment(os.path.basename(file.file.name))
        return response


def _attachment(name: str) -> str:
    """Kirillcha nomli faylni yuklab olish sarlavhasi (RFC 6266, ASCII zaxira nom bilan)."""
    from urllib.parse import quote

    fallback = name.encode("ascii", "ignore").decode() or "kitob.pdf"
    return f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(name)}"


def _internal_accel_path(file: BookFile) -> str:
    from django.conf import settings

    relative = file.file.name  # storage ichidagi nisbiy yol
    prefix = settings.INTERNAL_FILES_PREFIX.rstrip("/")
    return _accel_quote(f"{prefix}/{relative}")


def _accel_quote(path: str) -> str:
    """Sarlavha faqat ASCII bo'lishi kerak: kirillcha fayl nomlari (Ичимиздаги.pdf)
    aks holda Django tomonidan =?utf-8?b?..?= ga aylanib, Caddy faylni topolmaydi.
    Foiz-kodlangan yo'lni Caddy `rewrite` o'zi qayta dekodlaydi."""
    from urllib.parse import quote

    return quote(path, safe="/")
