from django.db import models
from django.conf import settings
from django.utils import timezone
from courses_app.models import Section, Module, Content, Course
from enrollments_app.models import Enrollment


User = settings.AUTH_USER_MODEL


# CONTENT PROGRESS
class ContentProgress(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="content_progress"
    )
    content = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="progress"
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="content_progress",
        null=True,
        blank=True,
    )
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "content"]

    def __str__(self):
        return f"{self.student} - {self.content}"

    # ── cascade up when a content is marked complete ─────────────────
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.enrollment:
            _refresh_section_progress(self.student, self.content.section, self.enrollment)


# Track per-card review state for key concept cards
class ConceptCardProgress(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="concept_card_progress"
    )
    content = models.ForeignKey(
        Content, on_delete=models.CASCADE, related_name="concept_card_progress"
    )
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="concept_card_progress",
        null=True,
        blank=True,
    )
    card_index = models.PositiveIntegerField()
    reviewed = models.BooleanField(default=False)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "content", "card_index"]

    def __str__(self):
        return f"{self.student} - {self.content} card {self.card_index} ({'reviewed' if self.reviewed else 'not reviewed'})"

# SECTION PROGRESS
class SectionProgress(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="section_progress"
    )
    section = models.ForeignKey(
        Section, on_delete=models.CASCADE, related_name="progress"
    )
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="section_progress"
    )
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "section"]

    def __str__(self):
        return f"{self.student} - {self.section}"

    # ── cascade up when a section is marked complete ──────────────────
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.enrollment:
            _refresh_module_progress(self.student, self.section.module, self.enrollment)

# MODULE PROGRESS
class ModuleProgress(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="module_progress"
    )
    module = models.ForeignKey(
        Module, on_delete=models.CASCADE, related_name="progress"
    )
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="module_progress"
    )
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["student", "module"]

    def __str__(self):
        return f"{self.student} - {self.module}"

    # ── cascade up when a module is marked complete ──────────────────
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.enrollment:
            _refresh_course_progress(self.student, self.module.course, self.enrollment)

# COURSE PROGRESS
class CourseProgress(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="course_progress"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="progress"
    )
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="course_progress"
    )
    progress_percentage = models.FloatField(default=0.0)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_column='started_at')
    updated_at = models.DateTimeField(auto_now=True, db_column='last_updated')

    class Meta:
        unique_together = ["student", "course"]
        permissions = [
            ("view_progress", "Can view progress"),
            ("change_progress", "Can change progress"),
            ("complete_progress", "Can complete progress"),
        ]

    def __str__(self):
        return f"{self.student} - {self.course}"

# LEARNING SESSION
class LearningSession(models.Model):
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="learning_sessions"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="learning_sessions"
    )
    enrollment = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name="learning_sessions"
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
        if self.is_active:
            self.ended_at = timezone.now()

            duration = (self.ended_at - self.started_at).total_seconds() / 60
            self.duration_minutes = int(duration)

            self.is_active = False
            self.save()

    def end_session_at(self, end_time=None):
        """
        End the session at a specific time (useful when capping at course completion).
        If `end_time` is not provided, behaves like `end_session()`.
        """
        if not self.is_active:
            return

        end_time = end_time or timezone.now()

        # If the enrollment has a completed_at timestamp, never go past it
        try:
            enrollment_completed_at = self.enrollment.completed_at
        except Exception:
            enrollment_completed_at = None

        if enrollment_completed_at:
            end_time = min(end_time, enrollment_completed_at)

        self.ended_at = end_time
        duration = (self.ended_at - self.started_at).total_seconds() / 60
        self.duration_minutes = max(int(duration), 0)
        self.is_active = False
        self.save()

    def __str__(self):
        return f"{self.student} - {self.course} ({self.duration_minutes} mins)"

# CASCADE HELPERS
def _refresh_section_progress(student, section, enrollment):
    """
    After a ContentProgress is saved, recompute whether the parent Section
    is now fully completed and save SectionProgress accordingly.
    """
    total = Content.objects.filter(section=section, is_published=True).count()
    if total == 0:
        return

    # Count completed contents, taking into account optional key concept review
    done = 0
    contents = Content.objects.filter(section=section, is_published=True)
    for content in contents:
        # standard completed flag
        cp = ContentProgress.objects.filter(student=student, content=content, completed=True).first()
        if cp:
            done += 1
            continue

        # if content requires key concept review, check per-card progress
        try:
            if getattr(content, "require_key_concept_review", False):
                cards = content.key_concept_cards or []
                if len(cards) == 0:
                    # no cards, treat as not completed
                    continue
                reviewed_count = ConceptCardProgress.objects.filter(
                    student=student, content=content, reviewed=True
                ).count()
                if reviewed_count >= len(cards):
                    done += 1
                    continue
        except Exception:
            # defensive: ignore and treat as not completed
            pass

    section_prog, _ = SectionProgress.objects.get_or_create(
        student=student,
        section=section,
        defaults={"enrollment": enrollment},
    )

    now_complete = done == total
    if now_complete and not section_prog.completed:
        section_prog.completed = True
        section_prog.completed_at = timezone.now()
        # save() will trigger _refresh_module_progress via SectionProgress.save()
        section_prog.save()
    elif not now_complete and section_prog.completed:
        # edge case: a content was un-completed
        section_prog.completed = False
        section_prog.completed_at = None
        section_prog.save()


