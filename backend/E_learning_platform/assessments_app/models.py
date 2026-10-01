from django.db import models
from courses_app.models import Course, Module
from django.conf import settings
from django.utils import timezone


class Survey(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Training(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="trainings")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class AccessCode(models.Model):
    training = models.ForeignKey("Training", on_delete=models.CASCADE, related_name="access_codes")
    assessment = models.ForeignKey("Assessment", on_delete=models.CASCADE, related_name="access_codes")
    code = models.CharField(max_length=8, unique=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_access_codes")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        if not self.is_active:
            return False, "Access code is inactive."
        if self.expires_at and timezone.now() > self.expires_at:
            return False, "Access code has expired."
        if self.max_uses > 0 and self.used_count >= self.max_uses:
            return False, "Access code has been used up and reached its maximum number of uses."
        return True, "Access code is valid."

    def __str__(self):
        return self.code


class Assessment(models.Model):

    ASSESSMENT_TYPE = [
        ("QUIZ", "Module Quiz"),
        ("FINAL", "Final Assessment"),
        ("TRAINING", "Training Assessment"),
    ]

    course = models.ForeignKey(
        "courses_app.Course",
        on_delete=models.SET_NULL,
        related_name="assessments",
        null=True,
        blank=True,
    )

    module = models.ForeignKey(
        "courses_app.Module",
        on_delete=models.SET_NULL,
        related_name="assessments",
        null=True,
        blank=True,
    )

    modules = models.ManyToManyField(
        "courses_app.Module",
        blank=True,
        related_name="attached_assessments",
    )

    courses = models.ManyToManyField(
        "courses_app.Course",
        blank=True,
        related_name="attached_assessments",
    )

    title = models.CharField(max_length=255)
    assessment_type = models.CharField(max_length=10, choices=ASSESSMENT_TYPE)
    training = models.ForeignKey("Training", on_delete=models.SET_NULL, null=True, blank=True, related_name="assessments")
    pass_mark = models.PositiveIntegerField(default=60)
    max_attempts = models.PositiveIntegerField(null=True,blank=True)
    duration = models.PositiveIntegerField(null=True,blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    require_access_code = models.BooleanField(default=False)
    tab_switch_enabled = models.BooleanField(default=False)
    tab_switch_limit = models.PositiveIntegerField(default=0)
    instructions = models.TextField(blank=True, null=True)
    descriptions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)
    draft_course_additions = models.JSONField(default=list, blank=True)
    draft_course_removals = models.JSONField(default=list, blank=True)
    draft_module_additions = models.JSONField(default=list, blank=True)
    draft_module_removals = models.JSONField(default=list, blank=True)

    class Meta:
        permissions = [
            ("start_assessment", "Can start assessment"),
        ]

    def save(self, *args, validate=True, **kwargs):
        if validate:
            self.clean()
        if self.assessment_type == "TRAINING" and self.training_id and self.duration_minutes is None and self.duration is not None:
            self.duration_minutes = self.duration
        super().save(*args, **kwargs)

    def clean(self):
        from .services.rules import validate_unique_assessment

        if self.assessment_type == "TRAINING" and self.training_id is None:
            raise ValueError("Training assessments must be linked to a training.")

        validate_unique_assessment(self)

    def __str__(self):
        return self.title

    class Meta:
        permissions = [
            ("start_assessment", "Can start assessment"),
        ]

class Question(models.Model):

    class QuestionType(models.TextChoices):
        SINGLE = "single", "Single Choice"
        MULTIPLE = "multiple", "Multiple Choice"
        MATCHING = "matching", "Matching"

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

    matching_pairs = models.JSONField(blank=True, null=True)

    order = models.PositiveIntegerField()

    draft_question_text = models.TextField(blank=True, null=True)
    draft_question_type = models.CharField(
        max_length=10,
        choices=QuestionType.choices,
        blank=True,
        null=True,
    )
    draft_marks = models.PositiveIntegerField(blank=True, null=True)
    draft_matching_pairs = models.JSONField(blank=True, null=True)
    draft_choices = models.JSONField(blank=True, null=True)
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)

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
    course = models.ForeignKey(
        "courses_app.Course",
        on_delete=models.CASCADE,
        related_name="assessment_attempts",
        null=True,
        blank=True,
    )
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="attempts")
    access_code = models.ForeignKey("AccessCode", on_delete=models.SET_NULL, related_name="attempts", null=True, blank=True)
    attempt_number = models.PositiveIntegerField(default=1)

    score = models.FloatField(default=0)
    is_passed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    is_locked = models.BooleanField(default=False)
    tab_switch_count = models.PositiveIntegerField(default=0)

    submitted_at = models.DateTimeField(null=True, blank=True)

    is_submitted = models.BooleanField(default=False)

    percentage = models.FloatField(default=0)

    next_allowed_attempt = models.DateTimeField(null=True, blank=True)
    assessment_snapshot = models.JSONField(default=dict, blank=True)
    question_snapshot = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ["student", "course", "assessment", "attempt_number"]
        ordering = ["-started_at"]
        permissions = [
            ("start_assessment", "Can start assessment"),
            ("lock_attempt", "Can lock attempt"),
            ("unlock_attempt", "Can unlock attempt"),
            ("grade_assessment", "Can grade assessment"),
        ]

    def __str__(self):
        return f"{self.student} - Attempt {self.attempt_number}"


class StudentAnswer(models.Model):

    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE
    )

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
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
    answer_snapshot = models.JSONField(default=dict, blank=True)


class Feedback(models.Model):

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    course = models.ForeignKey(
        "courses_app.Course",
        on_delete=models.CASCADE
    )

    comment = models.TextField()