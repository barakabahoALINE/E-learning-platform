from django.db import models
from django.core.exceptions import ValidationError


class Assessment(models.Model):
    course = models.ForeignKey("courses_app.Course", on_delete=models.CASCADE, related_name="assessments")
    title = models.CharField(max_length=255)
    is_final = models.BooleanField(default=False)
    pass_mark = models.PositiveIntegerField(default=70)
    max_attempts = models.PositiveIntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.PositiveIntegerField(default=60)  # in minutes
    instructions = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.title} ({'Final' if self.is_final else 'Quiz'})"


class Question(models.Model):
    QUESTION_TYPES = [
        ('SINGLE', 'Single Choice'),     # radio
        ('MULTIPLE', 'Multiple Choice'), # checkbox
    ]

    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="questions")
    question_text = models.TextField()
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)
    marks = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.question_text

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text

class Attempt(models.Model):
    student = models.ForeignKey("users_app.User", on_delete=models.CASCADE)
    assessment = models.ForeignKey("Assessment", on_delete=models.CASCADE)
    attempt_number = models.IntegerField(default=1)
    started_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student} - {self.assessment}"