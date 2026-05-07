from django.contrib import admin
from .models import Assessment, Question, Choice, Attempt,Feedback,StudentAnswer

# Register your models here.


@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):  
    list_display = ('text', 'question', 'is_correct')
    list_filter = ('is_correct', 'question')
    search_fields = ('text', 'question__question_text')


# -----------------------------
# Choice Inline (inside Question)
# -----------------------------
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2


# -----------------------------
# Question Admin
# -----------------------------
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "question_text", "assessment", "question_type")
    list_filter = ("assessment", "question_type")
    search_fields = ("question_text",)
    inlines = [ChoiceInline]


# -----------------------------
# Assessment Admin
# -----------------------------
class AssessmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "course",
        "is_final",
        "pass_mark",
        "max_attempts",
        "time_limit_minutes",
    )
    list_filter = ("is_final", "course")
    search_fields = ("title",)


# -----------------------------
# Attempt Admin
# -----------------------------
class AttemptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "student",
        "assessment",
        "attempt_number",
        "is_locked",
        "is_submitted",
        "passed",
        "started_at",
    )
    list_filter = ("is_locked", "is_submitted", "passed")
    search_fields = ("student__email",)

@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'course')
    search_fields = ('student__username', 'course__title')

@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'attempt',
        'question',
        'selected_choice',
        'is_correct'
    )

    list_filter = ('is_correct',)
# -----------------------------
# Register Models
# -----------------------------
admin.site.register(Assessment, AssessmentAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Attempt, AttemptAdmin)

