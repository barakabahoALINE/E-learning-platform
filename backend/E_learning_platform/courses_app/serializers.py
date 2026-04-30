
# import json
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from .models import Course, Module, Section, Content, Level, Category
import json

# ─────────────────────────────────────────────
# Content
# ─────────────────────────────────────────────

class ContentDetailSerializer(serializers.ModelSerializer):
    section = serializers.StringRelatedField()

    class Meta:
        model = Content
        fields = "__all__"


class ContentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Content
        fields = ["id", "title", "content_type", "order"]
        
        
class ContentCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Content
        fields = [
            "title",
            "content_type",
            "description",
            "video_url",
            "text_content",   # ✅ FIXED
            "file",
            "quiz",
            "order",
            "is_preview",
        ]

    def validate(self, attrs):
        content_type = attrs.get("content_type")

        # TEXT & SHELL
        if content_type in ("text", "shell") and not attrs.get("text_content"):
            raise serializers.ValidationError(
                {"text_content": f"text_content is required for {content_type} content."}
            )

        # VIDEO
        if content_type == "video" and not attrs.get("video_url"):
            raise serializers.ValidationError(
                {"video_url": "Video URL is required for video content."}
            )

        # FILE
        if content_type == "file" and not attrs.get("file"):
            raise serializers.ValidationError(
                {"file": "File is required for file content."}
            )

        # QUIZ
        if content_type == "quiz" and not attrs.get("quiz"):
            raise serializers.ValidationError(
                {"quiz": "Quiz data is required."}
            )

        return attrs

# ─────────────────────────────────────────────
# Section  (replaces Lesson)
# ─────────────────────────────────────────────

class SectionSerializer(serializers.ModelSerializer):
    contents = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = ["id", "module", "title", "order", "contents"]
        read_only_fields = ["module"]

    def get_contents(self, obj):
        return ContentDetailSerializer(obj.contents.all(), many=True).data

    def validate(self, attrs):
        view = self.context.get("view")
        module_id = view.kwargs.get("module_id") if view else None
        order = attrs.get("order")

        if module_id and order:
            qs = Section.objects.filter(module_id=module_id, order=order)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"A section with order {order} already exists in this module."
                )
        return attrs


# ─────────────────────────────────────────────
# Module
# ─────────────────────────────────────────────

class ModuleSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ["id", "course", "title", "description", "order", "quiz", "sections"]
        read_only_fields = ["course"]

    def get_sections(self, obj):
        return SectionSerializer(obj.sections.all(), many=True, context=self.context).data

    def validate(self, attrs):
        view = self.context.get("view")
        course_id = view.kwargs.get("course_id") if view else None
        order = attrs.get("order")

        if course_id and order:
            qs = Module.objects.filter(course_id=course_id, order=order)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"A module with order {order} already exists in this course."
                )
        return attrs


# ─────────────────────────────────────────────
# Course
# ─────────────────────────────────────────────

class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        validators=[
            UniqueValidator(
                queryset=Course.objects.all(),
                message="Course with this title already exists.",
            )
        ]
    )

    class Meta:
        model = Course
        fields = [
            "title", "description", "duration", "category", "level",
            "price", "thumbnail", "is_published",
        ]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # ── optional: inline modules update via multipart ──────────────
        modules_data_str = self.initial_data.get("modules")
        final_assessment_str = self.initial_data.get("finalAssessment")

        if final_assessment_str is not None:
            try:
                instance.final_assessment = (
                    json.loads(final_assessment_str)
                    if isinstance(final_assessment_str, str)
                    else final_assessment_str
                )
                instance.save()
            except Exception:
                pass

        if modules_data_str is not None:
            if isinstance(modules_data_str, str):
                try:
                    modules_data = json.loads(modules_data_str)
                except Exception:
                    modules_data = []
            else:
                modules_data = modules_data_str

            provided_module_ids = [str(m.get("id")) for m in modules_data if m.get("id")]
            Module.objects.filter(course=instance).exclude(id__in=provided_module_ids).delete()

            for module_data in modules_data:
                module_id = module_data.get("id")
                module = (
                    Module.objects.filter(id=module_id, course=instance).first()
                    if module_id else None
                )

                if not module:
                    module = Module.objects.create(
                        course=instance,
                        title=module_data.get("title", ""),
                        description=module_data.get("description", ""),
                        order=module_data.get("order", 0),
                        quiz=module_data.get("quiz", None),
                    )
                else:
                    module.title = module_data.get("title", module.title)
                    module.description = module_data.get("description", module.description)
                    module.order = module_data.get("order", module.order)
                    module.quiz = module_data.get("quiz", module.quiz)
                    module.save()

                # ── sections inside module ─────────────────────────────
                sections_data = module_data.get("sections", [])
                provided_section_ids = [str(s.get("id")) for s in sections_data if s.get("id")]
                Section.objects.filter(module=module).exclude(id__in=provided_section_ids).delete()

                for section_data in sections_data:
                    section_id = section_data.get("id")
                    section = (
                        Section.objects.filter(id=section_id, module=module).first()
                        if section_id else None
                    )

                    if not section:
                        section = Section.objects.create(
                            module=module,
                            title=section_data.get("title", ""),
                            order=section_data.get("order", 0),
                        )
                    else:
                        section.title = section_data.get("title", section.title)
                        section.order = section_data.get("order", section.order)
                        section.save()

                    # ── contents inside section ────────────────────────
                    contents_data = section_data.get("contents", [])
                    provided_content_ids = [str(c.get("id")) for c in contents_data if c.get("id")]
                    Content.objects.filter(section=section).exclude(id__in=provided_content_ids).delete()

                    for content_data in contents_data:
                        content_id = content_data.get("id")
                        content = (
                            Content.objects.filter(id=content_id, section=section).first()
                            if content_id else None
                        )

                        fields = dict(
                            title=content_data.get("title", ""),
                            content_type=content_data.get("content_type", "text"),
                            description=content_data.get("description", ""),
                            video_url=content_data.get("video_url", ""),
                            text_content=content_data.get("text_content", ""),
                            file=content_data.get("file", None),
                            quiz=content_data.get("quiz", None),
                            order=content_data.get("order", 0),
                        )

                        if not content:
                            Content.objects.create(section=section, **fields)
                        else:
                            for k, v in fields.items():
                                setattr(content, k, v)
                            content.save()

        return instance


class CourseListSerializer(serializers.ModelSerializer):
    admin = serializers.CharField(source="created_by.username", read_only=True)
    modules_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id", "title", "description", "duration", "price",
            "category", "level", "thumbnail", "is_published",
            "admin", "modules_count", "created_at", "updated_at",
        ]

    def get_modules_count(self, obj):
        return obj.modules.count()


class CourseDetailSerializer(serializers.ModelSerializer):
    modules = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def get_modules(self, obj):
        return ModuleSerializer(obj.modules.all(), many=True, context=self.context).data


# ─────────────────────────────────────────────
# Level / Category
# ─────────────────────────────────────────────

class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = "__all__"
class CategorySerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source="level.name", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "level", "level_name"]

        
        

from rest_framework import serializers
from .models import Quiz, Question, Option, Attempt, StudentAnswer
    
class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ["id", "text"]


class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "mark", "options"]


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "description", "questions"]
        
class StudentAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAnswer
        fields = ["question", "selected_option"]
        
class SubmitQuizSerializer(serializers.Serializer):
    quiz_id = serializers.IntegerField()
    answers = StudentAnswerSerializer(many=True)
        
# 

