from rest_framework import permissions
from rest_framework.permissions import BasePermission
from .models import Course


class IsInstructor(permissions.BasePermission):
    """
    Allows access only to users with role='instructor'.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == "instructor"
        )

    def has_object_permission(self, request, view, obj):
        return obj.instructor == request.user


class IsCourseInstructor(BasePermission):

    def has_permission(self, request, view):
        course_id = view.kwargs.get("course_id")

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return False

        return (
            request.user.is_authenticated
            and request.user.role == "instructor"
            and course.instructor == request.user
        )
from rest_framework.permissions import BasePermission
from .models import Section


class IsSectionInstructor(BasePermission):

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and request.user.role == "instructor"
            and obj.course.instructor == request.user
        )

  