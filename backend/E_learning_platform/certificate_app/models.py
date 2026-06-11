from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from courses_app.models import Course
from enrollments_app.models import Enrollment
from progress_app.models import CourseProgress


def _generate_certificate_number(student_id, course_id):
    timestamp = int(timezone.now().timestamp())
    return f"CERT-{course_id}-{student_id}-{timestamp}"


class Certificate(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="certificates"
    )
    course_progress = models.ForeignKey(
        CourseProgress,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="certificates"
    )
    certificate_number = models.CharField(max_length=100, unique=True, blank=True)
    score = models.FloatField(default=0.0)
    percentage = models.FloatField(default=0.0)
    issued_at = models.DateTimeField(auto_now_add=True)
    certificate_file = models.FileField(upload_to="certificates/", null=True, blank=True)
    is_downloaded = models.BooleanField(default=False)
    downloaded_at = models.DateTimeField(null=True, blank=True)
    shared_via = models.CharField(max_length=100, null=True, blank=True)
    shared_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["student", "course"]
        permissions = [
            ("share_certificate", "Can share certificate"),
        ]

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = _generate_certificate_number(
                self.student_id,
                self.course_id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Certificate {self.certificate_number} for {self.student} - {self.course}"


class Feedback(models.Model):
    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="certificate_feedback"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="certificate_feedback"
    )
    certificate = models.ForeignKey(
        Certificate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="feedback"
    )
    overall_rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    content_quality = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    instructor_clarity = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    platform_usability = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["student", "course"]
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Feedback for {self.course} by {self.student}"
