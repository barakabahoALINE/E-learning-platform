from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db import models
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class Level(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=255)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)

    def __str__(self):
        return self.name


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration = models.CharField(max_length=50)
    level = models.ForeignKey(Level, on_delete=models.CASCADE, null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    is_preview = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to="course_thumbnails/", null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_courses",
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    is_published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    # final_assessment = models.JSONField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["is_published"]),
        ]

    def __str__(self):
        return self.title


class Module(models.Model):
    """
    Course → Module (ifite sections + end-of-module quiz).
    """
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="modules",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    # End-of-module quiz — optional JSONField
    quiz = models.JSONField(blank=True, null=True)

    class Meta:
        unique_together = ("course", "order")
        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} — Module {self.order}: {self.title}"


class Section(models.Model):
    """
    Module → Section (yasimbuye Lesson).
    Buri Section ifite Contents zayo.
    """
    module = models.ForeignKey(
        Module,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()

    class Meta:
        unique_together = ("module", "order")
        ordering = ["order"]

    def __str__(self):
        return f"{self.module.title} — Section {self.order}: {self.title}"


class Content(models.Model):
    CONTENT_TYPES = (
        ("video", "Video"),
        ("file", "File"),
        ("text", "Text"),
        ("shell", "Shell"),
        ("quiz", "Quiz"),
    )

    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        null=True,      # 🔥 allow temporarily
        blank=True,
        related_name="contents",
    )
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, null=True)
    text_content= models.TextField(blank=True, null=True)   # text & shell
    file = models.FileField(upload_to="content_files/", blank=True, null=True)
    quiz = models.JSONField(blank=True, null=True)
    is_preview = models.BooleanField(default=False)
    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("section", "order")

    def __str__(self):
        return f"{self.section.title} — {self.title} ({self.content_type})"


class MediaUpload(models.Model):
    file = models.FileField(upload_to="course_media/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload {self.id} - {self.file.name}"
    
    
    
# from django.conf import settings
# from django.contrib.auth import get_user_model

# User = get_user_model()
##### added model for   quiz 
    
from django.db import models
from courses_app.models import Module
from django.conf import settings

from django.db import models
from django.conf import settings
from courses_app.models import Module


class Quiz(models.Model):
    module = models.OneToOneField(
        Module,
        on_delete=models.CASCADE,
        related_name="module_quiz"   # 🔥 FIX: avoid conflict
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    pass_mark = models.IntegerField(default=70)
    def __str__(self):
        return self.title


class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="questions"
    )
    text = models.TextField()
    mark = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.text


class Option(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options"
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return self.text


class Attempt(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="quiz_attempts"   # 🔥 FIX: avoid clash with other app
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts"
    )
    score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    passed = models.BooleanField(default=False)  # 👈 ongeraho iri


class StudentAnswer(models.Model):
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name="answers"
    )
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(
        Option,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    is_correct = models.BooleanField(default=False)

# class Quiz(models.Model):
#     module = models.OneToOneField(Module, on_delete=models.CASCADE, related_name="quiz")
#     title = models.CharField(max_length=255)
#     description = models.TextField(blank=True)
    
#     def __str__(self):
#         return self.title
    
    
# class Question(models.Model):
#     quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
#     text = models.TextField()
#     mark = models.PositiveIntegerField(default=1)
    
#     def __str__(self):
#         return self.text
    
# class Option(models.Model):
#     question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="options")
#     text = models.CharField(max_length=255)
#     is_correct = models.BooleanField(default=False)
    


# class Attempt(models.Model):
#     student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
#     quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
#     score = models.FloatField(default=0)
#     created_at = models.DateTimeField(auto_now_add=True)   
    
    
# class StudentAnswer(models.Model):
#     attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name="answers")
#     question = models.ForeignKey(Question, on_delete=models.CASCADE)
#     selected_option = models.ForeignKey(Option, on_delete=models.CASCADE, null=True, blank=True)
#     is_correct = models.BooleanField(default=False)

# from django.conf import settings
# from django.contrib.auth import get_user_model

# User = get_user_model()

# class Level(models.Model):
#     name = models.CharField(max_length=100)

#     def __str__(self):
#         return self.name


# class Category(models.Model):
#     name = models.CharField(max_length=255)
#     level = models.ForeignKey(Level, on_delete=models.CASCADE)

#     def __str__(self):
#         return self.name
    
# class Course(models.Model):
#     title = models.CharField(max_length=255)
#     description = models.TextField()
#     duration = models.CharField(max_length=50)
#     level = models.ForeignKey(Level, on_delete=models.CASCADE,null=True,blank=True)
#     category = models.ForeignKey(Category, on_delete=models.CASCADE,null=True,blank=True)
#     is_preview = models.BooleanField(default=False)
#     thumbnail = models.ImageField(upload_to="course_thumbnails/", null=True, blank=True) 
#     created_by = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="created_courses",null=True,)  
#     created_at = models.DateTimeField(auto_now_add=True)   
#     price = models.DecimalField(max_digits=8, decimal_places=2,default=0.00)
#     is_published = models.BooleanField(default=False)
#     updated_at = models.DateTimeField(auto_now=True)
#     final_assessment = models.JSONField(blank=True, null=True)
    
#     class Meta:
#         ordering = ["-created_at"]
#         indexes = [
#             models.Index(fields=["title"]),
#             models.Index(fields=["is_published"]),
#         ]
#     def __str__(self):
#         return self.title
 



# class Lesson(models.Model):
#     course = models.ForeignKey("Course", on_delete=models.CASCADE, related_name="lessons", null=True, blank=True)
#     title = models.CharField(max_length=255)
#     order = models.PositiveIntegerField()

#     class Meta:
#         unique_together = ("course", "order")  # Same order not allowed within the same course
    
    
# class Content(models.Model):
#     CONTENT_TYPES = (
#         ("video", "Video"),
#         ("note", "Note"),
#         ("image", "Image"),
#         ("file", "File"),
#         ('quiz', 'Quiz'),
#     )

#     lesson = models.ForeignKey(
#         "Lesson",
#         on_delete=models.CASCADE,
#         related_name="contents"
#     )

#     title = models.CharField(max_length=255)
#     content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
#     description = models.TextField(blank=True)
#     video_url = models.URLField(blank=True, null=True)
#     note_text = models.TextField(blank=True, null=True)
#     file = models.FileField(upload_to="lesson_files/", blank=True, null=True)
#     quiz = models.JSONField(blank=True, null=True)
#     is_preview = models.BooleanField(default=False)
#     order = models.PositiveIntegerField()
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         ordering = ["order"]
#         unique_together = ("lesson", "order")

#     def __str__(self):
#         return f"{self.lesson.title} - {self.title} ({self.content_type})"

# class MediaUpload(models.Model):
#     file = models.FileField(upload_to="course_media/")
#     uploaded_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"Upload {self.id} - {self.file.name}"