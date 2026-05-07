from rest_framework import serializers
from .models import Assessment, Question, Choice,Attempt
import random

class CreateAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = [
            'id',
            'course',
            'title',
            'is_final',
            'pass_mark',
            'duration',
            'instructions'
        ]
        
class ChoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['text', 'is_correct']
        
class QuestionCreateSerializer(serializers.ModelSerializer):
    choices = ChoiceCreateSerializer(many=True)

    class Meta:
        model = Question
        fields = ['assessment', 'question_text', 'question_type', 'marks','order', 'choices']

    def validate(self, data):
        # 🔥 1. Validate question text
        question_text = data.get('question_text')

        if not question_text or not question_text.strip():
            raise serializers.ValidationError("Question text cannot be empty.")

        # 🔥 2. Validate choices
        question_type = data.get('question_type')
        choices = data.get('choices')

        if not choices:
            raise serializers.ValidationError("Choices are required.")

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
            Choice.objects.create(question=question, **choice_data)

        return question

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'marks', 'choices']

class QuestionSerializer(serializers.ModelSerializer):
    choices = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'marks', 'order', 'choices']

    def get_choices(self, obj):
        choices = list(obj.choices.all())
        random.shuffle(choices)  # 🔥 shuffle choices

        return ChoiceSerializer(choices, many=True).data

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
