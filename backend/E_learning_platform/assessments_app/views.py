from urllib import request
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Assessment,StudentAnswer, Question, Choice, Attempt
from .serializers import *
from courses_app.models import Course
from progress_app.models import (ModuleProgress, SectionProgress, _refresh_course_progress, _refresh_module_progress)
from enrollments_app.models import Enrollment
from progress_app.models import (_refresh_course_progress, _refresh_module_progress)
from .permissions import *
from .utils import *
from .services.rules import (
    check_attempt_limit,
    handle_attempt_state,
    unlock_attempt,
    apply_assessment_rules,
    RuleError
)
from progress_app.models import (
                CourseProgress
            )



# ADMIN: CREATE ASSESSMENT
class CreateAssessmentAPIView(APIView):

    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request):
        data = apply_assessment_rules(
            request.data.copy()
            )

        serializer = CreateAssessmentSerializer(data=data)

        if serializer.is_valid():

            try:
                course = Course.objects.get(id=data.get('course'))
                # If course is published, mark assessment as having unpublished changes
                # If course is not published yet, has_unpublished_changes should be false
                has_unpublished = course.is_published
                
                assessment = serializer.save(
                    is_published=False,
                    has_unpublished_changes=has_unpublished
                )

                # Mark course as having unpublished changes only if it's already published
                if course.is_published:
                    course.has_unpublished_changes = True
                    course.save(update_fields=['has_unpublished_changes'])

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

    def delete(self, request):
        assessment_id = request.data.get("assessment_id") or request.query_params.get("assessment_id")
        module_id = request.data.get("module_id") or request.query_params.get("module_id")

        if assessment_id:
            assessment = get_object_or_404(Assessment, id=assessment_id)
            if assessment.course.is_published and assessment.is_published:
                assessment.pending_delete = True
                assessment.has_unpublished_changes = True
                assessment.save(update_fields=["pending_delete", "has_unpublished_changes"])
                assessment.course.has_unpublished_changes = True
                assessment.course.save(update_fields=["has_unpublished_changes"])
                return Response({"success": True, "message": "Assessment marked for deletion. Publish changes to apply deletion."})
            assessment.delete()
            return Response({"success": True, "message": "Assessment deleted successfully"})
        elif module_id:
            quizzes = Assessment.objects.filter(module_id=module_id, assessment_type="QUIZ")
            quiz = quizzes.first()
            if quiz and quiz.course.is_published and quiz.is_published:
                quizzes.update(pending_delete=True, has_unpublished_changes=True)
                quiz.course.has_unpublished_changes = True
                quiz.course.save(update_fields=["has_unpublished_changes"])
                return Response({"success": True, "message": "Module quiz marked for deletion. Publish changes to apply deletion."})
            quizzes.delete()
            return Response({"success": True, "message": "Module quiz deleted successfully"})

        return Response({"success": False, "error": "Assessment ID or Module ID is required"}, status=400)

    def patch(self, request):
        """Update assessment settings (duration, max_attempts, pass_mark, instructions)."""
        assessment_id = request.data.get("assessment_id")
        if not assessment_id:
            return Response({"success": False, "error": "assessment_id is required"}, status=400)

        assessment = get_object_or_404(Assessment, id=assessment_id)

        allowed_fields = ["duration", "max_attempts", "pass_mark", "instructions", "title"]
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        for field, value in update_data.items():
            setattr(assessment, field, value)

        assessment.save(update_fields=list(update_data.keys()))

        # Mark course as having unpublished changes if already published
        if assessment.course.is_published:
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=["has_unpublished_changes"])
            assessment.course.has_unpublished_changes = True
            assessment.course.save(update_fields=["has_unpublished_changes"])

        return Response({
            "success": True,
            "message": "Assessment settings updated successfully",
            "data": {
                "id": assessment.id,
                "duration": assessment.duration,
                "max_attempts": assessment.max_attempts,
                "pass_mark": assessment.pass_mark,
                "instructions": assessment.instructions,
            }
        })

# ✅ Create Question API (Admin only)
class CreateQuestionAPIView(APIView):

    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request):

        serializer = QuestionCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():

            question = serializer.save()
            assessment = question.assessment
            # Mark as having unpublished changes only if course is published
            if assessment.course.is_published:
                assessment.has_unpublished_changes = True
                assessment.save(update_fields=['has_unpublished_changes'])
                assessment.course.has_unpublished_changes = True
                assessment.course.save(update_fields=['has_unpublished_changes'])

            return Response({
                "status": "success",
                "message": "Question created successfully",
                "data": QuestionSerializer(question).data
            }, status=status.HTTP_201_CREATED)

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=400)

