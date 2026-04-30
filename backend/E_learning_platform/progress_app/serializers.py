# from rest_framework import serializers
# from .models import ContentProgress, LessonProgress
# from courses_app.models import Content,Lesson
# from .models import LearningSession

from rest_framework import serializers
from .models import ContentProgress, SectionProgress, ModuleProgress, LearningSession
from courses_app.models import Content, Section, Module


# ══════════════════════════════════════════════
# Content
# ══════════════════════════════════════════════
class ContentProgressSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source="content.title", read_only=True)

    class Meta:
        model = ContentProgress
        fields = ["id", "content", "content_title", "completed", "completed_at"]


class SectionContentProgressSerializer(serializers.ModelSerializer):
    """Lists contents inside a section with per-item completion state."""
    content_title = serializers.CharField(source="title", read_only=True)
    completed = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = ["id", "content_title", "content_type", "order", "completed", "progress_percentage"]

    def get_completed(self, obj):
        student = self.context.get("student")
        if not student:
            return False
        return ContentProgress.objects.filter(
            student=student, content=obj, completed=True
        ).exists()

    def get_progress_percentage(self, obj):
        return 100 if self.get_completed(obj) else 0


# ══════════════════════════════════════════════
# Section
# ══════════════════════════════════════════════
class SectionProgressSerializer(serializers.ModelSerializer):
    section_title = serializers.CharField(source="section.title", read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = SectionProgress
        fields = ["id", "section", "section_title", "completed", "completed_at", "progress_percentage"]

    def get_progress_percentage(self, obj):
        total = obj.section.contents.count()
        if total == 0:
            return 0
        done = ContentProgress.objects.filter(
            student=obj.student,
            enrollment=obj.enrollment,
            content__section=obj.section,
            completed=True,
        ).count()
        return int((done / total) * 100)


# ══════════════════════════════════════════════
# Module
# ══════════════════════════════════════════════
class ModuleProgressSerializer(serializers.ModelSerializer):
    module_title = serializers.CharField(source="module.title", read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()

    class Meta:
        model = ModuleProgress
        fields = [
            "id", "module", "module_title",
            "completed", "completed_at",
            "progress_percentage", "sections",
        ]

    def get_progress_percentage(self, obj):
        total = Section.objects.filter(module=obj.module).count()
        if total == 0:
            return 0
        done = SectionProgress.objects.filter(
            student=obj.student,
            section__module=obj.module,
            completed=True,
        ).count()
        return int((done / total) * 100)

    def get_sections(self, obj):
        section_progresses = SectionProgress.objects.filter(
            student=obj.student,
            enrollment=obj.enrollment,
            section__module=obj.module,
        ).select_related("section")
        return SectionProgressSerializer(section_progresses, many=True).data


# ══════════════════════════════════════════════
# Learning Session
# ══════════════════════════════════════════════
class LearningSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningSession
        fields = ["id", "course", "started_at", "ended_at", "duration_minutes", "is_active"]
        
