from django.db import models
from .validators import validate_assessment_module_relationship
from django.conf import settings

user = settings.AUTH_USER_MODEL

class Assessment(models.Model):

    ASSESSMENT_TYPE = [
        ("QUIZ", "Module Quiz"),
        ("FINAL", "Final Assessment"),
    ]

    course = models.ForeignKey(
        "courses_app.Course",
        on_delete=models.CASCADE,
        related_name="assessments"
    )

    module = models.ForeignKey(
        "courses_app.Module",
        on_delete=models.CASCADE,
        related_name="assessments",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=255)
    assessment_type = models.CharField(max_length=10, choices=ASSESSMENT_TYPE)
    is_final = models.BooleanField(default=False)

    pass_mark = models.PositiveIntegerField(default=60)
    max_attempts = models.PositiveIntegerField(default=3)
    duration = models.PositiveIntegerField(default=30)

    instructions = models.TextField(blank=True, null=True)
    descriptions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        validate_assessment_module_relationship(self)

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Question(models.Model):

    QUESTION_TYPES = [
        ("SINGLE", "Single Choice"),
        ("MULTIPLE", "Multiple Choice"),
    ]

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="questions"
    )

    question_text = models.TextField()
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)
    marks = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.question_text


class Choice(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices"
    )

    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):

    student = models.ForeignKey("users_app.User", on_delete=models.CASCADE)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)

    score = models.FloatField(default=0)
    is_passed = models.BooleanField(default=False)

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.student} - {self.assessment}"