# STUDENT: START ASSESSMENT
class StartAssessmentAPIView(APIView):

    permission_classes = [IsAuthenticated, CanStartAssessment]

    def get(self, request, assessment_id):

        assessment = get_object_or_404(
            Assessment,
            id=assessment_id,
            is_published=True
        )

        if not assessment.is_published:
            return Response({
                "status": "failed",
                "message": "Assessment is not published"
            }, status=404)

        # check enrollment
        if not is_student_enrolled(request.user, assessment.course):
            return Response({
                "status": "failed",
                "message": "Not enrolled in this course"
            }, status=403)

        # Quiz rule
        if assessment.assessment_type == "QUIZ":
            if not has_completed_module_sections(request.user, assessment.module):
                return Response({
                    "status": "failed",
                    "message": "Complete module before quiz"
                }, status=403)

        response_data = {
            "id": assessment.id,
            "title": assessment.title,
            "type": assessment.assessment_type,
            "instructions": assessment.instructions,
            "total_questions": assessment.questions.count()
        }

        if assessment.assessment_type == "FINAL":
            response_data["duration"] = assessment.duration

        return Response({
            "status": "success",
            "data": response_data
        })


# STUDENT: GET QUESTIONS
class GetAssessmentQuestionsAPIView(APIView):

    permission_classes = [IsAuthenticated, CanViewAssessment]

    def get(self, request, assessment_id):

        assessment = get_object_or_404(
            Assessment,
            id=assessment_id,
            is_published=True
        )

        questions = assessment.questions.all()

        return Response({
            "status": "success",
            "assessment": assessment.title,
            "assessment_type": (
                assessment.assessment_type
            ),
            "data": QuestionSerializer(questions, many=True).data
        })

class UpdateQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, CanChangeAssessment]

    def put(self, request, question_id):
        question = get_object_or_404(Question, id=question_id)
        serializer = QuestionCreateSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": QuestionSerializer(question).data})
        return Response({"status": "failed", "errors": serializer.errors}, status=400)

class DeleteQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, CanDeleteAssessment]

    def delete(self, request, question_id):
        question = get_object_or_404(Question, id=question_id)
        question.delete()
        return Response({"status": "success", "message": "Question deleted"})

# =========================================================
# START ATTEMPT
# =========================================================
class StartAttemptAPIView(APIView):

    permission_classes = [IsAuthenticated, CanStartAssessment]

    def post(self, request, assessment_id):

        user = request.user

        try:
            assessment = Assessment.objects.get(
                id=assessment_id,
                is_published=True
            )

        except Assessment.DoesNotExist:

            return Response({
                "status": "failed",
                "message": "Assessment not found",
                "data": None
            }, status=404)

        try:

            # RESUME ACTIVE ATTEMPT
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
                    "data": StartAttemptSerializer(
                        existing
                    ).data
                })

            # ATTEMPT LIMIT RULE
            check_attempt_limit(
                user,
                assessment
            )

        except RuleError as e:

            return Response({
                "status": "failed",
                "message": e.message,
                "data": None
            }, status=403)

        # CREATE ATTEMPT
        attempt = Attempt.objects.create(
            student=user,
            assessment=assessment,
            attempt_number=(
                Attempt.objects.filter(
                    student=user,
                    assessment=assessment
                ).count() + 1
            )
        )

        return Response({
            "status": "success",
            "message": "Attempt started",
            "data": StartAttemptSerializer(
                attempt
            ).data
        })


# =========================================================
# LOCK ATTEMPT
# =========================================================
class LockAttemptAPIView(APIView):

    permission_classes = [IsAuthenticated, CanLockAttempt]

    def post(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )

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


# =========================================================
# ADMIN UNLOCK
# =========================================================
class AdminUnlockAttemptAPIView(APIView):

    permission_classes = [IsAuthenticated, CanUnlockAttempt]

    def post(self, request, attempt_id):

        user = request.user

        try:
            attempt = Attempt.objects.get(
                id=attempt_id
            )

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
            "message": (
                "Attempt unlocked successfully"
            ),
            "data": {
                "attempt_id": attempt.id,
                "is_locked": attempt.is_locked
            }
        })


# =========================================================
# ATTEMPT DETAILS
# =========================================================
class AttemptDetailAPIView(APIView):

    permission_classes = [IsAuthenticated, CanViewAttempt]

    def get(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )

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
            "data": StartAttemptSerializer(
                attempt
            ).data
        })


