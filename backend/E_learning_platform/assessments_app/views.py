from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Assessment, Attempt
from .permissions import IsAdmin
from .serializers import *
from .utils import *
from .services.rules import (
    check_attempt_limit,
    check_course_completion,
    handle_attempt_state,
    unlock_attempt,
    RuleError
)

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


class StartAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, assessment_id):
        user = request.user

        try:
            assessment = Assessment.objects.get(id=assessment_id)
        except Assessment.DoesNotExist:
            return Response({
                "status": "failed",
                "message": "Assessment not found",
                "data": None
                }, status=404)
        try:
        # ✅ FINAL ASSESSMENT RULE
            if assessment.is_final:
                check_course_completion(user, assessment.course)

            # ✅ RESUME ACTIVE ATTEMPT
            existing = Attempt.objects.filter(
                student=user,
                assessment=assessment,
                is_submitted=False
            ).first()

            if existing:
                state = handle_attempt_state(existing)

                if state == "locked":
                    return Response({
                        "status": "failed",
                        "message": "Attempt locked",
                        "data": None
                                    }, status=403)

                return Response({
                    "status": "success",
                    "message": "Resume attempt",
                    "data": StartAttemptSerializer(existing).data
                })

            # ✅ RULE CHECK
            check_attempt_limit(user, assessment)
        except RuleError as e:
            return Response({
                "status": "failed",
                "message": e.message,
                "data": None
            }, status=403)
        # ✅ CREATE NEW ATTEMPT
        attempt = Attempt.objects.create(
            student=user,
            assessment=assessment,
            attempt_number=Attempt.objects.filter(
                student=user,
                assessment=assessment
            ).count() + 1
        )

        return Response({
            "status": "success",
            "message": "Attempt started",
            "data": StartAttemptSerializer(attempt).data
        })
    

class LockAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({
                "status": "failed",
                "message": "Attempt not found",
                "data": None
                            }, status=404)

        attempt.is_locked = True
        attempt.save()

        return Response({
            "status": "success",
            "message": "Attempt locked"
        })


class AdminUnlockAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):
        user = request.user

        try:
            attempt = Attempt.objects.get(id=attempt_id)
        except Attempt.DoesNotExist:
            return Response({
                "status": "failed",
                "message": "Attempt not found"
            }, status=404)

        try:
            unlock_attempt(attempt, user)
        except RuleError as e:
            return Response({
                "status": "failed",
                "message": e.message
            }, status=403)

        return Response({
            "status": "success",
            "message": "Attempt unlocked successfully",
            "data": {
                "attempt_id": attempt.id,
                "is_locked": attempt.is_locked
            }
        })

class AttemptDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({
                "status": "failed",
                "message": "Attempt not found",
                "data": None
            }, status=404)

        state = handle_attempt_state(attempt)

        if state == "locked":
            return Response({
                "status": "failed",
                "message": "Attempt locked",
                "data": None
            }, status=403)

        if state == "submitted":
            return Response({
                "status": "failed",
                "message": "Time expired",
                "data": None
            }, status=403)

        return Response({
            "status": "success",
            "data": StartAttemptSerializer(attempt).data
        })
