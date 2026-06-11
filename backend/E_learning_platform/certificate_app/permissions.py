from rest_framework.permissions import BasePermission


class CanViewCertificate(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        return request.user.is_superuser or obj.student == request.user


class CanDownloadCertificate(CanViewCertificate):
    pass


class CanShareCertificate(CanViewCertificate):
    pass


class CanSubmitCertificateFeedback(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
