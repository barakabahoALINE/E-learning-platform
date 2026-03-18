from rest_framework import permissions
from rest_framework.permissions import BasePermission
from .models import Course

from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to users with role='admin'.
    """

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == "admin"
        )

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated and
            request.user.role == "admin"
        )
