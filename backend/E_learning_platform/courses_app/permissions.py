from rest_framework import permissions


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


  