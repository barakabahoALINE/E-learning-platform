from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Enrollment
from .serializers import EnrollmentCreateSerializer, StudentEnrollmentListSerializer, EnrollmentSerializer
from .permissions import IsAdmin,IsStudent
from enrollments_app.models import Enrollment
from courses_app.models import Course
from rest_framework import generics

  

    
class EnrollCourseAPIView(generics.CreateAPIView):
    serializer_class = EnrollmentCreateSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        enrollment = serializer.save()

        # Use detailed serializer for response
        response_serializer = StudentEnrollmentListSerializer(enrollment)

        return Response(
            {
                "status": "success",
                "message": "Enrollment processed successfully.",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
class MyEnrollmentsAPIView(generics.ListAPIView):
    serializer_class = StudentEnrollmentListSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        return Enrollment.objects.filter(
            student=self.request.user
        ).select_related("course")
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {
                "status": "success",
                "message": "Enrollments retrieved successfully.",
                "data": serializer.data,
            }
        )
class EnrollmentDetailAPIView(generics.RetrieveAPIView):
    serializer_class = StudentEnrollmentListSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        # Student can only retrieve their own enrollment
        return Enrollment.objects.filter(
            student=self.request.user
        ).select_related("course")
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return Response(
            {
                "status": "success",
                "message": "Enrollment retrieved successfully.",
                "data": serializer.data,
            }
        )

class CancelEnrollmentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsStudent]

    def patch(self, request, pk):
        try:
            enrollment = Enrollment.objects.get(
                pk=pk,
                student=request.user
            )
        except Enrollment.DoesNotExist:
            return Response(
                {
                    "status": "failed",
                    "message": "Enrollment not found.",
                    "data": None
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if enrollment.status == Enrollment.Status.CANCELLED:
            return Response(
                {"error": "Enrollment already cancelled."},
                status=status.HTTP_400_BAD_REQUEST
            )

        enrollment.status = Enrollment.Status.CANCELLED
        enrollment.save()

        return Response(
            {"success": True, "message": "Enrollment cancelled successfully."},
            status=status.HTTP_200_OK
        )


class AdminListEnrollmentsView(APIView):
        permission_classes = [IsAuthenticated, IsAdmin]

        def get(self, request):
            enrollments = Enrollment.objects.all()
            serializer = EnrollmentSerializer(enrollments, many=True)

            return Response({
                "success": True,
                "message": "Enrollments retrieved successfully",
                "data": serializer.data
            })

class AdminEnrollmentDetailView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):

        try:
            enrollment = Enrollment.objects.get(pk=pk)

        except Enrollment.DoesNotExist:
            return Response({
                "success": False,
                "message": "Enrollment not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = EnrollmentSerializer(enrollment)

        return Response({
            "success": True,
            "message": "Enrollment retrieved successfully",
            "data": serializer.data
        })
        
class AdminUpdateEnrollmentView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):

        try:
            enrollment = Enrollment.objects.get(pk=pk)

        except Enrollment.DoesNotExist:
            return Response({
                "success": False,
                "message": "Enrollment not found"
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = EnrollmentSerializer(enrollment, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()

            return Response({
                "success": True,
                "message": "Enrollment updated successfully",
                "data": serializer.data
            })

        return Response({
            "success": False,
            "message": "Update failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
class AdminDeleteEnrollmentView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):

        try:
            enrollment = Enrollment.objects.get(pk=pk)

        except Enrollment.DoesNotExist:
            return Response({
                "success": False,
                "message": "Enrollment not found"
            }, status=status.HTTP_404_NOT_FOUND)

        enrollment.delete()

        return Response({
            "success": True,
            "message": "Enrollment deleted successfully"
        })
        
class AdminCreateEnrollmentView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):

        serializer = EnrollmentSerializer(data=request.data)

        if serializer.is_valid():
            enrollment = serializer.save()

            return Response({
                "success": True,
                "message": "Student enrolled successfully",
                "data": EnrollmentSerializer(enrollment).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "success": False,
            "message": "Enrollment failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
