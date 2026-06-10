from django.db import models
from courses_app.models import Course, Module
from django.conf import settings



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
        blank=True,
    )

    title = models.CharField(max_length=255)
    assessment_type = models.CharField(max_length=10, choices=ASSESSMENT_TYPE)
    pass_mark = models.PositiveIntegerField(default=60)
    max_attempts = models.PositiveIntegerField(null=True,blank=True)
    duration = models.PositiveIntegerField(null=True,blank=True)
    instructions = models.TextField(blank=True, null=True)
    descriptions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_published = models.BooleanField(default=False)
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def clean(self):
        from .services.rules import validate_unique_assessment

        validate_unique_assessment(self)

    def __str__(self):
        return self.title

class Question(models.Model):

    class QuestionType(models.TextChoices):
        SINGLE = "single", "Single Choice"
        MULTIPLE = "multiple", "Multiple Choice"

    assessment = models.ForeignKey(
        Assessment,
        on_delete=models.CASCADE,
        related_name="questions"
    )

    question_text = models.TextField()

    question_type = models.CharField(
        max_length=10,
        choices=QuestionType.choices,
        default=QuestionType.SINGLE
    )

    marks = models.PositiveIntegerField(default=1)

    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']

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

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attempts")
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="attempts")
    attempt_number = models.PositiveIntegerField(default=1)

    score = models.FloatField(default=0)
    is_passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)

    is_locked = models.BooleanField(default=False)

    submitted_at = models.DateTimeField(null=True, blank=True)

    is_submitted = models.BooleanField(default=False)

    percentage = models.FloatField(default=0)

    next_allowed_attempt = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "assessment", "attempt_number"]
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.student} - Attempt {self.attempt_number}"


class StudentAnswer(models.Model):

    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE
    )

    selected_choice = models.ForeignKey(
        Choice,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="single_answers"
    )

    selected_choices = models.ManyToManyField(
        Choice,
        blank=True,
        related_name="multi_answers"
    )

    text_answer = models.TextField(blank=True, null=True)

    is_final = models.BooleanField(default=False)

    is_correct = models.BooleanField(default=False)


class Feedback(models.Model):

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    course = models.ForeignKey(
        "courses_app.Course",
        on_delete=models.CASCADE
    )

    comment = models.TextField()
