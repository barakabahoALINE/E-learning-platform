from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from courses_app.models import Course  # assuming courses_app has Course model
from django.contrib.auth.models import User  # or your custom user

from django.db import models
from django.conf import settings  # ✅ use this for user model
from django.utils import timezone

class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Use AUTH_USER_MODEL for users
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    course = models.ForeignKey(
        'courses_app.Course',  # <-- Correct app name
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    # created_at = models.DateTimeField(auto_now_add=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.student} enrolled in {self.course}"