from rest_framework.permissions import BasePermission
from users_app.permissions import HasPermission


class CanViewCourses(HasPermission):
    required_permission = "courses_app.view_course"


class CanAddCourse(HasPermission):
    required_permission = "courses_app.add_course"


class CanChangeCourse(HasPermission):
    required_permission = "courses_app.change_course"


class CanDeleteCourse(HasPermission):
    required_permission = "courses_app.delete_course"


class CanPublishCourse(HasPermission):
    required_permission = "courses_app.publish_course"


class CanViewPublishedCourse(HasPermission):
    required_permission = "courses_app.view_published_course"


class IsAdmin(BasePermission):
    """
    Admin group membership fallback for course management.
    """

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name="Admin").exists()
            )
        )


class IsStudentOrAdmin(BasePermission):
    """
    Allows access to students and admins only.
    """

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name__in=["Admin", "Student"]).exists()
            )
        )


class CourseAccess(BasePermission):
    """
    Allows published course access to anyone, unpublished courses only to admins.
    """

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if obj.is_published:
            return True

        user = request.user
        return (
            user.is_authenticated and
            (
                user.is_superuser or
                user.groups.filter(name="Admin").exists()
            )
        )
