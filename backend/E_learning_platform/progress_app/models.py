from django.db import models
from django.conf import settings
from django.utils import timezone

from courses_app.models import Lesson, Content, Course
from enrollments_app.models import Enrollment


User = settings.AUTH_USER_MODEL


# =========================
# CONTENT PROGRESS
# =========================
class ContentProgress(models.Model):

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="content_progress"
    )

    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name="progress"
    )

    completed = models.BooleanField(default=False)

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "content"]

    def __str__(self):
        return f"{self.student} - {self.content}"


# =========================
# LESSON PROGRESS
# =========================
class LessonProgress(models.Model):

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="lesson_progress"
    )

    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="progress"
    )

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="lesson_progress"
    )

    completed = models.BooleanField(default=False)

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "lesson"]

    def __str__(self):
        return f"{self.student} - {self.lesson}"


# =========================
# LEARNING SESSION
# =========================
class LearningSession(models.Model):

    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="learning_sessions"
    )

    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="learning_sessions"
    )

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="learning_sessions"
    )

    started_at = models.DateTimeField(default=timezone.now)

    ended_at = models.DateTimeField(null=True, blank=True)

    duration_minutes = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-started_at"]

    def end_session(self):
        """
        Ends the learning session and calculates duration.
        """
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.is_active = False
            duration = (self.ended_at - self.started_at).total_seconds() / 60
            self.duration_minutes = int(duration)
            self.save()

    def __str__(self):
        return f"{self.student} - {self.course} ({self.duration_minutes} mins)"