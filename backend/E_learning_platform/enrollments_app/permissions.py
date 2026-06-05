from rest_framework.permissions import BasePermission
from users_app.permissions import HasPermission


class CanViewEnrollment(HasPermission):
    required_permission = "enrollments_app.view_enrollment"


class CanAddEnrollment(HasPermission):
    required_permission = "enrollments_app.add_enrollment"


class CanChangeEnrollment(HasPermission):
    required_permission = "enrollments_app.change_enrollment"


class CanDeleteEnrollment(HasPermission):
    required_permission = "enrollments_app.delete_enrollment"


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name="Student").exists()
            )
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name="Admin").exists()
            )
        )

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
