# # from django.db import models
# # from django.conf import settings
# # from django.utils import timezone
from django.db import models
from django.conf import settings
from django.utils import timezone

from courses_app.models import Section, Module, Content, Course
from enrollments_app.models import Enrollment


User = settings.AUTH_USER_MODEL


# ══════════════════════════════════════════════
# CONTENT PROGRESS
# ══════════════════════════════════════════════
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


# ══════════════════════════════════════════════
# SECTION PROGRESS
# ══════════════════════════════════════════════
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


# ══════════════════════════════════════════════
# MODULE PROGRESS
# ══════════════════════════════════════════════
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


# ══════════════════════════════════════════════
# LEARNING SESSION
# ══════════════════════════════════════════════
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
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.is_active = False
            duration = (self.ended_at - self.started_at).total_seconds() / 60
            self.duration_minutes = int(duration)
            self.save()

    def __str__(self):
        return f"{self.student} - {self.course} ({self.duration_minutes} mins)"


# ══════════════════════════════════════════════
# CASCADE HELPERS
# ══════════════════════════════════════════════

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
    if now_complete and not module_prog.completed:
        module_prog.completed = True
        module_prog.completed_at = timezone.now()
        module_prog.save()
    elif not now_complete and module_prog.completed:
        module_prog.completed = False
        module_prog.completed_at = None
        module_prog.save()
        
        
        
        
