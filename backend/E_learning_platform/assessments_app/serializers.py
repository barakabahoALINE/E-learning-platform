from django.db.models import Q
from rest_framework import serializers
from courses_app.models import Course, Module
from .models import *
from .services.rules import RuleError, validate_unique_assessment
import random

# ASSESSMENT SERIALIZER
class CreateAssessmentSerializer(serializers.ModelSerializer):
    is_final = serializers.BooleanField(required=False, write_only=True)

    max_attempts = serializers.IntegerField(required=False, default=1, min_value=0, allow_null=True)
    duration = serializers.IntegerField(required=False, default=30, min_value=0, allow_null=True)
    tab_switch_enabled = serializers.BooleanField(required=False, default=False)
    tab_switch_limit = serializers.IntegerField(required=False, default=0, min_value=0)

    courses = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all(), many=True, required=False)
    modules = serializers.PrimaryKeyRelatedField(queryset=Module.objects.all(), many=True, required=False)

    class Meta:
        model = Assessment
        fields = [
            'id',
            'course',
            'module',
            'courses',
            'modules',
            'assessment_type',
            'is_final',
            'title',
            'pass_mark',
            'max_attempts',
            'duration',
            'tab_switch_enabled',
            'tab_switch_limit',
            'descriptions',
            'instructions',
            'is_published',
            'has_unpublished_changes',
            'pending_delete',
        ]
        read_only_fields = ['is_published', 'has_unpublished_changes', 'pending_delete']


    def validate(self, data):
        is_final = data.pop('is_final', None)
        assessment_type = data.get('assessment_type')

        if not assessment_type and is_final is not None:
            data['assessment_type'] = 'FINAL' if is_final else 'QUIZ'

        # ── Shyira defaults mbere yo kugenzura ──────────
        if data.get('pass_mark') is None:
            data['pass_mark'] = 70
        if data.get('max_attempts') is None:
            data['max_attempts'] = 1
        if data.get('duration') is None:
            data['duration'] = 30
        if data.get('tab_switch_enabled') is None:
            data['tab_switch_enabled'] = False
        if data.get('tab_switch_limit') is None:
            data['tab_switch_limit'] = 0

        course = data.get('course')
        module = data.get('module')

        if module and not course:
            data['course'] = module.course
            course = module.course

        if data['assessment_type'] == 'FINAL':
            if module is not None or data.get('modules'):
                raise serializers.ValidationError("Final assessment cannot be linked to a module.")

        if data['assessment_type'] == 'QUIZ' and module is None and not data.get('modules') and course is not None:
            raise serializers.ValidationError("Quiz must be linked to a module when a course is provided.")

        assessment = Assessment(
            course=data.get('course'),
            module=data.get('module'),
            assessment_type=data.get('assessment_type'),
            title=data.get('title'),
            pass_mark=data.get('pass_mark'),
            max_attempts=data.get('max_attempts'),
            duration=data.get('duration'),
            tab_switch_enabled=data.get('tab_switch_enabled', False),
            tab_switch_limit=data.get('tab_switch_limit', 0),
            descriptions=data.get('descriptions'),
            instructions=data.get('instructions')
        )

        try:
            validate_unique_assessment(assessment)
        except RuleError as exc:
            raise serializers.ValidationError(str(exc.message))

        if data.get('courses'):
            selected_courses = data['courses']
            for course in selected_courses:
                existing_final = Assessment.objects.filter(
                    Q(course=course) | Q(courses=course),
                    assessment_type='FINAL'
                )
                if self.instance:
                    existing_final = existing_final.exclude(pk=self.instance.pk)
                if existing_final.exists():
                    raise serializers.ValidationError(
                        f"A final assessment already exists for course {course.id}."
                    )

        if data.get('modules'):
            selected_modules = data['modules']
            for module in selected_modules:
                existing_quiz = Assessment.objects.filter(
                    Q(module=module) | Q(modules=module),
                    assessment_type='QUIZ'
                )
                if self.instance:
                    existing_quiz = existing_quiz.exclude(pk=self.instance.pk)
                if existing_quiz.exists():
                    raise serializers.ValidationError(
                        f"A quiz already exists for module {module.id}."
                    )

        return data

    def create(self, validated_data):
        courses = validated_data.pop('courses', [])
        modules = validated_data.pop('modules', [])

        assessment = Assessment.objects.create(
            course=validated_data.get('course'),
            module=validated_data.get('module'),
            assessment_type=validated_data.get('assessment_type'),
            title=validated_data.get('title'),
            pass_mark=validated_data.get('pass_mark'),
            max_attempts=validated_data.get('max_attempts'),
            duration=validated_data.get('duration'),
            tab_switch_enabled=validated_data.get('tab_switch_enabled', False),
            tab_switch_limit=validated_data.get('tab_switch_limit', 0),
            descriptions=validated_data.get('descriptions'),
            instructions=validated_data.get('instructions')
        )

        if courses:
            assessment.courses.set(courses)
            if not assessment.course:
                assessment.course = courses[0]

        if modules:
            assessment.modules.set(modules)
            if not assessment.module:
                assessment.module = modules[0]
            if not assessment.course:
                assessment.course = modules[0].course

        assessment.save()
        return assessment

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # QUIZ — kura ibidakenewe
        if instance.assessment_type == "QUIZ":
            data.pop("instructions", None)
            data.pop("duration", None)
            data.pop("max_attempts", None)
            data.pop("tab_switch_enabled", None)
            data.pop("tab_switch_limit", None)

        # FINAL — kura ibidakenewe
        elif instance.assessment_type == "FINAL":
            data.pop("descriptions", None)

        return data


