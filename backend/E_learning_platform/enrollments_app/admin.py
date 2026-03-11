

# Register your models here.
# admin.py
from django.contrib import admin
from .models import Enrollment  # <-- Corrected

@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status','enrolled_at')
    search_fields = ('student__username', 'course__title')
