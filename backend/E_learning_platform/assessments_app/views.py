from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Attempt  
from .permissions import IsAdmin
from .models import Assessment
from .serializers import *
from .utils import *

# ✅ Create Assessment API

class CreateAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = CreateAssessmentSerializer(data=request.data)

        if serializer.is_valid():
            assessment = serializer.save()

            return Response({
                "status": "success",
                "message": "Assessment created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
# ✅ Create Question API (Admin only)
class CreateQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = QuestionCreateSerializer(data=request.data)

        if serializer.is_valid():
            question = serializer.save()

            return Response({
                "status": "success",
                "message": "Question created successfully",
                "data": serializer.data
            }, status=201)

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=400)
        
class StartAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)

        # ✅ 1. CHECK ENROLLMENT
        if not is_student_enrolled(request.user, assessment.course):
            return Response({
                "status": "failed",
                "message": "You are not enrolled in this course."
            }, status=403)

        # 🔒 2. BLOCK FINAL ASSESSMENT IF NOT COMPLETED
        if assessment.is_final:
            if not has_completed_all_lessons(request.user, assessment.course):
                return Response({
                    "status": "failed",
                    "message": "Complete all lessons before accessing final assessment."
                }, status=403)

        # ✅ 3. ALLOW ACCESS (ONLY IF PASSED ALL CHECKS)
        return Response({
            "status": "success",
            "data": {
                "id": assessment.id,
                "title": assessment.title,
                "is_final": assessment.is_final,
                "duration": assessment.duration,
                "instructions": assessment.instructions,
                "total_questions": assessment.questions.count(),
            }
        }, status=200)
        
# ✅ Get Questions API
class GetAssessmentQuestionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)

        questions = assessment.questions.all().order_by('?')
        serializer = QuestionSerializer(questions, many=True)

        return Response({
            "status": "success",
            "assessment": assessment.title,
            "is_final": assessment.is_final,
            "data": serializer.data
        }, status=status.HTTP_200_OK)


