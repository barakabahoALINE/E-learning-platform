from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from assessments_app.models import Assessment, Attempt
from .models import Course
from .views import CourseDeleteAPIView, PublishCourseChangesAPIView


class CourseDeleteTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create(
            email="course-delete-admin@example.com",
            full_name="Course Delete Admin",
            institution="Test Institution",
            is_superuser=True,
        )

    def test_deleting_draft_course_removes_its_attempts(self):
        course = Course.objects.create(
            title="Draft Course",
            description="Course used by the delete endpoint test.",
            duration="1h",
        )
        assessment = Assessment.objects.create(
            course=course,
            title="Course Assessment",
            assessment_type="QUIZ",
        )
        attempt = Attempt.objects.create(
            student=self.user,
            course=course,
            assessment=assessment,
        )

        request = APIRequestFactory().delete(f"/api/courses/{course.pk}/delete/")
        force_authenticate(request, user=self.user)
        response = CourseDeleteAPIView.as_view()(request, pk=course.pk)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Course.objects.filter(pk=course.pk).exists())
        self.assertFalse(Attempt.objects.filter(pk=attempt.pk).exists())
        assessment.refresh_from_db()
        self.assertIsNone(assessment.course_id)

    def test_publishing_pending_course_deletion_removes_its_attempts(self):
        course = Course.objects.create(
            title="Published Course",
            description="Course used by the publish-delete endpoint test.",
            duration="1h",
            is_published=True,
            pending_delete=True,
        )
        assessment = Assessment.objects.create(
            course=course,
            title="Final Assessment",
            assessment_type="FINAL",
        )
        attempt = Attempt.objects.create(
            student=self.user,
            course=course,
            assessment=assessment,
        )

        request = APIRequestFactory().post(
            f"/api/courses/{course.pk}/publish-changes/",
            {"confirm": True},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = PublishCourseChangesAPIView.as_view()(request, course_id=course.pk)

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Course.objects.filter(pk=course.pk).exists())
        self.assertFalse(Attempt.objects.filter(pk=attempt.pk).exists())