# CHOICE CREATE SERIALIZER
class ChoiceCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Choice
        fields = ['text', 'is_correct']

# QUESTION CREATE SERIALIZER
class QuestionCreateSerializer(serializers.ModelSerializer):

    choices = ChoiceCreateSerializer(many=True, required=False)
    matching_pairs = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_null=True
    )
    order = serializers.IntegerField(required=False)

    class Meta:
        model = Question
        fields = ['assessment', 'question_text', 'question_type', 'marks', 'choices', 'matching_pairs', 'order']

    def validate(self, data):

        question_text = data.get(
            'question_text',
            self.instance.question_text if self.instance else None,
        )

        if not question_text or not question_text.strip():
            raise serializers.ValidationError(
                "Question text cannot be empty."
            )

        question_type = data.get(
            'question_type',
            self.instance.question_type if self.instance else None,
        )

        choices = data.get('choices')
        if choices is None and self.instance and question_type != "matching":
            choices = list(self.instance.choices.values('text', 'is_correct'))

        # 1. Validate question text
        if not question_text or not str(question_text).strip():
            raise serializers.ValidationError("Question text cannot be empty.")

        # 2. Validate choices exist
        if question_type == "matching":
            matching_pairs = data.get('matching_pairs')
            if matching_pairs is None and self.instance:
                matching_pairs = (
                    self.instance.draft_matching_pairs
                    if self.instance.draft_matching_pairs is not None
                    else self.instance.matching_pairs
                )
            if not matching_pairs or not isinstance(matching_pairs, list) or len(matching_pairs) == 0:
                raise serializers.ValidationError(
                    "Matching questions require at least one pair."
                )
            for pair in matching_pairs:
                left = pair.get('left')
                right = pair.get('right')
                if not left or not str(left).strip() or not right or not str(right).strip():
                    raise serializers.ValidationError(
                        "Each matching pair must include both a left and right value."
                    )
        else:
            if not choices:
                raise serializers.ValidationError(
                    "Choices are required."
                )

            # 3. Count correct answers
            correct_count = sum(1 for c in choices if c.get('is_correct'))

            if question_type == "single" and correct_count != 1:
                raise serializers.ValidationError(
                    "Single choice question must have exactly ONE correct answer."
                )

            if question_type == "multiple" and correct_count < 1:
                raise serializers.ValidationError(
                    "Multiple choice question must have at least ONE correct answer."
                )

        return data

    def create(self, validated_data):

        choices_data = validated_data.pop('choices', None)
        matching_pairs = validated_data.pop('matching_pairs', None)
        order = validated_data.pop('order', None)

        if order is None:
            assessment = validated_data.get('assessment')
            last_question = assessment.questions.order_by('-order').first()
            order = (last_question.order + 1) if last_question else 1

        question = Question.objects.create(order=order, matching_pairs=matching_pairs or None, **validated_data)

        if choices_data:
            for choice_data in choices_data:
                Choice.objects.create(
                    question=question,
                    **choice_data
                )

        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        matching_pairs = validated_data.pop('matching_pairs', None)

        # Update the Question instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if matching_pairs is not None:
            instance.matching_pairs = matching_pairs
        instance.save()

        # Update the choices nested field
        if choices_data is not None:
            instance.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(
                    question=instance,
                    **choice_data
                )

        return instance


class ChoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']

