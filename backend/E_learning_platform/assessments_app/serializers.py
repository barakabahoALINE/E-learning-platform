from rest_framework import serializers
from .models import *
from .services.rules import RuleError, validate_unique_assessment
import random

# ASSESSMENT SERIALIZER
class CreateAssessmentSerializer(serializers.ModelSerializer):
    is_final = serializers.BooleanField(required=False, write_only=True)

    max_attempts = serializers.IntegerField(required=False, default=1, min_value=0)
    duration = serializers.IntegerField(required=False, default=30, min_value=0)
    tab_switch_enabled = serializers.BooleanField(required=False, default=False)
    tab_switch_limit = serializers.IntegerField(required=False, default=0, min_value=0)

    class Meta:
        model = Assessment
        fields = [
            'id',
            'course',
            'module',
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

        return data

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

        data.pop("module", None)
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

        question_text = data.get('question_text')

        if not question_text or not question_text.strip():
            raise serializers.ValidationError(
                "Question text cannot be empty."
            )

        question_type = data.get('question_type')

        choices = data.get('choices')

        # 1. Validate question text
        if not question_text or not str(question_text).strip():
            raise serializers.ValidationError("Question text cannot be empty.")

        # 2. Validate choices exist
        if question_type == "matching":
            matching_pairs = data.get('matching_pairs')
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

    def get_choices(self, obj):
        if obj.question_type == Question.QuestionType.MATCHING:
            return []

        choices = list(obj.choices.all())
        random.shuffle(choices)
        return ChoiceSerializer(
            choices,
            many=True
        ).data

    def get_matching_pairs(self, obj):
        if obj.question_type != Question.QuestionType.MATCHING:
            return []

        pairs = obj.matching_pairs or []
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

    class Meta:
        model = Assessment
        fields = [
            'id',
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
