from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from courses_app.models import Course, Module, Section, Content
from enrollments_app.models import Enrollment
from .models import LearningSession, ContentProgress, CourseProgress
import datetime
from unittest.mock import patch


class WeeklyKPIBehaviorTests(TestCase):
	def setUp(self):
		User = get_user_model()
		# create a superuser so permission checks pass
		self.user = User.objects.create_superuser(
			email="tester@example.com",
			password="testpass",
			full_name="Tester",
			institution="TestInst",
		)

		# create a simple course and enrollment
		self.course = Course.objects.create(title="T1", description="d", duration="1h", price=0)
		self.enrollment = Enrollment.objects.create(student=self.user, course=self.course)

		self.client = APIClient()
		self.client.force_authenticate(user=self.user)

	def test_active_session_started_on_saturday_not_counted_on_sunday(self):
		# Saturday 2026-06-27 10:00 local
		tz = timezone.get_current_timezone()
		saturday = timezone.make_aware(datetime.datetime(2026, 6, 27, 10, 0, 0), tz)

		LearningSession.objects.create(
			student=self.user,
			course=self.course,
			enrollment=self.enrollment,
			started_at=saturday,
			is_active=True,
		)

		# Simulate server time on Sunday 2026-06-28
		sunday_now = timezone.make_aware(datetime.datetime(2026, 6, 28, 12, 0, 0), tz)
		with patch('django.utils.timezone.now', return_value=sunday_now):
			resp = self.client.get('/api/progress/kpi/learning-hours/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json().get('data', {})
		weekly = data.get('weekly_totals', [])
		# current week (index 0) must be 0 hours since session started before week
		self.assertTrue(len(weekly) > 0)
		self.assertEqual(weekly[0].get('hours'), 0)

	def test_session_spanning_saturday_to_sunday_is_split_between_weeks(self):
		tz = timezone.get_current_timezone()
		# session starts Saturday 23:30 and ends Sunday 00:30
		started = timezone.make_aware(datetime.datetime(2026, 6, 27, 23, 30, 0), tz)
		ended = timezone.make_aware(datetime.datetime(2026, 6, 28, 0, 30, 0), tz)

		LearningSession.objects.create(
			student=self.user,
			course=self.course,
			enrollment=self.enrollment,
			started_at=started,
			ended_at=ended,
			is_active=False,
		)

		sunday_now = timezone.make_aware(datetime.datetime(2026, 6, 28, 12, 0, 0), tz)
		with patch('django.utils.timezone.now', return_value=sunday_now):
			resp = self.client.get('/api/progress/kpi/learning-hours/')
		self.assertEqual(resp.status_code, 200)
		data = resp.json().get('data', {})
		weekly = data.get('weekly_totals', [])
		# 30 minutes in current week => 0.5 hours
		self.assertTrue(len(weekly) > 0)
		self.assertAlmostEqual(weekly[0].get('hours'), round(30 / 60, 2))

	def test_multiple_weeks_appear_in_weekly_totals(self):
		tz = timezone.get_current_timezone()
		# Create a session in the current week (Sunday 2026-06-28)
		current_wk_dt = timezone.make_aware(datetime.datetime(2026, 6, 28, 9, 0, 0), tz)
		LearningSession.objects.create(
			student=self.user,
			course=self.course,
			enrollment=self.enrollment,
			started_at=current_wk_dt,
			ended_at=timezone.make_aware(datetime.datetime(2026, 6, 28, 10, 0, 0), tz),
			is_active=False,
		)

		# Create a session in the previous week (one week before)
		prev_wk_dt = timezone.make_aware(datetime.datetime(2026, 6, 21, 9, 0, 0), tz)
		LearningSession.objects.create(
			student=self.user,
			course=self.course,
			enrollment=self.enrollment,
			started_at=prev_wk_dt,
			ended_at=timezone.make_aware(datetime.datetime(2026, 6, 21, 10, 0, 0), tz),
			is_active=False,
		)

		sunday_now = timezone.make_aware(datetime.datetime(2026, 6, 28, 12, 0, 0), tz)
		with patch('django.utils.timezone.now', return_value=sunday_now):
			resp = self.client.get('/api/progress/kpi/learning-hours/?weeks=3')
		self.assertEqual(resp.status_code, 200)
		data = resp.json().get('data', {})
		weekly = data.get('weekly_totals', [])
		# index 0 is current week, index 1 is previous week
		self.assertTrue(len(weekly) >= 2)
		self.assertAlmostEqual(weekly[0].get('hours'), 1.0)  # 1 hour this week
		self.assertAlmostEqual(weekly[1].get('hours'), 1.0)  # 1 hour previous week

	def test_course_progress_includes_quizzes_and_final_assessment(self):
		"""Test that course progress includes content, quizzes, and final assessment as items."""
		from assessments_app.models import Assessment, Attempt
		
		course = Course.objects.create(title='Content Progress Course', description='d', duration='1h', price=0, is_published=True)
		module = Module.objects.create(course=course, title='Module 1', order=1, is_published=True)
		section = Section.objects.create(module=module, title='Section 1', order=1, is_published=True)
		content_one = Content.objects.create(section=section, title='Content 1', content_type='text', order=1, is_published=True)
		content_two = Content.objects.create(section=section, title='Content 2', content_type='video', order=2, is_published=True)
		
		# Create a quiz assessment for the module
		quiz = Assessment.objects.create(
			course=course,
			module=module,
			title='Module Quiz',
			assessment_type='QUIZ',
			is_published=True,
			pass_mark=60,
		)
		
		# Create a final assessment for the course
		final_assessment = Assessment.objects.create(
			course=course,
			title='Final Assessment',
			assessment_type='FINAL',
			is_published=True,
			pass_mark=60,
		)
		
		# Initially: 4 total items (2 content + 1 quiz + 1 final)
		# 0 completed => 0%
		course_progress = CourseProgress.objects.filter(student=self.user, course=course).first()
		if not course_progress:
			# Trigger creation by marking content
			ContentProgress.objects.create(
				student=self.user,
				content=content_one,
				enrollment=self.enrollment,
				completed=False,
			)
		
		# Now, with 1 content item completed out of 4 total items: 25%
		ContentProgress.objects.filter(student=self.user, content=content_one).update(completed=True)
		from progress_app.models import _refresh_course_progress
		_refresh_course_progress(self.user, course, self.enrollment)
		
		course_progress = CourseProgress.objects.get(student=self.user, course=course)
		self.assertEqual(course_progress.progress_percentage, 25.0)
		
		# Mark second content as completed: 2/4 = 50%
		ContentProgress.objects.create(
			student=self.user,
			content=content_two,
			enrollment=self.enrollment,
			completed=True,
		)
		_refresh_course_progress(self.user, course, self.enrollment)
		
		course_progress = CourseProgress.objects.get(student=self.user, course=course)
		self.assertEqual(course_progress.progress_percentage, 50.0)
		self.assertFalse(course_progress.completed)  # Not completed yet - quiz and final still pending


