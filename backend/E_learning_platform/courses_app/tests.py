from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Course, Level


class CourseVisibilityTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            email="admin@example.com",
            password="password",
            full_name="Admin User",
            institution="Acme",
            role="admin",
        )
        self.instructor = User.objects.create_user(
            email="instructor@example.com",
            password="password",
            full_name="Instructor User",
            institution="Acme",
            role="instructor",
        )
        self.viewer = User.objects.create_user(
            email="viewer@example.com",
            password="password",
            full_name="Viewer User",
            institution="Acme",
            role="viewer",
        )
        self.superuser = User.objects.create_superuser(
            email="super@example.com",
            password="password",
            full_name="Super User",
            institution="Acme",
        )

        self.category = Category.objects.create(name="Development")
        self.level = Level.objects.create(name="Beginner")
        self.admin_course = self.create_course("Admin Course", self.admin)
        self.instructor_course = self.create_course("Instructor Course", self.instructor)
        self.other_instructor_course = self.create_course(
            "Other Instructor Course",
            User.objects.create_user(
                email="other@example.com",
                password="password",
                full_name="Other Instructor",
                institution="Acme",
                role="instructor",
            ),
        )
        self.url = reverse("course-list")

    def create_course(self, title, creator):
        return Course.objects.create(
            title=title,
            description=f"{title} description",
            duration="1 hour",
            category=self.category,
            level=self.level,
            created_by=creator,
            is_published=False,
        )

    def list_course_titles_for(self, user):
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return {course["title"] for course in response.data}

    def test_instructor_only_sees_courses_they_created(self):
        self.assertEqual(
            self.list_course_titles_for(self.instructor),
            {"Instructor Course"},
        )

    def test_admin_viewer_and_superuser_see_all_courses(self):
        expected_titles = {
            "Admin Course",
            "Instructor Course",
            "Other Instructor Course",
        }

        self.assertEqual(self.list_course_titles_for(self.admin), expected_titles)
        self.assertEqual(self.list_course_titles_for(self.viewer), expected_titles)
        self.assertEqual(self.list_course_titles_for(self.superuser), expected_titles)

    def test_instructor_cannot_open_another_users_unpublished_course(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(reverse("course-detail", args=[self.admin_course.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_can_open_their_own_unpublished_course(self):
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(reverse("course-detail", args=[self.instructor_course.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
