"""Yangi BookFile yaratilganda process_book_file vazifasini navbatga qoyadi."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django_q.tasks import async_task


@receiver(post_save, sender="catalog.BookFile")
def enqueue_processing(sender, instance, created, **kwargs):
    if not created:
        return
    if instance.processing_status != instance.ProcessingStatus.PENDING:
        return
    async_task("apps.ingestion.tasks.process_book_file", instance.pk)
