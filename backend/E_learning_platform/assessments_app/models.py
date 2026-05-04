from django.db import models
from django.core.exceptions import ValidationError
from courses_app.models import Course
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Assessment(models.Model):
    course = models.OneToOneField(
        Course,
        on_delete=models.CASCADE,
        related_name="assessment"
    )

    title = models.CharField(max_length=255)

    is_final = models.BooleanField(default=False)

    pass_mark = models.PositiveIntegerField(default=70)

    max_attempts = models.PositiveIntegerField(default=3)

    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    duration = models.PositiveIntegerField(default=60)  # in minutes
    instructions = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.course.title} - {self.title}"



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

    question_type = models.CharField(max_length=10,choices=QuestionType.choices,default=QuestionType.SINGLE)
    marks = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField()

    def __str__(self):
        return self.question_text

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):

    student = models.ForeignKey(User,on_delete=models.CASCADE,related_name="attempts")
    assessment = models.ForeignKey(Assessment,on_delete=models.CASCADE,related_name="attempts")
    attempt_number = models.PositiveIntegerField(default=1)
    score = models.FloatField(default=0)
    passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    is_locked = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    is_submitted = models.BooleanField(default=False)

    class Meta:
        unique_together = ["student", "assessment", "attempt_number"]
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.student} - Attempt {self.attempt_number}"


class AttemptAnswer(models.Model):

    attempt = models.ForeignKey(Attempt,on_delete=models.CASCADE,related_name="answers")      
    question = models.ForeignKey(Question,on_delete=models.CASCADE) 
    selected_choices = models.ManyToManyField(Choice,blank=True)

    class Meta:
        unique_together = ["attempt", "question"]

    def __str__(self):
        return f"{self.attempt.student} - Q{self.question.id}"
