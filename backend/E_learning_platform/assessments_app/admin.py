from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Assessment, Question, Choice, Attempt, StudentAnswer, Feedback


# =========================
# 🔵 CHOICE INLINE (FOR QUESTIONS)
# =========================
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 2


# =========================
# 🟢 QUESTION ADMIN
# =========================
@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'text', 'assessment', 'question_type')
    list_filter = ('question_type', 'assessment')
    search_fields = ('text',)

    inlines = [ChoiceInline]


# =========================
# 🟡 ASSESSMENT ADMIN
# =========================
@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'course', 'is_final', 'pass_mark')
    list_filter = ('is_final', 'course')
    search_fields = ('title',)


# =========================
# 🔵 CHOICE ADMIN (OPTIONAL)
# =========================
@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'text', 'question', 'is_correct')
    list_filter = ('is_correct',)


# =========================
# 🟣 ATTEMPT ADMIN
# =========================
@admin.register(Attempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'student',
        'assessment',
        'score',
        'percentage',
        'passed',
        'attempt_number',
        'created_at'
    )

    list_filter = ('passed', 'assessment')
    search_fields = ('student__username',)


# =========================
# 🔴 STUDENT ANSWER ADMIN
# =========================
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


# =========================
# 🟠 FEEDBACK ADMIN
# =========================
@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'course')
    search_fields = ('student__username', 'course__title')