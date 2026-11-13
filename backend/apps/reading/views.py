"""Reader mijozi bilan aloqa: seans ochish, batch heartbeat, yopish, progress.

Ball hisoblash bu yerda BAJARILMAYDI - faqat xom malumot qabul qilinadi.
Validatsiya va ball `apps.reading.tasks.flush_dirty_sessions` fon vazifasida.
"""
from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.catalog.models import Book, BookFile

from .models import ReadingHeartbeat, ReadingProgress, ReadingSession
from .serializers import (
    CloseSessionSerializer,
    HeartbeatBatchSerializer,
    OpenSessionSerializer,
    ReadingProgressSerializer,
    SessionSerializer,
)


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class OpenSessionView(APIView):
    """Yangi seans ochadi; eskisi bolsa `select_for_update` bilan superseded qilib yopadi."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OpenSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        book = get_object_or_404(Book, public_id=data["book_public_id"], status=Book.Status.PUBLISHED)
        book_file = None
        if data.get("book_file_public_id"):
            book_file = get_object_or_404(BookFile, public_id=data["book_file_public_id"], book=book)

        with transaction.atomic():
            existing = (
                ReadingSession.objects.select_for_update()
                .filter(user=request.user, ended_at__isnull=True)
                .first()
            )
            if existing:
                existing.ended_at = timezone.now()
                existing.end_reason = ReadingSession.EndReason.NEW_SESSION
                existing.wall_seconds = int((existing.ended_at - existing.started_at).total_seconds())
                existing.save(update_fields=["ended_at", "end_reason", "wall_seconds", "updated_at"])

            session = ReadingSession.objects.create(
                user=request.user,
                book=book,
                book_file=book_file,
                start_page=data["start_page"],
                max_page=data["start_page"],
                start_locator=data.get("start_locator", ""),
                device_type=data.get("device_type", ""),
                device_fingerprint=data.get("device_fingerprint", ""),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:400],
                ip_address=_client_ip(request),
            )

            progress, _ = ReadingProgress.objects.get_or_create(user=request.user, book=book)
            if progress.status == ReadingProgress.Status.WANT_TO_READ:
                progress.status = ReadingProgress.Status.READING
                progress.started_at = progress.started_at or timezone.now()
            progress.sessions_count += 1
            progress.last_read_at = timezone.now()
            progress.save()

        return Response(SessionSerializer(session).data, status=status.HTTP_201_CREATED)


class HeartbeatBatchView(APIView):
    """Reader har ~2 daqiqada 4 talik paket yuboradi. ~10ms - faqat yozadi."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "heartbeat"

    def post(self, request):
        serializer = HeartbeatBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = get_object_or_404(
            ReadingSession, public_id=data["session_public_id"], user=request.user, ended_at__isnull=True,
        )

        objects = [
            ReadingHeartbeat(
                session=session,
                client_seq=hb["client_seq"],
                client_ts=hb["client_ts"],
                page=hb["page"],
                locator=hb.get("locator", ""),
                active_seconds=hb["active_seconds"],
                is_focused=hb["is_focused"],
                scroll_delta=hb.get("scroll_delta", 0),
                viewport_pct=hb.get("viewport_pct"),
            )
            for hb in data["heartbeats"]
        ]
        ReadingHeartbeat.objects.bulk_create(objects, ignore_conflicts=True)

        max_page = max((hb["page"] for hb in data["heartbeats"]), default=session.max_page or 0)
        ReadingSession.objects.filter(pk=session.pk).update(
            last_heartbeat_at=timezone.now(),
            heartbeat_count=session.heartbeat_count + len(objects),
            max_page=max(session.max_page or 0, max_page),
        )

        return Response({"accepted": len(objects)}, status=status.HTTP_202_ACCEPTED)


class CloseSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CloseSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = get_object_or_404(
            ReadingSession, public_id=data["session_public_id"], user=request.user, ended_at__isnull=True,
        )
        session.ended_at = timezone.now()
        session.end_reason = ReadingSession.EndReason.MANUAL
        session.wall_seconds = int((session.ended_at - session.started_at).total_seconds())
        if data.get("end_page") is not None:
            session.end_page = data["end_page"]
            session.max_page = max(session.max_page or 0, session.end_page)
        if data.get("end_locator"):
            session.end_locator = data["end_locator"]
        session.save()

        return Response(SessionSerializer(session).data)


class ProgressListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            ReadingProgress.objects.filter(user=request.user)
            .select_related("book")
            .order_by("-last_read_at")
        )
        return Response(ReadingProgressSerializer(qs, many=True).data)


class ProgressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, book_public_id):
        progress = get_object_or_404(
            ReadingProgress.objects.select_related("book"), user=request.user, book__public_id=book_public_id,
        )
        return Response(ReadingProgressSerializer(progress).data)


class ActivityListView(APIView):
    """Oxirgi kunlardagi kunlik faollik - profil sahifasidagi o'qish taqvimi uchun."""

    permission_classes = [IsAuthenticated]
    MAX_DAYS = 371

    def get(self, request):
        from datetime import timedelta

        from .models import DailyActivity
        from .serializers import DailyActivitySerializer

        try:
            days = int(request.query_params.get("days", 119))
        except ValueError:
            days = 119
        days = max(1, min(days, self.MAX_DAYS))
        since = timezone.localdate() - timedelta(days=days - 1)
        qs = DailyActivity.objects.filter(user=request.user, activity_date__gte=since).order_by("activity_date")
        return Response(DailyActivitySerializer(qs, many=True).data)
