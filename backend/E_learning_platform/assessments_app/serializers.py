from rest_framework import serializers
from .models import *


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, source="choice_set", read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'choices']


class AssessmentSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, source="question_set", read_only=True)

    class Meta:
        model = Assessment
        fields = ['id', 'title', 'is_final', 'pass_mark', 'questions']