from django.contrib import admin
from .models import Certificate, Feedback


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = [
        "certificate_number",
        "student",
        "course",
        "percentage",
        "issued_at",
        "is_downloaded",
        "shared_at",
    ]
    search_fields = ["certificate_number", "student__email", "course__title"]
    list_filter = ["is_downloaded", "shared_at"]


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "course",
        "overall_rating",
        "instructor_clarity",
        "platform_usability",
        "submitted_at",
    ]
    search_fields = ["student__email", "course__title", "comment"]
    list_filter = ["overall_rating", "content_quality", "instructor_clarity", "platform_usability"]
