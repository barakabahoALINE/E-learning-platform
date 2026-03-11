

#    
from rest_framework.permissions import BasePermission

from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "student"


# --------------------------------
# Admin permission
# --------------------------------
class IsAdmin(BasePermission):

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
