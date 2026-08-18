import json
from urllib import request
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Assessment,StudentAnswer, Question, Choice, Attempt
from .serializers import *
from courses_app.models import Course, Module
from progress_app.models import (ModuleProgress, SectionProgress, _refresh_course_progress, _refresh_module_progress)
from enrollments_app.models import Enrollment
from .permissions import *
from .utils import *
from .services.rules import (
    check_attempt_limit,
    handle_attempt_state,
    unlock_attempt,
    apply_assessment_rules,
    RuleError,
    enforce_tab_switch_limit,
)
from progress_app.models import (
                CourseProgress
            )



def mark_course_unpublished_change(course):
    if course and course.is_published:
        course.has_unpublished_changes = True
        course.save(update_fields=["has_unpublished_changes"])


class ListAssessmentsAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def get(self, request):
        """List assessments with optional filters."""
        assessment_type = request.query_params.get('assessment_type')
        course_id = request.query_params.get('course_id')
        module_id = request.query_params.get('module_id')
        unassigned = request.query_params.get('unassigned')

        assessments = Assessment.objects.all()

        if assessment_type:
            assessments = assessments.filter(assessment_type=assessment_type)

        if course_id:
            assessments = assessments.filter(
                Q(course_id=course_id) | Q(courses__id=course_id)
            )

        if module_id:
            assessments = assessments.filter(
                Q(module_id=module_id) | Q(modules__id=module_id)
            )

        if unassigned == 'true':
            assessments = assessments.filter(
                course__isnull=True,
                courses__isnull=True,
                module__isnull=True,
                modules__isnull=True
            )

        assessments = assessments.distinct()
        serializer = AssessmentDetailSerializer(
            assessments,
            many=True,
            context={"request": request},
        )
        return Response({
            "success": True,
            "data": serializer.data
        })


class CreateAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request):
        data = apply_assessment_rules(request.data.copy())
        serializer = CreateAssessmentSerializer(data=data)

        if serializer.is_valid():
            try:
                assessment = serializer.save(
                    is_published=False,
                    has_unpublished_changes=False
                )

                if assessment.course and assessment.course.is_published:
                    assessment.has_unpublished_changes = True
                    assessment.save(update_fields=['has_unpublished_changes'])
                    mark_course_unpublished_change(assessment.course)

                return Response({
                    "success": True,
                    "message": "Assessment created successfully",
                    "data": CreateAssessmentSerializer(assessment).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"success": False, "error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"success": False, "error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class UpdateAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def patch(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)

        allowed_fields = [
            "duration",
            "max_attempts",
            "pass_mark",
            "instructions",
            "title",
            "tab_switch_enabled",
            "tab_switch_limit",
        ]
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        for field, value in update_data.items():
            setattr(assessment, field, value)

        assessment.save()

        if assessment.course and assessment.course.is_published:
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=["has_unpublished_changes"])
            mark_course_unpublished_change(assessment.course)

        return Response({
            "success": True,
            "message": "Assessment settings updated successfully",
            "data": CreateAssessmentSerializer(assessment).data
        })


class DeleteAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def delete(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)

        if assessment.course and assessment.course.is_published and assessment.is_published:
            assessment.pending_delete = True
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=["pending_delete", "has_unpublished_changes"])
            mark_course_unpublished_change(assessment.course)
            return Response({"success": True, "message": "Assessment marked for deletion. Publish changes to apply deletion."})

        assessment.delete()
        return Response({"success": True, "message": "Assessment deleted successfully"})


class AttachAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)
        module_ids = request.data.get("module_ids")
        course_ids = request.data.get("course_ids")
        attach_module_id = request.data.get("module_id")
        attach_course_id = request.data.get("course_id")

        if attach_module_id is not None and module_ids is None:
            module_ids = [attach_module_id]
        if attach_course_id is not None and course_ids is None:
            course_ids = [attach_course_id]

        if not module_ids and not course_ids:
            return Response({"success": False, "error": "course_ids or module_ids is required."}, status=400)

        if module_ids is not None and assessment.assessment_type != "QUIZ":
            return Response({"success": False, "error": "Only quizzes can be attached to modules."}, status=400)
        if course_ids is not None and assessment.assessment_type != "FINAL":
            return Response({"success": False, "error": "Only final assessments can be attached to courses."}, status=400)

        impacted_courses = set()

        published_targets = set()
        if module_ids is not None:
            published_targets.update(
                module.course for module in Module.objects.filter(id__in=module_ids)
                if module.course.is_published
            )
        if course_ids is not None:
            published_targets.update(
                Course.objects.filter(id__in=course_ids, is_published=True)
            )

        if published_targets:
            additions_modules = set(assessment.draft_module_additions or [])
            removals_modules = set(assessment.draft_module_removals or [])
            additions_courses = set(assessment.draft_course_additions or [])
            removals_courses = set(assessment.draft_course_removals or [])
            if module_ids is not None:
                additions_modules.update(str(value) for value in module_ids)
                removals_modules.difference_update(str(value) for value in module_ids)
            if course_ids is not None:
                additions_courses.update(str(value) for value in course_ids)
                removals_courses.difference_update(str(value) for value in course_ids)
            assessment.draft_module_additions = list(additions_modules)
            assessment.draft_module_removals = list(removals_modules)
            assessment.draft_course_additions = list(additions_courses)
            assessment.draft_course_removals = list(removals_courses)
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=[
                "draft_module_additions", "draft_module_removals",
                "draft_course_additions", "draft_course_removals",
                "has_unpublished_changes",
            ])
            for course in published_targets:
                mark_course_unpublished_change(course)
            return Response({
                "success": True,
                "message": "Assessment attachment queued. Publish course changes to apply it live.",
                "data": AssessmentDetailSerializer(assessment, context={"request": request}).data,
            })

        if module_ids is not None:
            modules = Module.objects.filter(id__in=module_ids)
            impacted_courses.update({module.course for module in modules})

            assessment.modules.add(*modules)
            if not assessment.module and modules:
                assessment.module = modules.first()
                if not assessment.course:
                    assessment.course = modules.first().course

        if course_ids is not None:
            courses = Course.objects.filter(id__in=course_ids)
            impacted_courses.update(courses)

            assessment.courses.add(*courses)
            if not assessment.course and courses:
                assessment.course = courses.first()

        assessment.save()

        impacted_courses = set(assessment.courses.all())
        impacted_courses.update({module.course for module in assessment.modules.all()})
        for course in impacted_courses:
            if course.is_published:
                course.has_unpublished_changes = True
                course.save(update_fields=["has_unpublished_changes"])
                mark_course_unpublished_change(course)

        return Response({
            "success": True,
            "message": "Assessment attached successfully",
            "data": AssessmentDetailSerializer(
                assessment,
                context={"request": request},
            ).data,
        })


class DetachAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)
        module_id = request.data.get("module_id")
        course_id = request.data.get("course_id")

        previous_courses = set(filter(None, [assessment.course]))
        previous_courses.update(assessment.courses.all())
        previous_courses.update({module.course for module in assessment.modules.all()})
        if assessment.module:
            previous_courses.add(assessment.module.course)

        published_courses = {course for course in previous_courses if course.is_published}
        published_courses.update(
            Course.objects.filter(
                id__in=[value for value in (assessment.draft_course_additions or [])],
                is_published=True,
            )
        )
        if module_id is not None:
            target_module = get_object_or_404(Module, id=module_id)
            if target_module.course.is_published:
                published_courses.add(target_module.course)
        if published_courses:
            additions_modules = set(assessment.draft_module_additions or [])
            removals_modules = set(assessment.draft_module_removals or [])
            additions_courses = set(assessment.draft_course_additions or [])
            removals_courses = set(assessment.draft_course_removals or [])
            if module_id is not None:
                value = str(module_id)
                additions_modules.discard(value)
                removals_modules.add(value)
            if course_id is not None:
                value = str(course_id)
                additions_courses.discard(value)
                removals_courses.add(value)
            if module_id is None and course_id is None:
                removals_modules.update(str(value) for value in assessment.modules.values_list("id", flat=True))
                removals_courses.update(str(value) for value in assessment.courses.values_list("id", flat=True))
                if assessment.module_id:
                    removals_modules.add(str(assessment.module_id))
                if assessment.course_id:
                    removals_courses.add(str(assessment.course_id))
            assessment.draft_module_additions = list(additions_modules)
            assessment.draft_module_removals = list(removals_modules)
            assessment.draft_course_additions = list(additions_courses)
            assessment.draft_course_removals = list(removals_courses)
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=[
                "draft_module_additions", "draft_module_removals",
                "draft_course_additions", "draft_course_removals",
                "has_unpublished_changes",
            ])
            for course in published_courses:
                mark_course_unpublished_change(course)
            return Response({
                "success": True,
                "message": "Assessment detachment queued. Publish course changes to apply it live.",
                "data": CreateAssessmentSerializer(assessment).data,
            })

        if module_id is None and course_id is None:
            assessment.modules.clear()
            assessment.courses.clear()
            assessment.module = None
            assessment.course = None
        else:
            if module_id is not None:
                module = get_object_or_404(Module, id=module_id)
                assessment.modules.remove(module)
                if assessment.module and str(assessment.module.id) == str(module_id):
                    assessment.module = assessment.modules.first()
                    assessment.course = assessment.module.course if assessment.module else None

            if course_id is not None:
                course = get_object_or_404(Course, id=course_id)
                assessment.courses.remove(course)
                if assessment.course and str(assessment.course.id) == str(course_id):
                    assessment.course = assessment.courses.first()

        assessment.has_unpublished_changes = True
        assessment.save(update_fields=["module", "course", "has_unpublished_changes"])

        for course in previous_courses:
            if course.is_published:
                mark_course_unpublished_change(course)

        message = (
            "Published course changes queued. Reattach the final assessment and click Update Live Course to publish the change."
            if any(course.is_published for course in previous_courses)
            else "Assessment detached successfully"
        )

        return Response({"success": True, "message": message, "data": CreateAssessmentSerializer(assessment).data})


