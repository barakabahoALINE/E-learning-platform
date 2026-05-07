from rest_framework.permissions import BasePermission
from enrollments_app.models import Enrollment
from courses_app.models import Section


class IsEnrolled(BasePermission):

    def has_permission(self, request, view):

        user = request.user
        course_id = view.kwargs.get("course_id")
        section_id = view.kwargs.get("section_id")

        # If course_id provided
        if course_id:
            return Enrollment.objects.filter(
                student=user,
                course_id=course_id,
                status="active"
            ).exists()

        # If section_id provided
        if section_id:
            section = Section.objects.filter(id=section_id).first()

            if section:
                return Enrollment.objects.filter(
                    student=user,
                    course=section.module.course,  # important chain fix
                    status="active"
                ).exists()

        # If no course or section in URL allow authenticated users
        return user.is_authenticated


class IsAdmin(BasePermission):
    """
    Custom permission to allow access only to Admin users.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        if not request.user or not request.user.is_authenticated:
            return False

        return (
            request.user.role is not None and
            request.user.role.lower() == "admin"
        )

