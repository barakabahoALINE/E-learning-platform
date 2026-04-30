from django.db import models
# from django.contrib.auth import get_user_model
# User = get_user_model()

# Create your models here.
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Assessment(models.Model):
    course = models.ForeignKey("courses_app.Course", on_delete=models.CASCADE)
    title = models.CharField(max_length=255)

    is_final = models.BooleanField(default=False)
    pass_mark = models.IntegerField(default=70)

    def __str__(self):
        return self.title


class Question(models.Model):
    QUESTION_TYPES = [
        ('MCQ', 'Multiple Choice (Single)'),
        ('MCQ_MULTI', 'Multiple Choice (Multiple)'),
        ('OPEN', 'Open Ended'),
    ]
    assessment = models.ForeignKey(
    Assessment,
    on_delete=models.CASCADE,
    related_name="questions"
)
    # assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)

    correct_text_answer = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.text


class Choice(models.Model):
    # question = models.ForeignKey(Question, on_delete=models.CASCADE)
    question = models.ForeignKey(
    Question,
    on_delete=models.CASCADE,
    related_name="choices"
)
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE)

    score = models.IntegerField(default=0)
    percentage = models.FloatField(default=0)
    passed = models.BooleanField(default=False)

    attempt_number = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    next_allowed_attempt = models.DateTimeField(null=True, blank=True)
    
    class Meta:
     unique_together = ('student', 'assessment', 'attempt_number')

    # def __str__(self):
    #     return f"{self.student} - {self.assessment}"
    
    
class StudentAnswer(models.Model):
     attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE)
     question = models.ForeignKey(Question, on_delete=models.CASCADE)

     selected_choice = models.ForeignKey(
        Choice,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="single_answers"   # ✅ FIX
    )

     selected_choices = models.ManyToManyField(
        Choice,
        blank=True,
        related_name="multi_answers"    # ✅ FIX
    )

     text_answer = models.TextField(blank=True, null=True)

     is_correct = models.BooleanField(default=False)
     is_final=models.BooleanField(default=False)

# class StudentAnswer(models.Model):
#     attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE)
#     question = models.ForeignKey(Question, on_delete=models.CASCADE)

#     selected_choice = models.ForeignKey(
#         Choice, null=True, blank=True, on_delete=models.SET_NULL
#     )  # for radio

#     selected_choices = models.ManyToManyField(Choice, blank=True)  # for checkbox

#     text_answer = models.TextField(blank=True, null=True)

#     is_correct = models.BooleanField(default=False)
    
    
class Feedback(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey("courses_app.Course", on_delete=models.CASCADE)
    comment = models.TextField()