# ✅ Create Question API (Admin only)
class RetrieveAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, CanAddAssessment]

    def get(self, request, assessment_id):
        assessment = get_object_or_404(Assessment, id=assessment_id)
        return Response({
            "success": True,
            "data": AssessmentDetailSerializer(
                assessment,
                context={"request": request},
            ).data
        })


class CreateQuestionAPIView(APIView):

    permission_classes = [IsAuthenticated, CanAddAssessment]

    def post(self, request):

        serializer = QuestionCreateSerializer(
            data=request.data
        )

        if serializer.is_valid():

            question = serializer.save()
            assessment = question.assessment

            related_course = assessment.course
            if related_course is None and assessment.module is not None:
                related_course = assessment.module.course
            if related_course is None and assessment.modules.exists():
                related_course = assessment.modules.first().course
            if related_course is None and assessment.courses.exists():
                related_course = assessment.courses.first()

            # Mark as having unpublished changes only if a real course is published
            if related_course and related_course.is_published:
                assessment.has_unpublished_changes = True
                assessment.save(update_fields=['has_unpublished_changes'])
                related_course.has_unpublished_changes = True
                related_course.save(update_fields=['has_unpublished_changes'])

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

        course_id = request.query_params.get("course_id")
        course = None

        if course_id:
            course = get_object_or_404(Course, id=course_id)
        elif assessment.module:
            course = assessment.module.course
        elif assessment.course:
            course = assessment.course
        elif assessment.courses.exists():
            course = assessment.courses.first()

        if not course:
            return Response({
                "status": "failed",
                "message": "Assessment is not attached to a course yet.",
            }, status=403)

        if not is_student_enrolled(request.user, course):
            return Response({
                "status": "failed",
                "message": "Not enrolled in this course"
            }, status=403)

        # Quiz rule
        if assessment.assessment_type == "QUIZ":
            if not assessment.module:
                return Response({
                    "status": "failed",
                    "message": "Quiz is not attached to a module yet."
                }, status=403)
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

        questions = assessment.questions.filter(pending_delete=False)

        return Response({
            "status": "success",
            "assessment": assessment.title,
            "assessment_type": (
                assessment.assessment_type
            ),
            "data": QuestionSerializer(
                questions,
                many=True,
                context={"request": request},
            ).data
        })

class UpdateQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, CanChangeAssessment]

    def put(self, request, question_id):
        question = get_object_or_404(Question, id=question_id)
        assessment = question.assessment

        related_courses = set(assessment.courses.all())
        if assessment.course is not None:
            related_courses.add(assessment.course)
        if assessment.module is not None:
            related_courses.add(assessment.module.course)
        related_courses.update(module.course for module in assessment.modules.all())
        published_courses = [course for course in related_courses if course.is_published]

        serializer = QuestionCreateSerializer(question, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"status": "failed", "errors": serializer.errors}, status=400)

        if published_courses:
            validated_data = serializer.validated_data
            choices = validated_data.get("choices")
            matching_pairs = validated_data.get("matching_pairs")
            draft_question_type = validated_data.get(
                "question_type",
                question.draft_question_type or question.question_type,
            )
            if draft_question_type == Question.QuestionType.MATCHING:
                draft_choices = []
            elif choices is not None:
                draft_choices = [
                    {"text": choice["text"], "is_correct": choice["is_correct"]}
                    for choice in choices
                ]
            else:
                draft_choices = (
                    question.draft_choices
                    if question.draft_choices is not None
                    else list(question.choices.values("text", "is_correct"))
                )
            draft_updates = {
                "draft_question_text": validated_data.get(
                    "question_text",
                    question.draft_question_text or question.question_text,
                ),
                "draft_question_type": validated_data.get(
                    "question_type",
                    question.draft_question_type or question.question_type,
                ),
                "draft_marks": validated_data.get(
                    "marks",
                    question.draft_marks if question.draft_marks is not None else question.marks,
                ),
                "draft_matching_pairs": matching_pairs if "matching_pairs" in validated_data else (
                    question.draft_matching_pairs
                    if question.draft_matching_pairs is not None
                    else question.matching_pairs
                ),
                "draft_choices": draft_choices,
                "has_unpublished_changes": True,
            }
            for field, value in draft_updates.items():
                setattr(question, field, value)
            question.save(update_fields=list(draft_updates.keys()))

            assessment.has_unpublished_changes = True
            assessment.save(update_fields=["has_unpublished_changes"])
            for course in published_courses:
                course.has_unpublished_changes = True
                course.save(update_fields=["has_unpublished_changes"])
            return Response({
                "status": "success",
                "message": "Question update queued. Publish the course to apply it to learners.",
                "data": {
                    **QuestionSerializer(
                        question,
                        context={"request": request},
                    ).data,
                    "question_text": draft_updates["draft_question_text"],
                    "question_type": draft_updates["draft_question_type"],
                    "marks": draft_updates["draft_marks"],
                    "choices": draft_updates["draft_choices"] or [],
                    "matching_pairs": draft_updates["draft_matching_pairs"] or [],
                },
            })

        serializer.save()
        return Response({"status": "success", "data": QuestionSerializer(question).data})

class DeleteQuestionAPIView(APIView):
    permission_classes = [IsAuthenticated, CanDeleteAssessment]

    def delete(self, request, question_id):
        question = get_object_or_404(Question, id=question_id)
        assessment = question.assessment

        related_courses = set(assessment.courses.all())
        if assessment.course is not None:
            related_courses.add(assessment.course)
        if assessment.module is not None:
            related_courses.add(assessment.module.course)
        related_courses.update(module.course for module in assessment.modules.all())

        published_courses = [course for course in related_courses if course.is_published]
        if published_courses:
            question.pending_delete = True
            question.has_unpublished_changes = True
            question.save(update_fields=["pending_delete", "has_unpublished_changes"])
            assessment.has_unpublished_changes = True
            assessment.save(update_fields=["has_unpublished_changes"])
            for course in published_courses:
                course.has_unpublished_changes = True
                course.save(update_fields=["has_unpublished_changes"])
            return Response({
                "status": "success",
                "message": "Question deletion queued. Publish the course to apply it to learners.",
            })

        question.delete()
        return Response({"status": "success", "message": "Question deleted"})

