from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone


from .models import Assessment, Question, Choice, Attempt
from .serializers import *
from .permissions import IsAdmin

from .utils import (
    is_student_enrolled,
    has_completed_module,
    has_completed_all_modules
)

# ADMIN: CREATE ASSESSMENT
class CreateAssessmentAPIView(APIView):

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):

        serializer = CreateAssessmentSerializer(data=request.data)

        if serializer.is_valid():

            try:
                assessment = serializer.save()

                return Response({
                    "success": True,
                    "message": "Assessment created successfully",
                    "data": serializer.data
                }, status=status.HTTP_201_CREATED)

            except Exception as e:

                return Response({
                    "success": False,
                    "error": str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": False,
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
        
# ADMIN: CREATE QUESTION
class CreateQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):

        serializer = QuestionCreateSerializer(data=request.data)

        if serializer.is_valid():
            question = serializer.save()

            return Response({
                "status": "success",
                "message": "Question created successfully",
                "data": QuestionSerializer(question).data
            })

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=400)

# STUDENT: START ASSESSMENT
class StartAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):

        assessment = get_object_or_404(Assessment, id=assessment_id)

        # check enrollment
        if not is_student_enrolled(request.user, assessment.course):
            return Response({
                "status": "failed",
                "message": "Not enrolled in this course"
            }, status=403)

        # Quiz rule
        if assessment.assessment_type == "QUIZ":

            if not has_completed_module(request.user, assessment.module):
                return Response({
                    "status": "failed",
                    "message": "Complete module before quiz"
                }, status=403)

        # Final assessment rule
        if assessment.assessment_type == "FINAL":

            if not has_completed_all_modules(request.user, assessment.course):
                return Response({
                    "status": "failed",
                    "message": "Complete all modules first"
                }, status=403)

        return Response({
            "status": "success",
            "data": {
                "id": assessment.id,
                "title": assessment.title,
                "type": assessment.assessment_type,
                "duration": assessment.duration,
                "instructions": assessment.instructions,
                "total_questions": assessment.questions.count()
            }
        })


# STUDENT: GET QUESTIONS
class GetAssessmentQuestionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, assessment_id):

        assessment = get_object_or_404(Assessment, id=assessment_id)

        questions = assessment.questions.all()

        return Response({
            "status": "success",
            "assessment": assessment.title,
            "data": QuestionSerializer(questions, many=True).data
        })