# =========================================================
# SAVE ANSWER
# =========================================================
class SaveAnswerAPIView(APIView):

    permission_classes = [IsAuthenticated, CanStartAssessment]

    def post(self, request):

        attempt_id = request.data.get("attempt_id")

        question_id = request.data.get("question_id")

        selected_choices = request.data.get(
            "selected_choices",
            []
        )

        text_answer = request.data.get(
            "text_answer"
        )

        attempt = get_object_or_404(
            Attempt,
            id=attempt_id,
            student=request.user
        )

        # ensure attempt state is up-to-date (autosubmit on expiration)
        state = handle_attempt_state(attempt)

        if state == "locked":
            return Response({
                "success": False,
                "message": "Attempt locked",
                "data": None
            }, status=403)

        if state == "submitted":
            return Response({
                "success": False,
                "message": "Time expired",
                "data": None
            }, status=403)

        question = get_object_or_404(
            Question,
            id=question_id
        )

        answer, created = (
            StudentAnswer.objects.get_or_create(
                attempt=attempt,
                question=question
            )
        )

        # SINGLE
        if question.question_type == "single":

            if not selected_choices:

                return Response({
                    "success": False,
                    "message": "No choice selected"
                }, status=400)

            choice_id = selected_choices[0]

            choice = question.choices.filter(
                id=choice_id
            ).first()

            if not choice:

                return Response({
                    "success": False,
                    "message": "Invalid choice"
                }, status=400)

            answer.selected_choice = choice

            answer.selected_choices.clear()

            answer.text_answer = None

            answer.is_correct = choice.is_correct

        # MULTIPLE
        elif question.question_type == "multiple":

            valid_choices = question.choices.filter(
                id__in=selected_choices
            )

            if (
                valid_choices.count()
                != len(selected_choices)
            ):

                return Response({
                    "success": False,
                    "message": "Invalid choices"
                }, status=400)

            answer.selected_choice = None

            answer.text_answer = None
            answer.selected_choices.set(valid_choices)

            correct_ids = set(
                question.choices.filter(
                    is_correct=True
                ).values_list("id", flat=True)
            )

            selected_ids = set(
                valid_choices.values_list(
                    "id",
                    flat=True
                )
            )

            answer.is_correct = (
                correct_ids == selected_ids
            )

        # TEXT
        else:

            answer.selected_choice = None

            answer.selected_choices.clear()

            answer.text_answer = text_answer

            answer.is_correct = (
                question.correct_text_answer
                and
                text_answer.strip().lower()
                ==
                question.correct_text_answer.strip().lower()
            )

        answer.save()

        return Response({
            "success": True,
            "message": "Answer saved"
        })



# =========================================================
# SUBMIT ATTEMPT
# =========================================================

class SubmitAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated, CanStartAssessment]

    def post(self, request, attempt_id):
        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({"success": False, "message": "Attempt not found"}, status=404)

        # Check if already submitted first
        if attempt.is_submitted:
            return Response({
                "success": False,
                "message": "Attempt already submitted"
            }, status=400)

        # Refresh attempt state (autosubmit on expiration)
        state = handle_attempt_state(attempt)

        if state == "locked":
            return Response({
                "success": False,
                "message": "Attempt locked",
                "data": None
            }, status=403)

        if state == "submitted":
            return Response({
                "success": False,
                "message": "Time expired",
                "data": None
            }, status=403)

        total = (
            attempt.assessment.questions.count()
        )

        if total == 0:
            return Response({"success": False, "message": "No questions found"}, status=400)

            return Response({
                "success": False,
                "message": "No questions found"
            }, status=400)

        attempt.is_submitted = True

        attempt.submitted_at = timezone.now()

        attempt.save()

        result = _calculate_attempt_score(
            attempt,
            request.user
        )

        return Response({
            "success": True,
            "message": result["message"],
            "data": result["data"]
        }, status=200)


# =========================================================
# CALCULATION HELPERS

