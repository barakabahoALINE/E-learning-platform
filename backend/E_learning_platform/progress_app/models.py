from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from courses_app.models import Lesson,Content
from enrollments_app.models import Enrollment


User = settings.AUTH_USER_MODEL


class ContentProgress(models.Model):

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE
    )

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE
    )

    completed = models.BooleanField(default=False)

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "content"]

    def __str__(self):
        return f"{self.student} - {self.content}"


class LessonProgress(models.Model):

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE
    )

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE
    )

    completed = models.BooleanField(default=False)

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "lesson"]

    def __str__(self):
        return f"{self.student} - {self.lesson}"