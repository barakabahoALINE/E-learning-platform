from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from courses_app.models import Course, Module
from .models import Assessment, Attempt
from .services.rules import RuleError, check_attempt_limit
from .serializers import CreateAssessmentSerializer


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
