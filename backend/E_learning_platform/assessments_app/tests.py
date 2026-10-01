from datetime import timedelta
from types import SimpleNamespace

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIRequestFactory, force_authenticate

from courses_app.models import Course, Module
from enrollments_app.models import Enrollment
from courses_app.serializers import ModuleSerializer, CourseDetailSerializer
from .models import Assessment, Attempt, Choice, Question, Survey, Training, AccessCode
from .services.rules import RuleError, check_attempt_limit, validate_attachment_targets
from .serializers import CreateAssessmentSerializer, AssessmentDetailSerializer
from users_app.permissions import IsAdminUserRole, IsTrainingUser
from .views import (
    CreateAssessmentAPIView,
    CreateQuestionAPIView,
    DeleteQuestionAPIView,
    DetachAssessmentAPIView,
    AttachAssessmentAPIView,
    DeleteAssessmentAPIView,
    UpdateQuestionAPIView,
    UpdateAssessmentAPIView,
    StartAttemptAPIView,
    MyTrainingAssessmentsAPIView,
    PublishTrainingAssessmentAPIView,
    TrainingAssessmentUsersAPIView,
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
        self.assertEqual(assessment.max_attempts, 3)
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

    def test_training_assessment_requires_training_and_tracks_access_code(self):
        survey = Survey.objects.create(name="Population Census", description="training survey")
        training = Training.objects.create(title="Census Basics", description="intro", survey=survey, is_active=True)

        data = {
            "assessment_type": "TRAINING",
            "title": "Census training assessment",
            "training": training.id,
            "pass_mark": 70,
            "duration": 30,
            "require_access_code": True,
            "descriptions": "Access code required.",
        }

        serializer = CreateAssessmentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        assessment = serializer.save()
        self.assertEqual(assessment.assessment_type, "TRAINING")
        self.assertEqual(assessment.training_id, training.id)
        self.assertTrue(assessment.require_access_code)
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

    def test_attached_assessment_survives_course_and_module_deletion(self):
        assessment = Assessment.objects.create(
            title="Reusable Assessment",
            assessment_type="QUIZ",
            pass_mark=70,
        )
        assessment.modules.add(self.module)

        assessment_id = assessment.id
        course_id = self.course.id
        self.course.delete()

        self.assertTrue(Assessment.objects.filter(id=assessment_id).exists())
        assessment.refresh_from_db()
        self.assertIsNone(assessment.course_id)
        self.assertIsNone(assessment.module_id)
        self.assertFalse(assessment.modules.exists())
        self.assertFalse(Course.objects.filter(id=course_id).exists())

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


class TrainingAssessmentPhase1Tests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="training.student@example.com",
            password="Str0ngP@ssword!",
            full_name="Training Student",
            institution="NISR",
            role="admin",
        )
        self.survey = Survey.objects.create(name="Population Census", description="baseline survey")
        self.training = Training.objects.create(title="Census Basics", description="intro", survey=self.survey, is_active=True)
        self.training_user = get_user_model().objects.create_user(
            email="training.user@example.com",
            password="Str0ngP@ssword!",
            full_name="Survey User",
            institution="NISR",
            role="training_user",
        )
        self.training_user_profile = self.training_user.traininguserprofile
        self.training_user_profile.trainings.add(self.training)
        self.group = Group.objects.get(name="TrainingUser")
        self.training_user.groups.add(self.group)
        self.assessment = Assessment.objects.create(
            title="Census training assessment",
            assessment_type="TRAINING",
            training=self.training,
            pass_mark=70,
            duration=30,
            duration_minutes=30,
            is_published=True,
            require_access_code=True,
        )
        self.question = Question.objects.create(
            assessment=self.assessment,
            question_text="What is the capital of Rwanda?",
            question_type="single",
            marks=1,
            order=1,
        )
        Choice.objects.create(question=self.question, text="Kigali", is_correct=True)
        Choice.objects.create(question=self.question, text="Nairobi", is_correct=False)
        self.access_code = AccessCode.objects.create(
            training=self.training,
            assessment=self.assessment,
            code="ABC12345",
            created_by=self.user,
            max_uses=1,
            is_active=True,
        )

    def test_training_user_group_and_permission_flags_exist(self):
        self.assertTrue(Group.objects.filter(name="TrainingUser").exists())
        self.assertTrue(IsTrainingUser().has_permission(SimpleNamespace(user=self.training_user), None))
        self.assertTrue(IsAdminUserRole().has_permission(SimpleNamespace(user=self.user), None))

    def test_publish_training_assessment_lists_only_for_assigned_users(self):
        self.assessment.is_published = False
        self.assessment.save(update_fields=["is_published"])
        publish_request = APIRequestFactory().post(
            f"/api/assessments/training/{self.assessment.id}/publish/",
            {"is_published": True},
            format="json",
        )
        force_authenticate(publish_request, user=self.user)
        publish_response = PublishTrainingAssessmentAPIView.as_view()(publish_request, assessment_id=self.assessment.id)
        self.assertEqual(publish_response.status_code, 200, publish_response.data)
        self.assessment.refresh_from_db()
        self.assertTrue(self.assessment.is_published)
        self.assertIsNotNone(self.assessment.published_at)

        other_survey = Survey.objects.create(name="Other training survey")
        other_training = Training.objects.create(title="Other program", survey=other_survey)
        other_assessment = Assessment.objects.create(
            title="Other published assessment",
            assessment_type="TRAINING",
            training=other_training,
            is_published=True,
        )
        listing_request = APIRequestFactory().get("/api/assessments/training/my-assessments/")
        force_authenticate(listing_request, user=self.training_user)
        listing_response = MyTrainingAssessmentsAPIView.as_view()(listing_request)
        listed_ids = [entry["id"] for entry in listing_response.data["data"]]
        self.assertEqual(listing_response.status_code, 200)
        self.assertIn(self.assessment.id, listed_ids)
        self.assertNotIn(other_assessment.id, listed_ids)

    def test_training_assessment_list_includes_latest_attempt_status(self):
        in_progress_assessment = self.assessment
        completed_assessment = Assessment.objects.create(
            title="Completed training assessment",
            assessment_type="TRAINING",
            training=self.training,
            is_published=True,
        )
        Attempt.objects.create(
            student=self.training_user,
            assessment=in_progress_assessment,
            is_submitted=True,
            submitted_at=timezone.now() - timedelta(minutes=5),
        )
        Attempt.objects.create(
            student=self.training_user,
            assessment=in_progress_assessment,
            is_submitted=False,
        )
        Attempt.objects.create(
            student=self.training_user,
            assessment=completed_assessment,
            is_submitted=True,
            submitted_at=timezone.now(),
        )

        request = APIRequestFactory().get("/api/assessments/training/my-assessments/")
        force_authenticate(request, user=self.training_user)
        response = MyTrainingAssessmentsAPIView.as_view()(request)
        status_by_id = {entry["id"]: entry["status"] for entry in response.data["data"]}

        self.assertEqual(response.status_code, 200)
        self.assertEqual(status_by_id[in_progress_assessment.id], "in_progress")
        self.assertEqual(status_by_id[completed_assessment.id], "completed")

    def test_training_assessment_cannot_publish_without_questions(self):
        empty_assessment = Assessment.objects.create(
            title="Empty training assessment",
            assessment_type="TRAINING",
            training=self.training,
        )
        request = APIRequestFactory().post(
            f"/api/assessments/training/{empty_assessment.id}/publish/",
            {"is_published": True},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = PublishTrainingAssessmentAPIView.as_view()(request, assessment_id=empty_assessment.id)
        self.assertEqual(response.status_code, 400)
        empty_assessment.refresh_from_db()
        self.assertFalse(empty_assessment.is_published)

    def test_admin_can_assign_training_program_to_training_user(self):
        request = APIRequestFactory().put(
            f"/api/assessments/training/{self.assessment.id}/users/",
            {"user_ids": [self.training_user.id]},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = TrainingAssessmentUsersAPIView.as_view()(request, assessment_id=self.assessment.id)

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(self.training_user.traininguserprofile.trainings.filter(id=self.training.id).exists())

        learner_request = APIRequestFactory().get("/api/assessments/training/my-assessments/")
        force_authenticate(learner_request, user=self.training_user)
        learner_response = MyTrainingAssessmentsAPIView.as_view()(learner_request)
        visible_ids = [entry["id"] for entry in learner_response.data["data"]]
        self.assertEqual(learner_response.status_code, 200)
        self.assertIn(self.assessment.id, visible_ids)

    def test_superadmin_can_assign_training_user_from_another_institution(self):
        other_institution_user = get_user_model().objects.create_user(
            email="rdb.training.user@example.com",
            password="Str0ngP@ssword!",
            full_name="RDB Training User",
            institution="RDB",
            role="training_user",
        )
        regular_admin_request = APIRequestFactory().get(
            f"/api/assessments/training/{self.assessment.id}/users/"
        )
        force_authenticate(regular_admin_request, user=self.user)
        regular_admin_response = TrainingAssessmentUsersAPIView.as_view()(
            regular_admin_request,
            assessment_id=self.assessment.id,
        )
        self.assertNotIn(
            other_institution_user.id,
            [user["id"] for user in regular_admin_response.data["data"]],
        )

        self.user.is_superuser = True
        self.user.save()
        superadmin_request = APIRequestFactory().put(
            f"/api/assessments/training/{self.assessment.id}/users/",
            {"user_ids": [other_institution_user.id]},
            format="json",
        )
        force_authenticate(superadmin_request, user=self.user)
        superadmin_response = TrainingAssessmentUsersAPIView.as_view()(
            superadmin_request,
            assessment_id=self.assessment.id,
        )

        self.assertEqual(superadmin_response.status_code, 200, superadmin_response.data)
        self.assertTrue(other_institution_user.traininguserprofile.trainings.filter(id=self.training.id).exists())

    def test_training_start_attempt_requires_valid_code_and_assignment(self):
        request = APIRequestFactory().post(
            "/api/assessments/1/start-attempt/",
            {"assessment_id": self.assessment.id, "access_code": self.access_code.code},
            format="json",
        )
        force_authenticate(request, user=self.training_user)

        response = StartAttemptAPIView.as_view()(request, assessment_id=self.assessment.id)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["data"]["assessment"], self.assessment.id)
        self.assertIsNotNone(response.data["data"].get("expires_at"))
        self.assertNotIn("is_correct", response.data["data"]["question_snapshot"][0]["choices"][0])

        other_user = get_user_model().objects.create_user(
            email="other@example.com",
            password="Str0ngP@ssword!",
            full_name="Other User",
            institution="NISR",
        )
        request = APIRequestFactory().post(
            "/api/assessments/1/start-attempt/",
            {"assessment_id": self.assessment.id, "access_code": self.access_code.code},
            format="json",
        )
        force_authenticate(request, user=other_user)
        response = StartAttemptAPIView.as_view()(request, assessment_id=self.assessment.id)
        self.assertEqual(response.status_code, 403)

    def test_training_assessment_update_accepts_training_id(self):
        request = APIRequestFactory().patch(
            f"/api/assessments/{self.assessment.id}/update/",
            {
                "training": self.training.id,
                "title": "Updated census training assessment",
                "require_access_code": True,
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = UpdateAssessmentAPIView.as_view()(request, assessment_id=self.assessment.id)

        self.assertEqual(response.status_code, 200, response.data)
        self.assessment.refresh_from_db()
        self.access_code.refresh_from_db()
        self.assertEqual(self.assessment.training_id, self.training.id)
        self.assertEqual(self.assessment.title, "Updated census training assessment")
        self.assertEqual(self.access_code.training_id, self.training.id)

    def test_training_start_attempt_reports_missing_access_code(self):
        request = APIRequestFactory().post(
            f"/api/assessments/{self.assessment.id}/start-attempt/",
            {},
            format="json",
        )
        force_authenticate(request, user=self.training_user)

        response = StartAttemptAPIView.as_view()(request, assessment_id=self.assessment.id)

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data["message"], "Access code is required for this training assessment.")

    def test_training_creation_persists_access_code(self):
        request = APIRequestFactory().post(
            "/api/assessments/create/",
            {
                "assessment_type": "TRAINING",
                "title": "Census access code training",
                "training": self.training.id,
                "pass_mark": 70,
                "duration": 30,
                "require_access_code": True,
                "access_code": "CENSUS1",
                "descriptions": "Requires access code.",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CreateAssessmentAPIView.as_view()(request)
        self.assertEqual(response.status_code, 201, response.data)
        access_code = AccessCode.objects.get(code="CENSUS1")
        self.assertEqual(access_code.max_uses, 0)
        self.assertTrue(access_code.is_valid()[0])

    def test_duplicate_training_access_code_does_not_create_assessment(self):
        assessment_count = Assessment.objects.count()
        request = APIRequestFactory().post(
            "/api/assessments/create/",
            {
                "assessment_type": "TRAINING",
                "title": "Duplicate access code training",
                "training": self.training.id,
                "require_access_code": True,
                "access_code": self.access_code.code,
            },
            format="json",
        )
        force_authenticate(request, user=self.user)

        response = CreateAssessmentAPIView.as_view()(request)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Assessment.objects.count(), assessment_count)
        self.assertEqual(AccessCode.objects.filter(code=self.access_code.code).count(), 1)

    def test_access_code_validation_checks_expired_and_exhausted_state(self):
        self.access_code.is_active = False
        self.access_code.save(update_fields=["is_active"])
        ok, message = self.access_code.is_valid()
        self.assertFalse(ok)
        self.assertIn("inactive", message.lower())

        self.access_code.is_active = True
        self.access_code.expires_at = timezone.now() - timedelta(minutes=5)
        self.access_code.save(update_fields=["is_active", "expires_at"])
        ok, message = self.access_code.is_valid()
        self.assertFalse(ok)
        self.assertIn("expired", message.lower())

        self.access_code.expires_at = None
        self.access_code.max_uses = 1
        self.access_code.used_count = 1
        self.access_code.save(update_fields=["expires_at", "max_uses", "used_count"])
        ok, message = self.access_code.is_valid()
        self.assertFalse(ok)
        self.assertIn("used", message.lower())


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
            course=self.course,
            assessment=self.assessment,
            attempt_number=Attempt.objects.filter(
                student=self.user,
                course=self.course,
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
        now = timezone.now() - timedelta(minutes=1)
        for i in range(3):
            self._create_submitted_attempt(now - timedelta(seconds=i))

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
            title="Shared Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True
        )
        shared_assessment.courses.add(self.course, other_course)
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


class AssessmentSnapshotTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(email="snapshot-student@example.com", password="Str0ngP@ssword!")
        self.later_user = get_user_model().objects.create_user(email="later-student@example.com", password="Str0ngP@ssword!")
        self.course = Course.objects.create(
            title="Snapshot Course",
            description="Course with versioned assessment behavior.",
            duration="1h",
            is_published=True,
        )
        for user in (self.user, self.later_user):
            Enrollment.objects.create(student=user, course=self.course, status=Enrollment.Status.ACTIVE)
        self.assessment = Assessment.objects.create(
            course=self.course,
            title="Versioned Final",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True,
        )
        self.question = Question.objects.create(
            assessment=self.assessment,
            question_text="Old question",
            question_type="single",
            order=1,
        )
        Choice.objects.create(question=self.question, text="Old answer", is_correct=True)

    def _start(self, user):
        request = APIRequestFactory().post(
            f"/assessments/{self.assessment.id}/start-attempt/",
            {"course_id": self.course.id},
            format="json",
        )
        force_authenticate(request, user=user)
        return StartAttemptAPIView.as_view()(request, assessment_id=self.assessment.id)

    def test_retake_keeps_old_snapshot_and_later_student_gets_new_snapshot(self):
        first_response = self._start(self.user)
        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(first_response.data["data"]["question_snapshot"][0]["question_text"], "Old question")

        first_attempt = Attempt.objects.get(id=first_response.data["data"]["id"])
        first_attempt.is_submitted = True
        first_attempt.save(update_fields=["is_submitted"])
        self.question.question_text = "Updated question"
        self.question.save(update_fields=["question_text"])

        retake_response = self._start(self.user)
        later_response = self._start(self.later_user)

        self.assertEqual(retake_response.status_code, 200)
        self.assertEqual(later_response.status_code, 200)
        self.assertEqual(retake_response.data["data"]["question_snapshot"][0]["question_text"], "Old question")
        self.assertEqual(later_response.data["data"]["question_snapshot"][0]["question_text"], "Updated question")



    def test_course_specific_failed_attempt_does_not_block_other_course(self):
        other_course = Course.objects.create(
            title="Other Course",
            description="Another course using the same shared assessment.",
            duration="2h",
        )
        shared_assessment = Assessment.objects.create(
            title="Shared Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True,
        )
        shared_assessment.courses.add(self.course, other_course)
        Attempt.objects.create(
            student=self.user,
            course=self.course,
            assessment=shared_assessment,
            attempt_number=1,
            is_submitted=True,
            is_passed=False,
            submitted_at=timezone.now(),
        )

        self.assertTrue(check_attempt_limit(self.user, shared_assessment, course=other_course))

    def test_course_specific_cooldown_does_not_block_other_course(self):
        other_course = Course.objects.create(
            title="Other Course",
            description="Another course using the same shared assessment.",
            duration="2h",
        )
        shared_assessment = Assessment.objects.create(
            title="Shared Final Assessment",
            assessment_type="FINAL",
            pass_mark=70,
            max_attempts=3,
            duration=30,
            is_published=True,
        )
        shared_assessment.courses.add(self.course, other_course)
        now = timezone.now()
        for attempt_number in range(1, 4):
            Attempt.objects.create(
                student=self.user,
                course=self.course,
                assessment=shared_assessment,
                attempt_number=attempt_number,
                is_submitted=True,
                submitted_at=now,
            )

        self.assertTrue(check_attempt_limit(self.user, shared_assessment, course=other_course))
