from django.contrib import admin
from .models import Assessment, Question, Choice, Attempt

# Register your models here.

@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'is_final', 'pass_mark', 'max_attempts', 'duration')
    list_filter = ('is_final', 'course')
    search_fields = ('title', 'course__title')

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('question_text', 'assessment', 'question_type', 'marks')
    list_filter = ('question_type', 'assessment')
    search_fields = ('question_text', 'assessment__title')

@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):  
    list_display = ('text', 'question', 'is_correct')
    list_filter = ('is_correct', 'question')
    search_fields = ('text', 'question__question_text')

