from django.contrib import admin
from .models import ContentProgress, SectionProgress


@admin.register(ContentProgress)
class ContentProgressAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "content",
        "completed",
        "completed_at",
    )


@admin.register(SectionProgress)
class SectionProgressAdmin(admin.ModelAdmin):
    list_display = (
        "student",
        "section",
        "completed",
        "completed_at",
    )