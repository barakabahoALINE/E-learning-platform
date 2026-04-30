from rest_framework.permissions import BasePermission
from .models import Attempt
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAttemptOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.student == request.user
    


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and (
            request.user.is_staff or request.method in SAFE_METHODS
        )