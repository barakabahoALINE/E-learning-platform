from django.test import TestCase

from courses_app.models import Course, Module
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
