from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from courses_app.models import Course
from enrollments_app.models import Enrollment
from users_app.models import User


class MyEnrollmentsAPIViewTests(APITestCase):
    def setUp(self):
        self.student = User.objects.create_user(
            email="student@example.com",
            password="StrongPass123",
            full_name="Student User",
            institution="Test Institute",
            role="student",
        )

        self.course_one = Course.objects.create(
            title="First Course",
            description="A course",
            duration="4 weeks",
            is_published=True,
            created_by=self.student,
        )
        self.course_two = Course.objects.create(
            title="Second Course",
            description="Another course",
            duration="6 weeks",
            is_published=True,
            created_by=self.student,
        )

        Enrollment.objects.create(
            student=self.student,
            course=self.course_one,
            status=Enrollment.Status.ACTIVE,
            enrolled_at=timezone.now() - timedelta(days=2),
        )
        Enrollment.objects.create(
            student=self.student,
            course=self.course_two,
            status=Enrollment.Status.ACTIVE,
            enrolled_at=timezone.now() - timedelta(days=1),
        )

    def test_recent_in_progress_course_is_returned_for_student(self):
        self.client.force_authenticate(user=self.student)

        response = self.client.get(reverse("my-enrollments"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("recent_in_progress_course", response.data)
        self.assertEqual(
            response.data["recent_in_progress_course"]["course"],
            self.course_two.id,
        )
        self.assertEqual(
            response.data["recent_in_progress_course"]["course_title"],
            self.course_two.title,
        )
