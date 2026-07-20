from django.contrib.auth.models import Permission
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from courses_app.models import Course
from users_app.models import User


class CourseVisibilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.permission = Permission.objects.get(
            codename="view_published_course",
            content_type__app_label="courses_app",
        )

        self.student = User.objects.create_user(
            email="student@example.com",
            password="testpass123",
            full_name="Student User",
            institution="Institution-A",
            role="student",
        )
        self.student.user_permissions.add(self.permission)

        self.instructor = User.objects.create_user(
            email="instructor@example.com",
            password="testpass123",
            full_name="Instructor User",
            institution="Institution-B",
            role="instructor",
        )
        self.instructor.user_permissions.add(self.permission)

        self.course = Course.objects.create(
            title="Published Course",
            description="Visible to students",
            duration="4 weeks",
            price=0.0,
            created_by=self.instructor,
            is_published=True,
        )

    def test_student_can_view_published_course_from_other_institution(self):
        self.client.force_authenticate(self.student)
        response = self.client.get(reverse("course-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.course.id)
