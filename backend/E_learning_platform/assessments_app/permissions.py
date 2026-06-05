from rest_framework.permissions import BasePermission
from users_app.permissions import HasPermission


class CanViewAssessment(HasPermission):
    required_permission = "assessments_app.view_assessment"


class CanAddAssessment(HasPermission):
    required_permission = "assessments_app.add_assessment"


class CanChangeAssessment(HasPermission):
    required_permission = "assessments_app.change_assessment"


class CanDeleteAssessment(HasPermission):
    required_permission = "assessments_app.delete_assessment"


class CanGradeAssessment(HasPermission):
    required_permission = "assessments_app.grade_assessment"


class CanUnlockAttempt(HasPermission):
    required_permission = "assessments_app.unlock_attempt"


class CanStartAssessment(HasPermission):
    required_permission = "assessments_app.start_assessment"


class CanLockAttempt(HasPermission):
    required_permission = "assessments_app.lock_attempt"


class CanAddAttempt(HasPermission):
    required_permission = "assessments_app.add_attempt"


class CanViewAttempt(HasPermission):
    required_permission = "assessments_app.view_attempt"


class CanChangeAttempt(HasPermission):
    required_permission = "assessments_app.change_attempt"


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user
            and user.is_authenticated
            and (
                user.is_superuser or
                user.groups.filter(name="Admin").exists()
            )
        )


class IsStudentOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return (
            user.is_superuser or
            user.groups.filter(name__in=["Admin", "Student"]).exists()
        )
