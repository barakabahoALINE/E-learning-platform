from django.contrib import admin
from .models import ContentProgress, LessonProgress


@admin.register(ContentProgress)
class ContentProgressAdmin(admin.ModelAdmin):

    list_display = (
        "student",
        "content",
        "completed",
        "completed_at"
    )


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):

    list_display = (
        "student",
        "lesson",
        "completed",
        "completed_at"
    )
