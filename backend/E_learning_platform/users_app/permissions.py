from rest_framework.permissions import BasePermission


class HasPermission(BasePermission):
    required_permission = None

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not self.required_permission:
            return False

        return user.has_perm(self.required_permission)


class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """

    def _is_admin(self, user):
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name="Admin").exists()
            )
        )

    def has_permission(self, request, view):
        return self._is_admin(request.user)

    def has_object_permission(self, request, view, obj):
        return self._is_admin(request.user)


class CanViewUsers(HasPermission):
    required_permission = "users_app.view_user"


class CanAddUsers(HasPermission):
    required_permission = "users_app.add_user"


class CanChangeUsers(HasPermission):
    required_permission = "users_app.change_user"


class CanDeleteUsers(HasPermission):
    required_permission = "users_app.delete_user"


class CanAssignRoles(HasPermission):
    required_permission = "users_app.assign_role"


class CanModifyRoles(HasPermission):
    required_permission = "users_app.modify_role"


class CanModifyPermissions(HasPermission):
    required_permission = "users_app.modify_permission"

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.role == "instructor" or user.groups.filter(name="Instructor").exists():
            return True
        return user.has_perm(self.required_permission)



class CanViewAnalytics(HasPermission):
    required_permission = "users_app.view_analytics"


class CanChangePlatformSettings(HasPermission):
    required_permission = "users_app.change_platform_settings"


class CanViewRoles(HasPermission):
    required_permission = "auth.view_group"


class CanChangeRoles(HasPermission):
    required_permission = "auth.change_group"


class CanViewPermissions(HasPermission):
    required_permission = "auth.view_permission"
