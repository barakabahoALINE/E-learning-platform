from django.db import models
from django.conf import settings
from courses_app.models import Course  # assuming courses_app has Course model
from django.core.exceptions import ValidationError
from django.utils import timezone

class Enrollment(models.Model):

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE   # usually better than pending unless you have payment logic
    )

    # When a course/enrollment is completed, record the timestamp here
    completed_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # If status is COMPLETED and completed_at is not set, set it now.
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        # If status is not COMPLETED but completed_at is set, clear it.
        if self.status != self.Status.COMPLETED and self.completed_at:
            self.completed_at = None
        super().save(*args, **kwargs)

    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "course"],
                name="unique_student_course_enrollment"
            )
        ]
        ordering = ["-enrolled_at"]

    def clean(self):
        if not self.course.is_published:
            raise ValidationError("Cannot enroll in an unpublished course.")

    def __str__(self):
        return f"{self.student} → {self.course} ({self.status})"