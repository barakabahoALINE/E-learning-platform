from datetime import timedelta
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from courses_app.models import Course, Module
from courses_app.serializers import ModuleSerializer, CourseDetailSerializer
from .models import Assessment, Attempt, Choice, Question
from .services.rules import RuleError, check_attempt_limit, validate_attachment_targets
from .serializers import CreateAssessmentSerializer, AssessmentDetailSerializer
from .views import (
    CreateQuestionAPIView,
    DeleteQuestionAPIView,
    DetachAssessmentAPIView,
    AttachAssessmentAPIView,
    DeleteAssessmentAPIView,
    UpdateQuestionAPIView,
    UpdateAssessmentAPIView,
)
from courses_app.views import apply_assessment_attachment_drafts, apply_question_draft_changes, CoursePublishAPIView


class AssessmentSerializerTests(TestCase):

    def setUp(self):
        self.course = Course.objects.create(
            title="Test Course",
            description="Test course description.",
            duration="1h"
        )
        self.module = Module.objects.create(
            course=self.course,
            title="Test Module",
            description="",
            order=1
        )

    def test_quiz_creation_handles_null_max_attempts_and_duration(self):
        data = {
            "course": self.course.id,
            "module": self.module.id,
            "assessment_type": "QUIZ",
            "title": "Module Quiz",
            "pass_mark": 70,
            "max_attempts": None,
            "duration": None,
            "descriptions": "A quiz for the module.",
            "instructions": "",
        }

        serializer = CreateAssessmentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        assessment = serializer.save()

        self.assertEqual(assessment.assessment_type, "QUIZ")
        self.assertEqual(assessment.max_attempts, 1)
        self.assertEqual(assessment.duration, 30)

    def test_independent_quiz_can_be_created_without_course_or_module(self):
        data = {
            "assessment_type": "QUIZ",
            "title": "Standalone Quiz",
            "pass_mark": 70,
            "descriptions": "Independent quiz.",
        }

        serializer = CreateAssessmentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        assessment = serializer.save()

        self.assertEqual(assessment.assessment_type, "QUIZ")
        self.assertIsNone(assessment.course)
        self.assertIsNone(assessment.module)

    def test_independent_final_can_be_created_without_course(self):
        data = {
            "assessment_type": "FINAL",
            "title": "Standalone Final",
            "pass_mark": 70,
            "duration": 60,
            "descriptions": "Independent final.",
        }

        serializer = CreateAssessmentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        assessment = serializer.save()

        self.assertEqual(assessment.assessment_type, "FINAL")
        self.assertIsNone(assessment.course)
        self.assertIsNone(assessment.module)

    def test_attach_detach_updates_course_and_module(self):
        quiz_data = {
            "assessment_type": "QUIZ",
            "title": "Standalone Quiz",
            "pass_mark": 70,
            "descriptions": "Independent quiz.",
        }

        serializer = CreateAssessmentSerializer(data=quiz_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        assessment = serializer.save()

        assessment.module = self.module
        assessment.course = self.module.course
        assessment.save()

        self.assertEqual(assessment.module, self.module)
        self.assertEqual(assessment.course, self.course)

        assessment.module = None
        assessment.course = None
        assessment.save()

        self.assertIsNone(assessment.module)
        self.assertIsNone(assessment.course)

    def test_only_one_quiz_can_be_attached_to_a_module(self):
        existing = Assessment.objects.create(title="Existing Quiz", assessment_type="QUIZ", pass_mark=70)
        existing.modules.add(self.module)
        replacement = Assessment.objects.create(title="Replacement Quiz", assessment_type="QUIZ", pass_mark=70)

        with self.assertRaisesMessage(RuleError, "Detach it first"):
            validate_attachment_targets(replacement, module_ids=[self.module.id])

        self.assertEqual(list(self.module.attached_assessments.values_list("id", flat=True)), [existing.id])

    def test_only_one_final_can_be_attached_to_a_course(self):
        existing = Assessment.objects.create(title="Existing Final", assessment_type="FINAL", pass_mark=60)
        existing.courses.add(self.course)
        replacement = Assessment.objects.create(title="Replacement Final", assessment_type="FINAL", pass_mark=60)

        with self.assertRaisesMessage(RuleError, "Detach it first"):
            validate_attachment_targets(replacement, course_ids=[self.course.id])

        self.assertEqual(list(self.course.attached_assessments.values_list("id", flat=True)), [existing.id])

    def test_replacement_final_is_allowed_after_pending_detach(self):
        existing = Assessment.objects.create(
            title="Existing Final",
            assessment_type="FINAL",
            pass_mark=60,
            course=self.course,
        )
        existing.draft_course_removals = [str(self.course.id)]
        existing.save(update_fields=["draft_course_removals"], validate=False)
        replacement = Assessment.objects.create(
            title="Replacement Final",
            assessment_type="FINAL",
            pass_mark=60,
        )

        self.assertTrue(
            validate_attachment_targets(replacement, course_ids=[self.course.id])
        )

    def test_module_serializer_includes_m2m_attached_quiz(self):
        assessment = Assessment.objects.create(
            title="Attached Module Quiz",
            assessment_type="QUIZ",
            pass_mark=70,
            duration=30,
            max_attempts=3,
        )
        assessment.modules.add(self.module)

        module_data = ModuleSerializer(self.module).data

        self.assertIsNotNone(module_data.get("quiz"))
        self.assertEqual(module_data["quiz"]["id"], assessment.id)

    def test_course_detail_serializer_includes_m2m_attached_final(self):
        assessment = Assessment.objects.create(
            title="Attached Final Assessment",
            assessment_type="FINAL",
            pass_mark=60,
            duration=60,
            max_attempts=3,
        )
        assessment.courses.add(self.course)

        course_data = CourseDetailSerializer(self.course).data

        self.assertIsNotNone(course_data.get("final_assessment"))
        self.assertEqual(course_data["final_assessment"]["id"], assessment.id)

    def test_course_detail_serializer_ignores_stale_json_final_assessment_when_no_db_assessment_exists(self):
        self.course.final_assessment = {
            "id": 999999,
            "title": "Ghost Final Assessment",
            "assessment_type": "FINAL",
        }
        self.course.save(update_fields=["final_assessment"])

        course_data = CourseDetailSerializer(self.course).data

        self.assertIsNone(course_data.get("final_assessment"))

    def test_course_detail_serializer_hides_pending_final_detachment_for_admin(self):
        assessment = Assessment.objects.create(
            title="Pending Detach Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=self.course,
        )
        assessment.draft_course_removals = [str(self.course.id)]
        assessment.save(update_fields=["draft_course_removals"])

        request = APIRequestFactory().get("/api/courses/1/")
        request.user = SimpleNamespace(is_superuser=True)
        course_data = CourseDetailSerializer(self.course, context={"request": request}).data

        self.assertIsNone(course_data.get("final_assessment"))

    def test_course_detail_serializer_shows_pending_final_attachment_for_admin(self):
        assessment = Assessment.objects.create(
            title="Pending Attached Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
        )
        assessment.draft_course_additions = [str(self.course.id)]
        assessment.save(update_fields=["draft_course_additions"])

        request = APIRequestFactory().get("/api/courses/1/")
        request.user = SimpleNamespace(is_superuser=True)
        course_data = CourseDetailSerializer(self.course, context={"request": request}).data

        self.assertIsNotNone(course_data.get("final_assessment"))
        self.assertEqual(course_data["final_assessment"]["id"], assessment.id)

    def test_assessment_detail_serializer_unifies_fk_and_m2m_course_attachments(self):
        other_course = Course.objects.create(
            title="Second Course",
            description="Another course.",
            duration="2h",
        )
        assessment = Assessment.objects.create(
            title="Mixed Course Link Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=self.course,
        )
        assessment.courses.add(other_course)

        detail = AssessmentDetailSerializer(assessment).data
        attachment_ids = [item["id"] for item in detail["course_attachments"]]
        self.assertEqual(sorted(attachment_ids), sorted([self.course.id, other_course.id]))

    def test_create_question_works_when_course_attachment_is_m2m_only(self):
        assessment = Assessment.objects.create(
            title="M2M Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=None,
        )
        assessment.courses.add(self.course)

        factory = APIRequestFactory()
        request = factory.post(
            "/api/assessments/questions/create/",
            {
                "assessment": assessment.id,
                "question_text": "What is the capital of France?",
                "question_type": "single",
                "marks": 1,
                "choices": [
                    {"text": "Paris", "is_correct": True},
                    {"text": "London", "is_correct": False},
                    {"text": "Rome", "is_correct": False},
                ],
            },
            format="json",
        )
        response = CreateQuestionAPIView().post(request)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(assessment.questions.count(), 1)

    def test_published_question_edit_is_persisted_as_server_draft(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="Published Quiz",
            assessment_type="QUIZ",
            course=self.course,
            module=self.module,
            is_published=True,
        )
        question = Question.objects.create(
            assessment=assessment,
            question_text="Original",
            question_type="single",
            marks=1,
            order=1,
        )
        Choice.objects.create(question=question, text="Correct", is_correct=True)

        request = SimpleNamespace(
            data={
                "question_text": "Edited on server",
                "question_type": "single",
                "marks": 2,
                "choices": [
                    {"text": "New correct", "is_correct": True},
                    {"text": "Wrong", "is_correct": False},
                ],
            },
            user=self.user if hasattr(self, 'user') else None,
        )
        response = UpdateQuestionAPIView().put(request, question.id)

        self.assertEqual(response.status_code, 200)
        question.refresh_from_db()
        self.assertEqual(question.question_text, "Original")
        self.assertEqual(question.draft_question_text, "Edited on server")
        self.assertEqual(question.draft_marks, 2)
        self.assertTrue(question.has_unpublished_changes)

    def test_published_question_delete_is_queued_then_removed_on_publish(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="Published Final",
            assessment_type="FINAL",
            course=self.course,
            is_published=True,
        )
        question = Question.objects.create(
            assessment=assessment,
            question_text="Delete me after publish",
            question_type="single",
            order=1,
        )
        Choice.objects.create(question=question, text="Answer", is_correct=True)

        request = APIRequestFactory().delete(
            "/api/assessments/questions/1/delete/"
        )
        response = DeleteQuestionAPIView().delete(request, question.id)

        self.assertEqual(response.status_code, 200)
        question.refresh_from_db()
        self.assertTrue(question.pending_delete)
        self.assertTrue(Question.objects.filter(id=question.id).exists())

        assessment.questions.filter(pending_delete=True).delete()
        self.assertFalse(Question.objects.filter(id=question.id).exists())

    def test_publishing_question_draft_replaces_live_values(self):
        assessment = Assessment.objects.create(
            title="Draft Quiz",
            assessment_type="QUIZ",
            course=self.course,
            module=self.module,
        )
        question = Question.objects.create(
            assessment=assessment,
            question_text="Live text",
            question_type="single",
            marks=1,
            order=1,
            draft_question_text="Published text",
            draft_question_type="single",
            draft_marks=4,
            draft_choices=[
                {"text": "Published answer", "is_correct": True},
            ],
            has_unpublished_changes=True,
        )

        apply_question_draft_changes(assessment)

        question.refresh_from_db()
        self.assertEqual(question.question_text, "Published text")
        self.assertEqual(question.marks, 4)
        self.assertEqual(list(question.choices.values_list("text", flat=True)), ["Published answer"])
        self.assertFalse(question.has_unpublished_changes)

    def test_published_course_detach_removes_final_assessment_relation_and_marks_course_dirty(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="Live Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=self.course,
            is_published=True,
        )
        assessment.courses.add(self.course)

        request = SimpleNamespace(data={"course_id": self.course.id})

        response = DetachAssessmentAPIView().post(request, assessment.id)

        self.assertEqual(response.status_code, 200)
        assessment.refresh_from_db()
        self.assertEqual(assessment.course_id, self.course.id)
        self.assertIn(str(self.course.id), assessment.draft_course_removals)
        self.assertTrue(assessment.courses.filter(id=self.course.id).exists())
        self.course.refresh_from_db()
        self.assertTrue(self.course.has_unpublished_changes)
        self.assertIn("queued", response.data["message"].lower())

        apply_assessment_attachment_drafts(self.course)
        assessment.refresh_from_db()
        self.assertIsNone(assessment.course_id)
        self.assertFalse(assessment.courses.filter(id=self.course.id).exists())

        request = SimpleNamespace(user=SimpleNamespace(is_superuser=True))
        detail = AssessmentDetailSerializer(assessment, context={"request": request}).data
        self.assertNotIn(self.course.id, [item["id"] for item in detail["course_attachments"]])

    def test_published_course_detach_removes_module_quiz_relation_and_marks_course_dirty(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="Live Module Quiz",
            assessment_type="QUIZ",
            pass_mark=70,
            duration=30,
            max_attempts=2,
            module=self.module,
            course=self.course,
            is_published=True,
        )
        assessment.modules.add(self.module)

        request = SimpleNamespace(data={"module_id": self.module.id})

        response = DetachAssessmentAPIView().post(request, assessment.id)

        self.assertEqual(response.status_code, 200)
        assessment.refresh_from_db()
        self.assertEqual(assessment.module_id, self.module.id)
        self.assertIn(str(self.module.id), assessment.draft_module_removals)
        self.assertTrue(assessment.modules.filter(id=self.module.id).exists())
        self.course.refresh_from_db()
        self.assertTrue(self.course.has_unpublished_changes)
        self.assertIn("queued", response.data["message"].lower())

        apply_assessment_attachment_drafts(self.course)
        assessment.refresh_from_db()
        self.assertIsNone(assessment.module_id)
        self.assertFalse(assessment.modules.filter(id=self.module.id).exists())

    def test_published_course_attach_updates_relation_and_marks_course_dirty(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="Queued Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=None,
            is_published=True,
        )

        request = SimpleNamespace(data={"course_id": self.course.id})

        response = AttachAssessmentAPIView().post(request, assessment.id)

        self.assertEqual(response.status_code, 200)
        assessment.refresh_from_db()
        self.assertFalse(assessment.courses.filter(id=self.course.id).exists())
        self.assertIn(str(self.course.id), assessment.draft_course_additions)
        self.course.refresh_from_db()
        self.assertTrue(self.course.has_unpublished_changes)
        self.assertIn("publish", response.data["message"].lower())

        apply_assessment_attachment_drafts(self.course)
        assessment.refresh_from_db()
        self.assertTrue(assessment.courses.filter(id=self.course.id).exists())

    def test_unpublished_course_attach_and_detach_updates_m2m_relation_immediately(self):
        assessment = Assessment.objects.create(
            title="Draft Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
        )

        attach_response = AttachAssessmentAPIView().post(
            SimpleNamespace(data={"course_id": self.course.id}), assessment.id
        )
        self.assertEqual(attach_response.status_code, 200)
        assessment.refresh_from_db()
        self.assertTrue(assessment.courses.filter(id=self.course.id).exists())

        detach_response = DetachAssessmentAPIView().post(
            SimpleNamespace(data={"course_id": self.course.id}), assessment.id
        )
        self.assertEqual(detach_response.status_code, 200)
        assessment.refresh_from_db()
        self.assertFalse(assessment.courses.filter(id=self.course.id).exists())

    def test_quiz_settings_and_title_update_are_persisted(self):
        assessment = Assessment.objects.create(
            title="Original Quiz",
            assessment_type="QUIZ",
            pass_mark=60,
            max_attempts=0,
            duration=0,
        )

        response = UpdateAssessmentAPIView().patch(SimpleNamespace(data={
            "title": "Updated Quiz",
            "pass_mark": 75,
            "max_attempts": 2,
            "duration": 20,
        }), assessment.id)

        self.assertEqual(response.status_code, 200)
        assessment.refresh_from_db()
        self.assertEqual(assessment.title, "Updated Quiz")
        self.assertEqual(assessment.pass_mark, 75)
        self.assertEqual(assessment.max_attempts, 2)
        self.assertEqual(assessment.duration, 20)

    def test_published_m2m_assessment_delete_removes_database_record_immediately(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        assessment = Assessment.objects.create(
            title="M2M Final To Delete",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            is_published=True,
        )
        assessment.courses.add(self.course)
        self.course.final_assessment = {"id": assessment.id, "assessment_type": "FINAL"}
        self.course.save(update_fields=["final_assessment"])

        response = DeleteAssessmentAPIView().delete(SimpleNamespace(), assessment.id)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Assessment.objects.filter(id=assessment.id).exists())
        self.course.refresh_from_db()
        self.assertIsNone(self.course.final_assessment)

    def test_course_publish_accepts_attached_unpublished_final_assessment(self):
        user = get_user_model().objects.create_superuser(
            email="publisher@example.com",
            password="Str0ngP@ssword!",
        )
        assessment = Assessment.objects.create(
            title="New Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            is_published=False,
        )
        assessment.courses.add(self.course)

        request = APIRequestFactory().post(
            f"/api/courses/{self.course.id}/publish/",
            {"confirm": True},
            format="json",
        )
        force_authenticate(request, user=user)
        response = CoursePublishAPIView.as_view()(request, pk=self.course.id)

        self.assertEqual(response.status_code, 200)
        assessment.refresh_from_db()
        self.assertTrue(assessment.is_published)
        self.course.refresh_from_db()
        self.assertTrue(self.course.is_published)

    def test_replacement_final_can_attach_after_previous_published_final_is_detached(self):
        self.course.is_published = True
        self.course.save(update_fields=["is_published"])
        previous_assessment = Assessment.objects.create(
            title="Previous Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            course=self.course,
            is_published=True,
        )
        replacement_assessment = Assessment.objects.create(
            title="Replacement Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            duration=60,
            max_attempts=3,
            is_published=True,
        )

        detach_response = DetachAssessmentAPIView().post(
            SimpleNamespace(data={"course_id": self.course.id}),
            previous_assessment.id,
        )
        self.assertEqual(detach_response.status_code, 200)

        attach_response = AttachAssessmentAPIView().post(
            SimpleNamespace(data={"course_id": self.course.id}),
            replacement_assessment.id,
        )

        self.assertEqual(attach_response.status_code, 200)
        previous_assessment.refresh_from_db()
        replacement_assessment.refresh_from_db()
        self.assertEqual(previous_assessment.course_id, self.course.id)
        self.assertIn(str(self.course.id), previous_assessment.draft_course_removals)
        self.assertFalse(replacement_assessment.courses.filter(id=self.course.id).exists())
        self.assertIn(str(self.course.id), replacement_assessment.draft_course_additions)

        apply_assessment_attachment_drafts(self.course)
        previous_assessment.refresh_from_db()
        replacement_assessment.refresh_from_db()
        self.assertIsNone(previous_assessment.course_id)
        self.assertFalse(previous_assessment.courses.filter(id=self.course.id).exists())
        self.assertTrue(replacement_assessment.courses.filter(id=self.course.id).exists())

    def test_attach_keeps_valid_selected_courses_when_another_selected_course_has_pending_removal(self):
        other_course = Course.objects.create(
            title="Other Published Course",
            description="Another published course.",
            duration="1h",
            is_published=True,
        )
        previous_assessment = Assessment.objects.create(
            title="Previous Assessment",
            assessment_type="FINAL",
            course=other_course,
            is_published=True,
        )
        replacement_assessment = Assessment.objects.create(
            title="Replacement Assessment",
            assessment_type="FINAL",
            is_published=True,
        )
        replacement_assessment.courses.add(self.course)

        detach_response = DetachAssessmentAPIView().post(
            SimpleNamespace(data={"course_id": other_course.id}),
            previous_assessment.id,
        )
        self.assertEqual(detach_response.status_code, 200)

        attach_response = AttachAssessmentAPIView().post(
            SimpleNamespace(data={"course_ids": [self.course.id, other_course.id]}),
            replacement_assessment.id,
        )

        self.assertEqual(attach_response.status_code, 200)
        replacement_assessment.refresh_from_db()
        self.assertIn(str(self.course.id), replacement_assessment.draft_course_additions)
        self.assertIn(str(other_course.id), replacement_assessment.draft_course_additions)


class FinalAssessmentCooldownTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="student@example.com",
            password="Str0ngP@ssword!"
        )
        self.course = Course.objects.create(
            title="Final Course",
            description="Course with final assessment.",
            duration="1h"
        )
        self.assessment = Assessment.objects.create(
            course=self.course,
            title="Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True
        )

    def _create_submitted_attempt(self, submitted_at):
        return Attempt.objects.create(
            student=self.user,
            assessment=self.assessment,
            attempt_number=Attempt.objects.filter(
                student=self.user,
                assessment=self.assessment
            ).count() + 1,
            is_submitted=True,
            submitted_at=submitted_at
        )

    def test_allows_one_extra_final_attempt_after_24_hours(self):
        past = timezone.now() - timedelta(hours=25)
        for _ in range(3):
            self._create_submitted_attempt(past)

        self.assertTrue(check_attempt_limit(self.user, self.assessment))

    def test_denies_final_attempt_before_cooldown_ends(self):
        now = timezone.now()
        for i in range(3):
            self._create_submitted_attempt(now - timedelta(hours=1 + i))

        with self.assertRaisesMessage(RuleError, "Next attempt allowed in"):
            check_attempt_limit(self.user, self.assessment)

    def test_denies_more_than_one_extra_final_attempt_after_cooldown(self):
        old_time = timezone.now() - timedelta(hours=25)
        for _ in range(3):
            self._create_submitted_attempt(old_time)

        # Simulate the one extra allowed attempt after cooldown.
        self._create_submitted_attempt(timezone.now())

        with self.assertRaisesMessage(RuleError, "Final assessment limit reached"):
            check_attempt_limit(self.user, self.assessment)

    def test_course_specific_final_pass_does_not_block_other_courses_with_same_assessment(self):
        other_course = Course.objects.create(
            title="Other Course",
            description="Another course using the same shared assessment.",
            duration="2h"
        )

        shared_assessment = Assessment.objects.create(
            course=self.course,
            title="Shared Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True
        )
        shared_assessment.courses.add(other_course)

        Attempt.objects.create(
            student=self.user,
            course=self.course,
            assessment=shared_assessment,
            attempt_number=1,
            is_submitted=True,
            is_passed=True,
            submitted_at=timezone.now(),
        )

        self.assertTrue(check_attempt_limit(self.user, shared_assessment, course=other_course))
