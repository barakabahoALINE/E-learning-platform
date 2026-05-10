from rest_framework import serializers
from .models import Assessment, Question, Choice
import random

# ASSESSMENT SERIALIZER
class CreateAssessmentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Assessment
        fields = [
            'id',
            'course',
            'module',
            'title',
            'is_final',
            'assessment_type',
            'pass_mark',
            'max_attempts',
            'duration',
            'descriptions',
            'instructions'
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)

        # QUIZ
        if not instance.is_final:
            data.pop("instructions", None)

        # FINAL ASSESSMENT
        else:
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

    class Meta:
        model = Question
        fields = ['assessment', 'question_text', 'question_type', 'marks', 'choices']

    def validate(self, data):

        question_text = data.get('question_text')
        question_type = data.get('question_type')
        choices = data.get('choices')

        # 1. Validate question text
        if not question_text or not question_text.strip():
            raise serializers.ValidationError("Question text cannot be empty.")

        # 2. Validate choices exist
        if not choices:
            raise serializers.ValidationError("Choices are required.")

        # 3. Count correct answers
        correct_count = sum(1 for c in choices if c.get('is_correct'))

        if question_type == "SINGLE" and correct_count != 1:
            raise serializers.ValidationError(
                "Single choice question must have exactly ONE correct answer."
            )

        if question_type == "MULTIPLE" and correct_count < 1:
            raise serializers.ValidationError(
                "Multiple choice question must have at least ONE correct answer."
            )

        return data

    def create(self, validated_data):

        choices_data = validated_data.pop('choices')

        question = Question.objects.create(**validated_data)

        for choice_data in choices_data:
            Choice.objects.create(
                question=question,
                **choice_data
            )

        return question

# CHOICE RESPONSE SERIALIZER
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
            'choices'
        ]

    def get_choices(self, obj):
        choices = list(obj.choices.all())
        random.shuffle(choices)  # shuffle for randomness
        return ChoiceSerializer(choices, many=True).data