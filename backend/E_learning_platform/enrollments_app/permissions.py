# enrollments_app/permissions.py
from rest_framework import permissions
from django.shortcuts import get_object_or_404
from courses_app.models import Course

class IsCourseIAdmin(permissions.BasePermission):
    """
    Only allows access if the requesting user is the instructor of the course.
    """

    def has_permission(self, request, view):
        course_id = view.kwargs.get("course_id")
        if course_id:
    
            course = get_object_or_404(Course, pk=course_id)
            return getattr(course, "organizer", None) == request.user
        return True

    def has_object_permission(self, request, view, obj):
        course = getattr(obj, "course", None)
        return getattr(course, "organizer", None) == request.user if course else False