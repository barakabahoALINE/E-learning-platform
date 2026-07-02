from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from courses_app.models import Course
from enrollments_app.models import Enrollment
from .models import LearningSession
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

