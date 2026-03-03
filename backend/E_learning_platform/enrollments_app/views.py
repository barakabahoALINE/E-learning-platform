

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from enrollments_app.models import Enrollment
from courses_app.models import Course
from django.contrib.auth import get_user_model

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