def _calculate_attempt_score(attempt, user):

    questions = attempt.assessment.questions.all()

    total_marks = 0

    earned_marks = 0

    for question in questions:

        question_marks = (
            question.marks or 1
        )

        total_marks += question_marks

        answers = StudentAnswer.objects.filter(
            attempt=attempt,
            question=question
        )

        is_correct = False

        # SINGLE
        if question.question_type == "single":

            answer = answers.first()

            if (
                answer
                and
                answer.selected_choice
            ):

                is_correct = (
                    answer.selected_choice.is_correct
                )

        # MULTIPLE
        elif question.question_type == "multiple":

            answer = answers.first()

            if answer:

                selected_ids = set(
                    answer.selected_choices
                    .values_list(
                        "id",
                        flat=True
                    )
                )

                correct_ids = set(
                    question.choices.filter(
                        is_correct=True
                    ).values_list(
                        "id",
                        flat=True
                    )
                )

                is_correct = (
                    selected_ids == correct_ids
                )

        # TEXT
        else:

            answer = answers.first()

            if (
                answer
                and
                answer.text_answer
                and
                question.correct_text_answer
            ):

                is_correct = (
                    answer.text_answer
                    .strip()
                    .lower()
                    ==
                    question.correct_text_answer
                    .strip()
                    .lower()
                )

        answers.update(
            is_correct=is_correct
        )

        if is_correct:
            earned_marks += question_marks

    percentage = 0

    if total_marks > 0:

        percentage = (
            earned_marks / total_marks
        ) * 100

    is_passed = (
        percentage >=
        attempt.assessment.pass_mark
    )

    attempt.score = earned_marks

    attempt.percentage = round(
        percentage,
        2
    )

    attempt.is_passed = is_passed

    attempt.is_submitted = True

    attempt.submitted_at = timezone.now()

    attempt.save()

    if (
        attempt.assessment.assessment_type == "QUIZ"
        and attempt.is_passed
    ):
        enrollment = Enrollment.objects.filter(
            student=user,
            course=attempt.assessment.course,
            status__in=[
                Enrollment.Status.ACTIVE,
                Enrollment.Status.COMPLETED
            ]
        ).first()

        if enrollment:
            _refresh_module_progress(
                user,
                attempt.assessment.module,
                enrollment
            )

    if (
        attempt.assessment.assessment_type == "FINAL"
        and attempt.is_passed
    ):


        enrollment = Enrollment.objects.filter(
            student=user,
            course=attempt.assessment.course,
            status__in=[
                Enrollment.Status.ACTIVE,
                Enrollment.Status.COMPLETED
            ]
        ).first()

        if enrollment:
            _refresh_course_progress(
                user,
                attempt.assessment.course,
                enrollment
            )

    return {
        "message": (
            "Congratulations! You passed."
            if is_passed
            else
            "You failed. Try again."
        ),
        "data": {
            "attempt_id": attempt.id,
            "score": earned_marks,
            "total_marks": total_marks,
            "percentage": round(
                percentage,
                2
            ),
            "is_passed": is_passed
        }
    }


# =========================================================
# RESULT
# =========================================================
class ResultAPIView(APIView):

    permission_classes = [IsAuthenticated, CanViewAttempt]

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

        if not attempt.is_submitted:

            return Response({
                "success": False,
                "message": (
                    "Attempt not submitted yet."
                )
            }, status=400)

        message = (
            "Congratulations! You passed."
            if attempt.is_passed
            else
            "You failed. Try again."
        )

        return Response({
            "success": True,
            "message": message,
            "data": {
                "assessment": (
                    attempt.assessment.title
                ),
                "assessment_type": (
                    attempt.assessment
                    .assessment_type
                ),
                "attempt_number": (
                    attempt.attempt_number
                ),
                "total": (
                    attempt.assessment
                    .questions.count()
                ),
                "score": attempt.score,
                "percentage": (
                    attempt.percentage
                ),
                "is_passed": attempt.is_passed,
                "pass_mark": attempt.assessment.pass_mark,
            }
        })


# =========================================================
# ANSWERS REVIEW
# =========================================================
class AttemptAnswersReviewAPIView(APIView):

    permission_classes = [IsAuthenticated, CanViewAttempt]

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

        questions = (
            attempt.assessment.questions.all()
        )

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

                    selected_choice = (
                        answer.selected_choice.id
                    )

                selected_choices = list(
                    answer.selected_choices
                    .values_list(
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

                "question_text": (
                    question.question_text
                ),

                "question_type": (
                    question.question_type
                ),

                "choices": list(
                    question.choices.values(
                        "id",
                        "text"
                    )
                ),

                "selected_choice": (
                    selected_choice
                ),

                "selected_choices": (
                    selected_choices
                ),

                "text_answer": text_answer,

                "correct_answers": (
                    correct_choices
                ),

                "is_correct": (
                    answer.is_correct
                    if answer
                    else False
                )
            })

        return Response({
            "success": True,
            "attempt_id": attempt.id,
            "data": response_data
        })
