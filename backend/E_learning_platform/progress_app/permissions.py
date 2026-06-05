from rest_framework.permissions import BasePermission
from enrollments_app.models import Enrollment
from courses_app.models import Section
from users_app.permissions import HasPermission


def is_student_or_admin(user):
    if not user or not user.is_authenticated:
        return False

    return (
        user.is_superuser or
        user.groups.filter(name__in=["Admin", "Student"]).exists()
    )


class CanViewProgress(HasPermission):
    required_permission = "progress_app.view_progress"


class CanCompleteProgress(HasPermission):
    required_permission = "progress_app.complete_progress"


class IsStudentOrAdmin(BasePermission):
    """
    Allows progress access to students and admins only.
    """

    def has_permission(self, request, view):
        return is_student_or_admin(request.user)


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
                status__in=[
                    Enrollment.Status.ACTIVE,
                    Enrollment.Status.COMPLETED
                ]
            ).exists()

        # If section_id provided
        if section_id:
            section = Section.objects.filter(id=section_id).first()

            if section:
                return Enrollment.objects.filter(
                    student=user,
                    course=section.module.course,  # important chain fix
                    status__in=[
                        Enrollment.Status.ACTIVE,
                        Enrollment.Status.COMPLETED
                    ]
                ).exists()

        # If no course or section in URL allow authenticated users
        return is_student_or_admin(user)


class IsAdmin(BasePermission):
    """
    Custom permission to allow access only to Admin users.
    """

    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):

        if not request.user or not request.user.is_authenticated:
            return False

        return (
            request.user.is_superuser or
            request.user.groups.filter(name="Admin").exists()
        )

