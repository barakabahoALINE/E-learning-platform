

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from enrollments_app.models import Enrollment
from courses_app.models import Course
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .serializers import AdminEnrollmentSerializer
from .filters import AdminEnrollmentFilter


User = get_user_model()

# --------------------------------------
# GET /api/instructor/courses/<course_id>/students/
# --------------------------------------
class CourseStudentsView(APIView):
    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=status.HTTP_404_NOT_FOUND)

        enrollments = Enrollment.objects.filter(course=course)
        data = []
        for e in enrollments:
            data.append({
                "enrollment_id": e.id,
                "student_id": e.student.id,
                "student_name": e.student.username,
                "status": e.status,
                "enrolled_at": e.created_at
            })

        return Response({
            "success": True,
            "message": "students retrieved successfully",
            "data": data
        }, status=status.HTTP_200_OK)
       


# --------------------------------------
# GET /api/instructor/enrollments/<enrollment_id>/
# --------------------------------------
class EnrollmentDetailView(APIView):
    def get(self, request, enrollment_id):
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=status.HTTP_404_NOT_FOUND)

        data = {
            "enrollment_id": enrollment.id,
            "course_id": enrollment.course.id,
            "course_title": enrollment.course.title,
            "student_id": enrollment.student.id,
            "student_name": enrollment.student.username,
            "status": enrollment.status,
            "enrolled_at": enrollment.created_at
        }
        return Response({
            "success": True,
            "message": "Enrollment retrieved successfully",
            "data": data
        }, status=status.HTTP_200_OK)
       


# --------------------------------------
# PUT /api/instructor/enrollments/<enrollment_id>/update/
# --------------------------------------
class EnrollmentUpdateView(APIView):
    def put(self, request, enrollment_id):
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get("status")
        if status_value:
            enrollment.status = status_value
            enrollment.save()
            return Response({"success": "Enrollment updated"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Missing status field"}, status=status.HTTP_400_BAD_REQUEST)


# --------------------------------------
# DELETE /api/instructor/enrollments/<enrollment_id>/delete/
# --------------------------------------
class EnrollmentDeleteView(APIView):
    def delete(self, request, enrollment_id):
        try:
            enrollment = Enrollment.objects.get(id=enrollment_id)
        except Enrollment.DoesNotExist:
            return Response({"error": "Enrollment not found"}, status=status.HTTP_404_NOT_FOUND)

        enrollment.delete()
        return Response({"success": "Enrollment deleted"}, status=status.HTTP_204_NO_CONTENT)

class AdminEnrollmentListView(generics.ListAPIView):
    """
    GET /admin/enrollments/
    """

    queryset = Enrollment.objects.select_related("student", "course")
    serializer_class = AdminEnrollmentSerializer
    permission_classes = [IsAdminUser]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_class = AdminEnrollmentFilter

    search_fields = [
        "student__email",
        "course__title",
    ]

    ordering_fields = [
        "enrolled_at",
        "updated_at",
        "status",
    ]

    ordering = ["-enrolled_at"]

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.filter_queryset(self.get_queryset())

            # Pagination support
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response({
                    "success": True,
                    "message": "Enrollments retrieved successfully.",
                    "data": serializer.data,
                })

            serializer = self.get_serializer(queryset, many=True)

            return Response({
                "success": True,
                "message": "Enrollments retrieved successfully.",
                "data": serializer.data,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Failed to retrieve enrollments: {str(e)}",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminEnrollmentDeleteView(generics.DestroyAPIView):
    """
    DELETE /admin/enrollments/<id>/
    """

    queryset = Enrollment.objects.all()
    serializer_class = AdminEnrollmentSerializer
    permission_classes = [IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            enrollment_id = instance.id
            student_email = instance.student.email
            course_title = instance.course.title

            self.perform_destroy(instance)

            return Response({
                "success": True,
                "message": f"Enrollment #{enrollment_id} for student '{student_email}' "
                           f"in course '{course_title}' has been permanently removed.",
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": f"Failed to delete enrollment: {str(e)}",
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
