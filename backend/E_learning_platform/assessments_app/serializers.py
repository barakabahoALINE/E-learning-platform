from rest_framework import serializers
from .models import *
from .services.rules import RuleError, validate_unique_assessment
import random

# ASSESSMENT SERIALIZER
class CreateAssessmentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Assessment

        fields = [
            'id',
            'course',
            'module',
            'assessment_type',
            'title',
            'pass_mark',
            'max_attempts',
            'duration',
            'descriptions',
            'instructions'
        ]
    
    def validate(self, data):

        assessment = Assessment(
            course=data.get('course'),
            module=data.get('module'),
            assessment_type=data.get('assessment_type'),
            title=data.get('title'),
            pass_mark=data.get('pass_mark', 60),
            max_attempts=data.get('max_attempts', 3),
            duration=data.get('duration', 30),
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
        # QUIZ
        if instance.assessment_type == "QUIZ":
            data.pop("instructions", None)
            data.pop("duration", None)
            data.pop("max_attempts", None)
            
            # FINAL
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

    choices = ChoiceCreateSerializer(many=True)
    order = serializers.IntegerField(required=False)

    class Meta:
        model = Question
        fields = ['assessment', 'question_text', 'question_type', 'marks', 'choices', 'order']

    def validate(self, data):

        question_text = data.get('question_text')

        if not question_text or not question_text.strip():
            raise serializers.ValidationError(
                "Question text cannot be empty."
            )

        question_type = data.get('question_type')

        choices = data.get('choices')

        # 1. Validate question text
        if not question_text or not question_text.strip():
            raise serializers.ValidationError("Question text cannot be empty.")

        # 2. Validate choices exist
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

        choices_data = validated_data.pop('choices')
        order = validated_data.pop('order', None)

        if order is None:
            assessment = validated_data.get('assessment')
            last_question = assessment.questions.order_by('-order').first()
            order = (last_question.order + 1) if last_question else 1

        question = Question.objects.create(order=order, **validated_data)

        for choice_data in choices_data:
            Choice.objects.create(
                question=question,
                **choice_data
            )

        return question


class ChoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Choice
        fields = ['id', 'text']

# QUESTION RESPONSE SERIALIZER
class QuestionSerializer(serializers.ModelSerializer):

    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question

        fields = [
            'id',
            'question_text',
            'question_type',
            'marks',
            'order',
            'choices'
        ]

    def get_choices(self, obj):

        choices = list(obj.choices.all())

        random.shuffle(choices)

        return ChoiceSerializer(
            choices,
            many=True
        ).data


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