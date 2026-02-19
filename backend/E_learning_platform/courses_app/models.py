
# Create your models here.
from django.db import models
from django.contrib.auth.models import User

from django.utils import timezone

class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration = models.CharField(max_length=50)
    instructor = models.ForeignKey(
    User,
    on_delete=models.CASCADE,
    null=True,
    blank=True
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



class Section(models.Model):
    course = models.ForeignKey("Course", on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    
class Lesson(models.Model):
    section = models.ForeignKey("Section", on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    video_url = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField()
    is_preview = models.BooleanField(default=False)