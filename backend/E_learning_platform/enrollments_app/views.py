from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Enrollment
from .serializers import EnrollmentSerializer
from .permissions import IsAdmin

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
