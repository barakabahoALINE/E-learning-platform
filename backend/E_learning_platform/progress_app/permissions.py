from rest_framework.permissions import BasePermission
from enrollments_app.models import Enrollment
from courses_app.models import Lesson


class IsEnrolled(BasePermission):

    def has_permission(self, request, view):

        user = request.user
        course_id = view.kwargs.get("course_id")
        lesson_id = view.kwargs.get("lesson_id")

        # If course_id provided
        if course_id:
            return Enrollment.objects.filter(
                student=user,
                course_id=course_id,
                status="active"
            ).exists()

        # If lesson_id provided
        if lesson_id:
            lesson = Lesson.objects.filter(id=lesson_id).first()

            if lesson:
                return Enrollment.objects.filter(
                    student=user,
                    course=lesson.course,
                    status="active"
                ).exists()

        # If no course or lesson in URL allow authenticated users
        return user.is_authenticated


class IsAdmin(BasePermission):
    """
    Custom permission to allow access only to Admin users.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        # User must be authenticated first
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user role is admin
        return (
            request.user.role is not None and
            request.user.role.lower() == "admin"
        )