# =========================================================
# START ATTEMPT
# =========================================================
class StartAttemptAPIView(APIView):

    permission_classes = [IsAuthenticated, CanStartAssessment]

    def post(self, request, assessment_id):

        user = request.user
        course_id = request.data.get("course_id") or request.query_params.get("course_id")

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

        course = None
        if course_id:
            course = get_object_or_404(Course, id=course_id)
        else:
            if assessment.course:
                course = assessment.course
            elif assessment.courses.exists():
                matching_enrollment = Enrollment.objects.filter(
                    student=user,
                    course__in=assessment.courses.all(),
                    status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
                ).first()
                course = matching_enrollment.course if matching_enrollment else assessment.courses.first()

        if course and not is_student_enrolled(user, course):
            return Response({
                "status": "failed",
                "message": "Not enrolled in this course",
                "data": None
            }, status=403)

        try:

            # RESUME ACTIVE ATTEMPT
            existing = Attempt.objects.filter(
                student=user,
                assessment=assessment,
                course=course,
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
                assessment,
                course=course,
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
            course=course,
            attempt_number=(
                Attempt.objects.filter(
                    student=user,
                    assessment=assessment,
                    course=course,
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

        matching_pairs = request.data.get(
            "matching_pairs",
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

            # Allow clearing the selected answer if no choice is submitted.
            if not selected_choices:
                answer.selected_choice = None
                answer.selected_choices.clear()
                answer.text_answer = None
                answer.is_correct = False
                answer.save()
                return Response({
                    "success": True,
                    "message": "Answer cleared"
                })

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

        # MATCHING
        elif question.question_type == "matching":
            if not matching_pairs or not isinstance(matching_pairs, list):
                return Response({
                    "success": False,
                    "message": "Matching pairs are required"
                }, status=400)

            answer.selected_choice = None
            answer.selected_choices.clear()

            correct_pairs = question.matching_pairs or []
            normalized_correct = [
                {"left": str(p.get("left", "")).strip(), "right": str(p.get("right", "")).strip()}
                for p in correct_pairs
            ]
            normalized_selected = [
                {"left": str(p.get("left", "")).strip(), "right": str(p.get("right", "")).strip()}
                for p in matching_pairs
            ]

            answer.is_correct = (
                len(normalized_correct) == len(normalized_selected)
                and all(pair in normalized_selected for pair in normalized_correct)
            )

            answer.text_answer = json.dumps(normalized_selected)

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

        if attempt.assessment.assessment_type == "FINAL" and attempt.assessment.tab_switch_enabled:
            enforce_tab_switch_limit(attempt)

        return Response({
            "success": True,
            "message": "Answer saved"
        })



# =========================================================
# TAB SWITCH EVENT
# =========================================================

class TabSwitchEventAPIView(APIView):

    permission_classes = [IsAuthenticated, CanStartAssessment]

    def post(self, request):
        attempt_id = request.data.get("attempt_id")

        attempt = get_object_or_404(
            Attempt,
            id=attempt_id,
            student=request.user
        )

        if attempt.is_submitted or attempt.is_locked:
            return Response({
                "success": False,
                "message": "Attempt is no longer active"
            }, status=403)

        attempt.tab_switch_count = (attempt.tab_switch_count or 0) + 1
        attempt.save(update_fields=["tab_switch_count"])

        if attempt.assessment.assessment_type == "FINAL" and attempt.assessment.tab_switch_enabled:
            enforce_tab_switch_limit(attempt)

        return Response({
            "success": True,
            "message": "Tab switch recorded",
            "data": {
                "tab_switch_count": attempt.tab_switch_count,
                "is_submitted": attempt.is_submitted,
                "is_locked": attempt.is_locked,
            }
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

        if attempt.assessment.assessment_type == "FINAL" and attempt.assessment.tab_switch_enabled and attempt.tab_switch_count > attempt.assessment.tab_switch_limit:
            attempt.is_submitted = True
            attempt.submitted_at = timezone.now()
            attempt.save(update_fields=["is_submitted", "submitted_at"])
            result = _calculate_attempt_score(
                attempt,
                request.user
            )

            return Response({
                "success": True,
                "message": "Attempt auto-submitted due to tab switch limit.",
                "data": result["data"]
            }, status=200)

        # Refresh attempt state (autosubmit on expiration)
        state = handle_attempt_state(attempt)

        if state == "locked":
            return Response({
                "success": False,
                "message": "Attempt locked",
                "data": None
            }, status=403)

        if state == "submitted":
            # If the attempt was auto-submitted by timeout, return the calculated result
            # rather than a hard error so the frontend can show the feedback page.
            result = _calculate_attempt_score(
                attempt,
                request.user
            )

            return Response({
                "success": True,
                "message": result["message"],
                "data": result["data"]
            }, status=200)

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

        # MATCHING
        elif question.question_type == "matching":

            answer = answers.first()

            if answer and answer.text_answer is not None:
                try:
                    selected_pairs = json.loads(answer.text_answer)
                except Exception:
                    selected_pairs = []

                correct_pairs = question.matching_pairs or []
                normalized_correct = [
                    {"left": str(p.get("left", "")).strip(), "right": str(p.get("right", "")).strip()}
                    for p in correct_pairs
                ]
                normalized_selected = [
                    {"left": str(p.get("left", "")).strip(), "right": str(p.get("right", "")).strip()}
                    for p in selected_pairs
                ]

                is_correct = (
                    len(normalized_correct) == len(normalized_selected)
                    and all(pair in normalized_selected for pair in normalized_correct)
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
