from django.db import models
from django.conf import settings
from django.utils import timezone


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
    level = models.ForeignKey(Level, on_delete=models.CASCADE,null=True,blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE,null=True,blank=True)
    is_preview = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to="course_thumbnails/", null=True, blank=True) 
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_courses",
        null=True,
    )  
    created_at = models.DateTimeField(auto_now_add=True)   
    price = models.DecimalField(max_digits=8, decimal_places=2,default=0.00)
    is_published = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["is_published"]),
        ]
    def __str__(self):
        return self.title
 



class Lesson(models.Model):
    course = models.ForeignKey("Course", on_delete=models.CASCADE, related_name="lessons",null=True,blank=True)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    
class Content(models.Model):

    CONTENT_TYPES = (
        ("video", "Video"),
        ("note", "Note"),
        ("file", "File"),
        ('quiz', 'Quiz'),
    )

    lesson = models.ForeignKey(
        "Lesson",
        on_delete=models.CASCADE,
        related_name="contents"
    )

    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, null=True)
    note_text = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="lesson_files/", blank=True, null=True)
    quiz = models.JSONField(blank=True, null=True) 
    

    order = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]
        unique_together = ("lesson", "order")

    def __str__(self):
        return f"{self.lesson.title} - {self.title} ({self.content_type})"
