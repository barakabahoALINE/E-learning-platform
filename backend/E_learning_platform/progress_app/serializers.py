from rest_framework import serializers
from .models import ContentProgress, LessonProgress
from courses_app.models import Content,Lesson
from .models import LearningSession
from users_app.models import User



class ContentProgressSerializer(serializers.ModelSerializer):
    content_title = serializers.CharField(source='content.title', read_only=True)

    class Meta:
        model = ContentProgress
        fields = ["id", "content", "content_title", "completed", "completed_at"]

class LessonContentProgressSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()
    completed = serializers.SerializerMethodField()
    content_title = serializers.CharField(source='title', read_only=True)

    class Meta:
        model = Content
        fields = ["id", "content_title", "completed", "progress_percentage"]

    def get_completed(self, obj):
        student = self.context.get("student")
        enrollment = self.context.get("enrollment")
        if not student or not enrollment:
            return False
        progress = ContentProgress.objects.filter(
            student=student,
            content=obj,
            completed=True
        ).first()
        return bool(progress)

    def get_progress_percentage(self, obj):
        # Since each content = 1 unit, completed = 100 if done, else 0
        return 100 if self.get_completed(obj) else 0

class LessonProgressSerializer(serializers.ModelSerializer):
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = LessonProgress
        fields = ["id", "lesson", "completed", "completed_at", "progress_percentage"]

    def get_progress_percentage(self, obj):
        total_contents = obj.lesson.contents.count()
        if total_contents == 0:
            return 0
        completed_contents = ContentProgress.objects.filter(
            student=obj.student,
            enrollment=obj.enrollment,
            content__lesson=obj.lesson,
            completed=True
        ).count()
        return int((completed_contents / total_contents) * 100)

class LearningSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningSession
        fields = [
            "id",
            "course",
            "started_at",
            "ended_at",
            "duration_minutes",
            "is_active",
        ]

class AdminCompleteCourseSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()

    def validate_student_id(self, value):
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Student not found")

        return value
    


class StudentCourseProgressSerializer(serializers.Serializer):

    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    completed_lessons = serializers.IntegerField()
    total_lessons = serializers.IntegerField()
    progress_percentage = serializers.IntegerField()