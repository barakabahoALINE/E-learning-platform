from rest_framework.permissions import BasePermission
from enrollments_app.models import Enrollment
from courses_app.models import Lesson


class IsEnrolled(BasePermission):

    def has_permission(self, request, view):

        user = request.user
        course_id = view.kwargs.get("course_id")
        lesson_id = view.kwargs.get("lesson_id")

        # If course_id provided
        if course_id:
            return Enrollment.objects.filter(
                student=user,
                course_id=course_id,
                status="active"
            ).exists()

        # If lesson_id provided
        if lesson_id:
            lesson = Lesson.objects.filter(id=lesson_id).first()

            if lesson:
                return Enrollment.objects.filter(
                    student=user,
                    course=lesson.course,
                    status="active"
                ).exists()

        # If no course or lesson in URL allow authenticated users
        return user.is_authenticated