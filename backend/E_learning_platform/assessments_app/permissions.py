from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows access only to admin users
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated 
    
class IsAttemptOwner(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return obj.student == request.user   