# QUESTION RESPONSE SERIALIZER 
class QuestionSerializer(serializers.ModelSerializer):

    choices = serializers.SerializerMethodField()
    matching_pairs = serializers.SerializerMethodField()

    class Meta:
        model = Question

        fields = [
            'id',
            'question_text',
            'question_type',
            'marks',
            'order',
            'choices',
            'matching_pairs'
        ]

    def _is_editor(self):
        request = self.context.get('request')
        user = request.user if request else None
        return bool(user and (
            user.is_superuser or
            user.groups.filter(name__in=['Admin', 'Instructor']).exists() or
            getattr(user, 'role', None) in ['admin', 'instructor']
        ))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._is_editor():
            return data

        if instance.draft_question_text is not None:
            data['question_text'] = instance.draft_question_text
        if instance.draft_question_type is not None:
            data['question_type'] = instance.draft_question_type
        if instance.draft_marks is not None:
            data['marks'] = instance.draft_marks
        return data

    def get_choices(self, obj):
        question_type = obj.question_type
        if self._is_editor() and obj.draft_question_type is not None:
            question_type = obj.draft_question_type
        if question_type == Question.QuestionType.MATCHING:
            return []

        if self._is_editor() and obj.draft_choices is not None:
            return obj.draft_choices

        choices = list(obj.choices.all())
        random.shuffle(choices)
        return ChoiceSerializer(
            choices,
            many=True
        ).data

    def get_matching_pairs(self, obj):
        question_type = obj.question_type
        if self._is_editor() and obj.draft_question_type is not None:
            question_type = obj.draft_question_type
        if question_type != Question.QuestionType.MATCHING:
            return []

        pairs = obj.matching_pairs or []
        if self._is_editor() and obj.draft_matching_pairs is not None:
            pairs = obj.draft_matching_pairs
        if isinstance(pairs, list):
            shuffled = list(pairs)
            random.shuffle(shuffled)
            return shuffled
        return []


class StartAttemptSerializer(serializers.ModelSerializer):

    class Meta:
        model = Attempt

        fields = [
            "id",
            "assessment",
            "attempt_number",
            "started_at",
            "is_locked",
            "is_submitted",
        ]

        read_only_fields = fields

class AssessmentDetailSerializer(serializers.ModelSerializer):
    """
    Read-only serializer returning an Assessment together with its full
    questions/choices tree.  Used by CourseDetailSerializer and
    ModuleSerializer to embed quiz/final-assessment data in course responses.
    """
    questions = QuestionSerializer(many=True, read_only=True)
    course_title = serializers.SerializerMethodField()
    module_title = serializers.SerializerMethodField()
    course_attachments = serializers.SerializerMethodField()
    module_attachments = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id',
            'course',
            'course_title',
            'module',
            'module_title',
            'course_attachments',
            'module_attachments',
            'title',
            'assessment_type',
            'pass_mark',
            'tab_switch_enabled',
            'tab_switch_limit',
            'max_attempts',
            'duration',
            'descriptions',
            'instructions',
            'is_published',
            'has_unpublished_changes',
            'pending_delete',
            'questions',
        ]

    def get_course_title(self, obj):
        if obj.course_id is not None:
            return obj.course.title if obj.course else None
        if obj.courses.exists():
            first_course = obj.courses.first()
            return first_course.title if first_course else None
        return None

    def get_module_title(self, obj):
        if obj.module_id is not None:
            return obj.module.title if obj.module else None
        if obj.modules.exists():
            first_module = obj.modules.first()
            return first_module.title if first_module else None
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        pending_ids = set(
            instance.questions.filter(pending_delete=True).values_list('id', flat=True)
        )
        data['questions'] = [
            question for question in data['questions']
            if question['id'] not in pending_ids
        ]
        return data

    def get_course_attachments(self, obj):
        seen = set()
        attached = []

        for course in list(obj.courses.all()):
            if course and course.id not in seen:
                attached.append({
                    'id': course.id,
                    'title': course.title,
                })
                seen.add(course.id)

        if obj.course_id is not None and obj.course_id not in seen:
            attached.append({
                'id': obj.course.id,
                'title': obj.course.title,
            })

        return attached

    def get_module_attachments(self, obj):
        seen = set()
        attached = []

        for module in list(obj.modules.all()):
            if module and module.id not in seen:
                attached.append({
                    'id': module.id,
                    'title': module.title,
                    'course_id': module.course_id,
                    'course_title': module.course.title if module.course else None,
                })
                seen.add(module.id)

        if obj.module_id is not None and obj.module_id not in seen:
            module = obj.module
            attached.append({
                'id': module.id,
                'title': module.title,
                'course_id': module.course_id,
                'course_title': module.course.title if module.course else None,
            })

        return attached
