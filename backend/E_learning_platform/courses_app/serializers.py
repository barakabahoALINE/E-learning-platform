from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Course, Lesson, Content, Level, Category
import json
from django.db import transaction


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        validators=[UniqueValidator(queryset=Course.objects.all(), message="Course with this title already exists.")]
    )

    class Meta:
        model = Course
        fields = ["title", "description", "duration", "category", "level", "price", "final_assessment", "thumbnail", "is_published"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        lessons_data_str = self.initial_data.get("lessons")
        final_assessment_str = self.initial_data.get("finalAssessment")

        if final_assessment_str is not None:
            try:
                instance.final_assessment = json.loads(final_assessment_str) if isinstance(final_assessment_str, str) else final_assessment_str
                instance.save()
            except Exception:
                pass

        if lessons_data_str is not None:
            if isinstance(lessons_data_str, str):
                try:
                    lessons_data = json.loads(lessons_data_str)
                except Exception:
                    lessons_data = []
            else:
                lessons_data = lessons_data_str
                
            provided_lesson_ids = [str(l.get("id")) for l in lessons_data if l.get("id")]
            Lesson.objects.filter(course=instance).exclude(id__in=provided_lesson_ids).delete()

            for lesson_data in lessons_data:
                lesson_id = lesson_data.get("id")
                lesson = Lesson.objects.filter(id=lesson_id, course=instance).first() if lesson_id else None
                
                if not lesson:
                    lesson = Lesson.objects.create(
                        course=instance,
                        title=lesson_data.get("title", ""),
                        order=lesson_data.get("order", 0)
                    )
                else:
                    lesson.title = lesson_data.get("title", lesson.title)
                    lesson.order = lesson_data.get("order", lesson.order)
                    lesson.save()

                contents_data = lesson_data.get("contents", [])
                provided_content_ids = [str(c.get("id")) for c in contents_data if c.get("id")]
                Content.objects.filter(lesson=lesson).exclude(id__in=provided_content_ids).delete()

                for content_data in contents_data:
                    content_id = content_data.get("id")
                    content = Content.objects.filter(id=content_id, lesson=lesson).first() if content_id else None
                    
                    if not content:
                        Content.objects.create(
                            lesson=lesson,
                            title=content_data.get("title", ""),
                            content_type=content_data.get("content_type", "note"),
                            description=content_data.get("description", ""),
                            video_url=content_data.get("video_url", ""),
                            note_text=content_data.get("note_text") or content_data.get("text_content", ""),
                            file=content_data.get("file"),
                            quiz=content_data.get("quiz"),
                            order=content_data.get("order", 0)
                        )
                    else:
                        content.title = content_data.get("title", content.title)
                        content.content_type = content_data.get("content_type", content.content_type)
                        content.description = content_data.get("description", content.description)
                        content.video_url = content_data.get("video_url", content.video_url)
                        content.note_text = content_data.get("note_text") or content_data.get("text_content", content.note_text)
                        content.file = content_data.get("file", content.file)
                        content.quiz = content_data.get("quiz", content.quiz)
                        content.order = content_data.get("order", content.order)
                        content.save()
        return instance

class CourseListSerializer(serializers.ModelSerializer):
    admin = serializers.CharField(source="created_by.username", read_only=True)
    lessons_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "description",
            "duration",
            "price",
            "category",
            "level",
            "thumbnail",
            "is_published",
            "admin",
            "lessons_count",
            "created_at",
            "updated_at"
        ]

    def get_lessons_count(self, obj):
        return obj.lessons.count()

class CourseDetailSerializer(serializers.ModelSerializer):
    lessons = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_lessons(self, obj):
        lessons = obj.lessons.all()
        return LessonSerializer(lessons, many=True).data

class LessonContentCreateUpdateSerializer(serializers.ModelSerializer):
    file = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Content
        fields = [
            "id",
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
        if content_type == "video" and not attrs.get("video_url"):
            raise serializers.ValidationError({
                "video_url": "Video URL is required for video content."
            })

        if content_type == "image" and not (attrs.get("description") or attrs.get("file")):
            raise serializers.ValidationError({
                "description": "Image URL or file is required for image content."
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

class LessonSerializer(serializers.ModelSerializer):
    contents = LessonContentCreateUpdateSerializer(many=True, required=False)

    class Meta:
        model = Lesson
        fields = ["id", "course", "title", "order", "contents"]
        read_only_fields = ["course"]

    def create(self, validated_data):
        contents_data = validated_data.pop('contents', [])
        with transaction.atomic():
            lesson = Lesson.objects.create(**validated_data)
            for content_data in contents_data:
                Content.objects.create(lesson=lesson, **content_data)
        return lesson

    def update(self, instance, validated_data):
        contents_data = validated_data.pop('contents', [])
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # Manage nested contents
            provided_ids = [c.get('id') for c in contents_data if c.get('id')]
            instance.contents.exclude(id__in=provided_ids).delete()

            for content_data in contents_data:
                content_id = content_data.get('id')
                if content_id:
                    content_instance = Content.objects.filter(id=content_id, lesson=instance).first()
                    if content_instance:
                        for attr, value in content_data.items():
                            setattr(content_instance, attr, value)
                        content_instance.save()
                    else:
                        Content.objects.create(lesson=instance, **content_data)
                else:
                    Content.objects.create(lesson=instance, **content_data)
        return instance

    def validate(self, attrs):
        view = self.context.get("view")
        course_id = view.kwargs.get("course_id")
        order = attrs.get("order")

        queryset = Lesson.objects.filter(course_id=course_id, order=order)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                f"A lesson with order {order} already exists in this course."
            )

        return attrs

class LessonContentListSerializer(serializers.ModelSerializer): 
    class Meta:
        model = Content
        fields = "__all__"

class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = "__all__"

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class LessonContentDetailSerializer(serializers.ModelSerializer):
    lesson = serializers.StringRelatedField()

    class Meta:
        model = Content
        fields = "__all__"
