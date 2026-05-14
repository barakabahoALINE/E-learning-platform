from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Level(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Category(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

# COURSE
class Course(models.Model):
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    duration = models.CharField(max_length=50)
    level = models.ForeignKey(Level,on_delete=models.CASCADE,null=True,blank=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, null=True, blank=True)
    is_preview = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to="course_thumbnails/",null=True,blank=True)
    price = models.DecimalField(max_digits=8,decimal_places=2,default=0.00)
    final_assessment = models.JSONField(blank=True,null=True)

    # unpublished changes fields
    draft_title = models.CharField(max_length=255, null=True, blank=True)
    draft_description = models.TextField(null=True,blank=True)
    draft_duration = models.CharField(max_length=50,null=True,blank=True)
    draft_level = models.ForeignKey(Level,on_delete=models.SET_NULL,null=True,blank=True,related_name="draft_courses_level")
    draft_category = models.ForeignKey(Category,on_delete=models.SET_NULL,null=True,blank=True,related_name="draft_courses_category")
    draft_thumbnail = models.ImageField(upload_to="draft_course_thumbnails/",null=True,blank=True)
    draft_price = models.DecimalField(max_digits=8,decimal_places=2,null=True,blank=True)
    
    # Status fields
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)

    # Metadata
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="created_courses",null=True,)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["is_published"]),
        ]

    def __str__(self):
        return self.title

# MODULE
class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="modules")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    is_published = models.BooleanField(default=False)

    # DRAFT DATA
    draft_title = models.CharField(max_length=255, null=True, blank=True)
    draft_description = models.TextField(null=True, blank=True)
    draft_order = models.PositiveIntegerField(null=True,blank=True) 
    
    # STATUS
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ("course", "order")

        ordering = ["order"]

    def __str__(self):
        return f"{self.course.title} — Module {self.order}: {self.title}"

# SECTION
class Section(models.Model):

    # PUBLISHED DATA
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField() 
    is_published = models.BooleanField(default=False)
    
    # DRAFT DATA
    draft_title = models.CharField(max_length=255, null=True, blank=True)
    draft_order = models.PositiveIntegerField(null=True, blank=True)
    
    # STATUS
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)

    class Meta:
        unique_together = ("module", "order")
        ordering = ["order"]

    def __str__(self):
        return f"{self.module.title} — Section {self.order}: {self.title}"

# CONTENT
class Content(models.Model):

    CONTENT_TYPES = (
        ("video", "Video"),
        ("file", "File"),
        ("text", "Text"),
        ("shell", "Shell"),
    )

    # PUBLISHED DATA
    section = models.ForeignKey(Section, on_delete=models.CASCADE, null=True, blank=True, related_name="contents")
    title = models.CharField(max_length=255)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    description = models.TextField(blank=True)
    video_url = models.URLField(blank=True, null=True)
    text_content = models.TextField(blank=True, null=True)
    file = models.FileField(upload_to="content_files/", blank=True, null=True)
    is_preview = models.BooleanField(default=False)
    order = models.PositiveIntegerField()
    is_published = models.BooleanField(default=False)

    # DRAFT DATA
    draft_title = models.CharField(max_length=255, null=True, blank=True)
    draft_content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, null=True, blank=True)
    draft_description = models.TextField(null=True, blank=True)
    draft_video_url = models.URLField(null=True,blank=True)
    draft_text_content = models.TextField(null=True, blank=True)
    draft_file = models.FileField(upload_to="draft_content_files/",null=True,blank=True)
    draft_order = models.PositiveIntegerField(null=True, blank=True)
    
    # STATUS
    has_unpublished_changes = models.BooleanField(default=False)
    pending_delete = models.BooleanField(default=False)
    
    # METADATA
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["order"]
        unique_together = ("section", "order")

    def __str__(self):
        return f"{self.section.title} — {self.title} ({self.content_type})"

# MEDIA UPLOAD
class MediaUpload(models.Model):

    file = models.FileField(upload_to="course_media/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Upload {self.id} - {self.file.name}"