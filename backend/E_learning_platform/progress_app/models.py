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
        if self.completed and self.enrollment:
            _refresh_section_progress(self.student, self.content.section, self.enrollment)

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
        if self.completed:
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
        if self.completed:
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
    total = Content.objects.filter(section=section).count()
    if total == 0:
        return

    done = ContentProgress.objects.filter(
        student=student,
        content__section=section,
        completed=True,
    ).count()

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
    total = Section.objects.filter(module=module).count()
    if total == 0:
        return

    done = SectionProgress.objects.filter(
        student=student,
        section__module=module,
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
    After a ModuleProgress is saved, recompute whether the parent Course
    is now fully completed and save CourseProgress accordingly.
    """
    total = Module.objects.filter(course=course).count()

    from assessments_app.models import Assessment, Attempt

    final_assessment = Assessment.objects.filter(
        course=course,
        assessment_type="FINAL"
    ).first()

    final_passed = False
    if final_assessment:
        final_passed = Attempt.objects.filter(
            student=student,
            assessment=final_assessment,
            is_submitted=True,
            is_passed=True
        ).exists()

    if total == 0 and final_assessment and not final_passed:
        return
    if total == 0 and not final_assessment:
        return

    done = ModuleProgress.objects.filter(
        student=student,
        module__course=course,
        completed=True,
    ).count()

    # Calculate progress percentage
    if final_assessment:
        if total == 0:
            pct = 100.0 if final_passed else 0.0
        else:
            module_share = round((done / total) * 90)
            pct = float(module_share + (10 if final_passed else 0))
            pct = min(pct, 100.0)
    else:
        pct = float(round((done / total) * 100)) if total else 0.0

    course_prog, created = CourseProgress.objects.get_or_create(
        student=student,
        course=course,
        defaults={"enrollment": enrollment, "progress_percentage": pct},
    )

    if not created:
        course_prog.progress_percentage = pct

    now_complete = done == total
    if final_assessment:
        now_complete = now_complete and final_passed

    if now_complete and not course_prog.completed:
        course_prog.completed = True
        course_prog.completed_at = timezone.now()
        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.save()
    elif not now_complete and course_prog.completed:
        # edge case: a module or final assessment was un-completed
        course_prog.completed = False
        course_prog.completed_at = None

    course_prog.save()

    # If the enrollment was just marked completed, end any active learning sessions
    if course_prog.completed and enrollment.completed_at:
        for session in LearningSession.objects.filter(student=student, course=course, is_active=True):
            session.end_session_at(enrollment.completed_at)