def _refresh_module_progress(student, module, enrollment):
    """
    After a SectionProgress is saved, recompute whether the parent Module
    is now fully completed and save ModuleProgress accordingly.
    """
    total = Section.objects.filter(module=module, is_published=True).count()
    if total == 0:
        return

    done = SectionProgress.objects.filter(
        student=student,
        section__module=module,
        section__is_published=True,
        completed=True,
    ).count()

    module_prog, _ = ModuleProgress.objects.get_or_create(
        student=student,
        module=module,
        defaults={"enrollment": enrollment},
    )

    now_complete = done == total

    if now_complete:
        from assessments_app.services.rules import has_passed_module_quiz

        if has_passed_module_quiz(student, module):
            if not module_prog.completed:
                module_prog.completed = True
                module_prog.completed_at = timezone.now()
                module_prog.save()
        elif module_prog.completed:
            module_prog.completed = False
            module_prog.completed_at = None
            module_prog.save()

    elif not now_complete and module_prog.completed:
        module_prog.completed = False
        module_prog.completed_at = None
        module_prog.save()


def _refresh_course_progress(student, course, enrollment):
    """
    Recompute the parent Course progress based on content completion, quiz completion,
    and final assessment completion. Includes quizzes and final assessment as items.
    """
    from assessments_app.models import Assessment, Attempt

    # Count published content items
    total_content = Content.objects.filter(
        section__module__course=course,
        section__module__is_published=True,
        section__is_published=True,
        is_published=True,
    ).count()

    # Count published quiz assessments (module quizzes)
    total_quizzes = Assessment.objects.filter(
        course=course,
        assessment_type="QUIZ",
        is_published=True,
    ).count()

    # Check if final assessment exists
    final_assessment = Assessment.objects.filter(
        course=course,
        assessment_type="FINAL",
        is_published=True,
    ).first()

    has_final = 1 if final_assessment else 0

    # Total items = content + quizzes + final assessment
    total = total_content + total_quizzes + has_final

    # Count completed content items
    done_content = ContentProgress.objects.filter(
        student=student,
        content__section__module__course=course,
        content__section__module__is_published=True,
        content__section__is_published=True,
        content__is_published=True,
        completed=True,
    ).count()

    # Count passed quizzes
    done_quizzes = Assessment.objects.filter(
        course=course,
        assessment_type="QUIZ",
        is_published=True,
    ).values_list("id", flat=True)
    
    from assessments_app.services.rules import has_passed_module_quiz
    passed_quiz_count = 0
    for assessment_id in done_quizzes:
        # Create a temporary module object to check if quiz is passed
        assessment = Assessment.objects.get(id=assessment_id)
        if assessment.module and has_passed_module_quiz(student, assessment.module):
            passed_quiz_count += 1

    # Check if final assessment is passed
    final_passed = False
    if final_assessment:
        final_passed = Attempt.objects.filter(
            student=student,
            assessment=final_assessment,
            is_submitted=True,
            is_passed=True,
        ).exists()

    # Total completed items
    done = done_content + passed_quiz_count + (1 if final_passed else 0)

    pct = float(round((done / total) * 100)) if total else 0.0

    course_prog, created = CourseProgress.objects.get_or_create(
        student=student,
        course=course,
        defaults={"enrollment": enrollment, "progress_percentage": pct},
    )

    if not created:
        course_prog.progress_percentage = pct

    # Course is complete when all items (content + quizzes + final) are completed
    now_complete = total == 0 or done == total

    if now_complete and not course_prog.completed:
        course_prog.completed = True
        course_prog.completed_at = timezone.now()
        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.save()
    elif not now_complete and course_prog.completed:
        course_prog.completed = False
        course_prog.completed_at = None

    course_prog.save()

    if course_prog.completed and enrollment.completed_at:
        for session in LearningSession.objects.filter(student=student, course=course, is_active=True):
            session.end_session_at(enrollment.completed_at)

