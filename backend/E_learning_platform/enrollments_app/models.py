from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from courses_app.models import Course  # assuming courses_app has Course model
from django.contrib.auth.models import User  # or your custom user
from django.db import models
from django.conf import settings  # ✅ use this for user model
from django.utils import timezone 
from django.forms import ValidationError



class Enrollment(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.student} enrolled in {self.course}"

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_student_course_enrollment")
        ]
        ordering = ["-enrolled_at"]

    def clean(self):
        # Prevent enrolling in inactive courses (example of system-level validation)
        if hasattr(self.course, "is_active") and not self.course.is_active:
            raise ValidationError("Cannot enroll in an inactive course.")

    def __str__(self):
        return f"{self.student} → {self.course} ({self.status})"
