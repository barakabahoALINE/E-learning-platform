from rest_framework.permissions import BasePermission, IsAuthenticated
from users_app.permissions import HasPermission


class IsAuthenticatedPermission(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsOwnerOrStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        role = getattr(user, "role", None)
        if role in {"admin", "instructor"}:
            return True

        if user.groups.filter(name__in={"Admin", "Instructor"}).exists():
            return True

        if hasattr(obj, "author"):
            return obj.author_id == user.id

        if hasattr(obj, "user"):
            return obj.user_id == user.id

        return False


class IsInstructorOrAdmin(HasPermission):
    required_permission = "community_app.change_discussion_status"


class CanViewDiscussion(IsAuthenticatedPermission):
    pass


class CanAddDiscussion(IsAuthenticatedPermission):
    pass


class CanChangeDiscussion(IsOwnerOrStaff):
    pass


class CanDeleteDiscussion(IsOwnerOrStaff):
    pass


class CanChangeDiscussionStatus(IsInstructorOrAdmin):
    pass


class CanViewReply(IsAuthenticatedPermission):
    pass


class CanAddReply(IsAuthenticatedPermission):
    pass


class CanChangeReply(IsOwnerOrStaff):
    pass


class CanDeleteReply(IsOwnerOrStaff):
    pass


class CanViewLike(IsAuthenticatedPermission):
    pass


class CanDeleteLike(IsOwnerOrStaff):
    pass


class CanAddLike(IsAuthenticatedPermission):
    pass


class IsEnrolledOrAdmin(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated)
