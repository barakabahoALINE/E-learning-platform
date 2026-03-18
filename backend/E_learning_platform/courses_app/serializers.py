from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Course,Lesson, Content


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        validators=[UniqueValidator(queryset=Course.objects.all(), message="Course with this title already exists.")]
    )

    class Meta:
        model = Course
        fields = ["title", "description", "duration","category","level", "price"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value



class CourseListSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField()
    level = serializers.StringRelatedField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "price",
            "category",
            "level",
            "is_published",
        ]

class CourseDetailSerializer(serializers.ModelSerializer):
    category = serializers.StringRelatedField()
    level = serializers.StringRelatedField()

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

class LessonSerializer(serializers.ModelSerializer):

    class Meta:
        model = Lesson
        fields = "__all__"
        read_only_fields = ["course"]

    def validate(self, attrs):
        view = self.context.get("view")
        course_id = view.kwargs.get("course_id")
        order = attrs.get("order")

        if Lesson.objects.filter(course_id=course_id, order=order).exists():
            raise serializers.ValidationError(
                f"A lesson with order {order} already exists in this course."
            )

        return attrs

class LessonContentCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Content
        fields = [
            "title",
            "content_type",
            "description",
            "video_url",
            "note_text",
            "file",
            "quiz",
            "order",
            "is_preview",
        ]

    def validate(self, attrs):
        content_type = attrs.get("content_type")
<<<<<<< HEAD
        lesson = attrs.get("lesson") or getattr(self.instance, "lesson", None)
        order = attrs.get("order") or getattr(self.instance, "order", None)

        if lesson is not None and order is not None:
            existing = Content.objects.filter(lesson=lesson, order=order)
            if self.instance is not None:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    {"order": f"A content item with order {order} already exists in this lesson."}
                )

        # ensure appropriate field is filled
=======

>>>>>>> 2d673be (Added progress APIs with lesson percentage calculation)
        if content_type == "video" and not attrs.get("video_url"):
            raise serializers.ValidationError({
                "video_url": "Video URL is required for video content."
            })

        if content_type == "note" and not attrs.get("note_text"):
            raise serializers.ValidationError({
                "note_text": "Note text is required for note content."
            })

        if content_type == "file" and not attrs.get("file"):
            raise serializers.ValidationError({
                "file": "File is required for file content."
            })

        if content_type == "quiz" and not attrs.get("quiz"):
            raise serializers.ValidationError({
                "quiz": "Quiz JSON is required for quiz content."
            })

        return attrs


class LessonContentListSerializer(serializers.ModelSerializer):

    class Meta:
        model = Content
        fields = ["id", "title", "content_type", "order"]


class LessonContentDetailSerializer(serializers.ModelSerializer):
    lesson = serializers.StringRelatedField()

    class Meta:
        model = Content
        fields = "__all__"
