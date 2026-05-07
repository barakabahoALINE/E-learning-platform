from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Assessment, Attempt,StudentAnswer,Question,Choice
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
# alba's code
# 2. SAVE ANSWER
# POST /api/assessments/attempts/save-answer/
# ═══════════════════════════════════════════════
class SaveAnswerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        attempt_id = request.data.get("attempt_id")
        question_id = request.data.get("question_id")
        selected_choices = request.data.get("selected_choices", [])
        text_answer = request.data.get("text_answer")

        attempt = get_object_or_404(Attempt, id=attempt_id, student=request.user)
        question = get_object_or_404(Question, id=question_id)

        # ✅ get or create ONE row per question
        answer, created = StudentAnswer.objects.get_or_create(
            attempt=attempt,
            question=question
        )

        # =========================
        # SINGLE CHOICE
        # =========================
        if question.question_type == "single":
            if not selected_choices:
                return Response({"success": False, "message": "No choice selected"}, status=400)

            choice_id = selected_choices[0]
            choice = question.choices.filter(id=choice_id).first()

            if not choice:
                return Response({"success": False, "message": "Invalid choice"}, status=400)

            answer.selected_choice = choice
            answer.selected_choices.clear()
            answer.text_answer = None

            answer.is_correct = choice.is_correct

        # =========================
        # MULTIPLE CHOICE
        # =========================
        elif question.question_type == "multiple":
            valid_choices = question.choices.filter(id__in=selected_choices)

            if valid_choices.count() != len(selected_choices):
                return Response({"success": False, "message": "Invalid choices"}, status=400)

            answer.selected_choice = None
            answer.text_answer = None
            answer.selected_choices.set(valid_choices)

            correct_ids = set(question.choices.filter(is_correct=True).values_list("id", flat=True))
            selected_ids = set(valid_choices.values_list("id", flat=True))

            answer.is_correct = correct_ids == selected_ids

        # =========================
        # TEXT QUESTION
        # =========================
        else:
            answer.selected_choice = None
            answer.selected_choices.clear()
            answer.text_answer = text_answer

            answer.is_correct = (
                question.correct_text_answer and
                text_answer.strip().lower() == question.correct_text_answer.strip().lower()
            )

        answer.save()

        return Response({"success": True, "message": "Answer saved"})
# ═══════════════════════════════════════════════
# 3. SUBMIT — itanga message gusa, ntibarura score
# POST /api/assessments/attempts/<attempt_id>/submit/
# ═══════════════════════════════════════════════
from django.utils import timezone


class SubmitAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )

        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)

        if attempt.is_submitted:
            return Response({
                "success": False,
                "message": "Already submitted"
            }, status=400)

        total = attempt.assessment.questions.count()

        if total == 0:
            return Response({
                "success": False,
                "message": "No questions found"
            }, status=400)

        attempt.is_submitted = True
        attempt.submitted_at = timezone.now()
        attempt.save()

        return Response({
            "success": True,
            "message": "Assessment submitted successfully.",
            "data": {
                "attempt_id": attempt.id,
                "next_step": f"/api/assessments/attempts/{attempt.id}/calculate/"
            }
        })

# ═══════════════════════════════════════════════
# 4. CALCULATE — ibarura score + ibika
# POST /api/assessments/attempts/<attempt_id>/calculate/
# ═══════════════════════════════════════════════
class CalculateResultAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )

        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)


        questions = attempt.assessment.questions.all()

        total_marks = 0
        earned_marks = 0

        questions = attempt.assessment.questions.all()

        for question in questions:

            question_marks = question.marks or 1
            total_marks += question_marks

            answers = StudentAnswer.objects.filter(
                attempt=attempt,
                question=question
            )

            is_correct = False

            # SINGLE CHOICE
            if question.question_type == "single":

                answer = answers.first()

                if answer and answer.selected_choice:
                    is_correct = answer.selected_choice.is_correct

            # MULTIPLE CHOICE
            elif question.question_type == "multiple":

                answer = answers.first()

                if answer:

                    selected_ids = set(
                        answer.selected_choices.values_list("id", flat=True)
                    )

                    correct_ids = set(
                        question.choices.filter(is_correct=True)
                        .values_list("id", flat=True)
                    )

                    is_correct = selected_ids == correct_ids

            # TEXT ANSWER
            else:

                answer = answers.first()

                if (
                    answer
                    and answer.text_answer
                    and question.correct_text_answer
                ):

                    is_correct = (
                        answer.text_answer.strip().lower()
                        ==
                        question.correct_text_answer.strip().lower()
                    )

            # SAVE RESULT
            answers.update(is_correct=is_correct)

            if is_correct:
                earned_marks += question_marks
                percentage = 0

        if total_marks > 0:
            percentage = (earned_marks / total_marks) * 100

        passed = percentage >= attempt.assessment.pass_mark

        # ✅ SAVE ATTEMPT
        attempt.score = earned_marks
        attempt.percentage = round(percentage, 2)
        attempt.passed = passed
        attempt.is_submitted = True

        from django.utils import timezone
        attempt.submitted_at = timezone.now()

        attempt.save()

        return Response({
            "success": True,
            "message": (
                "Congratulations! You passed."
                if passed
                else
                "You failed. Try again."
            ),
            "data": {
                "score": earned_marks,
                "total_marks": total_marks,
                "percentage": round(percentage, 2),
                "passed": passed
            }
        }, status=200)


# ═══════════════════════════════════════════════
# 5. RESULT — ireba ibikuwe na Calculate
# GET /api/assessments/attempts/<attempt_id>/result/
# ═══════════════════════════════════════════════
class ResultAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({"success": False, "message": "Attempt not found"}, status=404)

        if not attempt.is_submitted:
            return Response({
                "success": False,
                "message": "Attempt not submitted yet."
            }, status=400)

        message = "Congratulations! You passed." if attempt.passed else "You failed. Try again."

        return Response({
            "success": True,
            "message": message,
            "data": {
                "assessment": attempt.assessment.title,
                "attempt_number": attempt.attempt_number,
                "total": attempt.assessment.questions.count(),
                "score": attempt.score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
            }
        })


# ═══════════════════════════════════════════════
# 6. ANSWERS REVIEW
# GET /api/assessments/attempts/<attempt_id>/answers-review/
# ═══════════════════════════════════════════════
class AttemptAnswersReviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )

        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)

        questions = attempt.assessment.questions.all()

        response_data = []

        for question in questions:

            answer = StudentAnswer.objects.filter(
                attempt=attempt,
                question=question
            ).first()

            selected_choice = None
            selected_choices = []
            text_answer = None

            if answer:

                if answer.selected_choice:
                    selected_choice = answer.selected_choice.id

                selected_choices = list(
                    answer.selected_choices.values_list(
                        "id",
                        flat=True
                    )
                )

                text_answer = answer.text_answer

            correct_choices = list(
                question.choices.filter(
                    is_correct=True
                ).values(
                    "id",
                    "text"
                )
            )

            response_data.append({
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type,

                "choices": list(
                    question.choices.values(
                        "id",
                        "text"
                    )
                ),

                "selected_choice": selected_choice,
                "selected_choices": selected_choices,
                "text_answer": text_answer,

                "correct_answers": correct_choices,

                "is_correct": (
                    answer.is_correct
                    if answer else False
                )
            })

        return Response({
            "success": True,
            "attempt_id": attempt.id,
            "data": response_data
        })