from rest_framework.permissions import BasePermission
from .models import Enrollment


class IsEnrolledStudent(BasePermission):
    """
    Allows access only to users enrolled in the course.
    """

    def has_permission(self, request, view):
        course_id = view.kwargs.get("course_id")

        if not course_id or not request.user.is_authenticated:
            return False

        return Enrollment.objects.filter(
            student=request.user,
            course_id=course_id,
            status=Enrollment.Status.ACTIVE
        ).exists()
