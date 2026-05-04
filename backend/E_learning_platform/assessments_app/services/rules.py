from datetime import timedelta
from django.utils import timezone
from assessments_app.models import Attempt
from progress_app.models import LessonProgress
from courses_app.models import Course


PASS_SCORE = 70
MAX_ATTEMPTS = 3
COOLDOWN_HOURS = 24
INACTIVITY_MINUTES = 5

class RuleError(Exception):
    def __init__(self, message):
        self.message = message


# ✅ 1. CHECK COURSE COMPLETION (FINAL ONLY)
def check_course_completion(student, course):
    total_lessons = course.lessons.count()
    completed_lessons = LessonProgress.objects.filter(
        student=student,
        lesson__course=course,
        completed=True
    ).count()

    if total_lessons != completed_lessons:
        raise RuleError("Complete all lessons before final assessment.")


# ✅ 2. CHECK ATTEMPT LIMIT + COOLDOWN
def check_attempt_limit(student, assessment):
    attempts = Attempt.objects.filter(
        student=student,
        assessment=assessment
    ).order_by("started_at")

    # Already passed
    if attempts.filter(passed=True).exists():
        raise RuleError("You already passed this assessment.")

    if attempts.count() < MAX_ATTEMPTS:
        return

    last_attempt = attempts.last()

    if not last_attempt.is_submitted:
        return

    cooldown_end = last_attempt.submitted_at + timedelta(hours=COOLDOWN_HOURS)

    if timezone.now() < cooldown_end:
        raise RuleError("Wait 24 hours before retrying.")

    # Reset attempts after cooldown
    attempts.delete()


# ✅ 3. CHECK / LOCK / AUTO-SUBMIT
def handle_attempt_state(attempt):
    now = timezone.now()

    # ⏱ TIME LIMIT
    end_time = attempt.started_at + timedelta(minutes=attempt.assessment.time_limit_minutes)

    if now >= end_time and not attempt.is_submitted:
        attempt.is_submitted = True
        attempt.submitted_at = now
        attempt.save()
        return "submitted"

    # ⛔ INACTIVITY
    if (
        not attempt.is_locked and
        not attempt.is_submitted and
        now - attempt.started_at > timedelta(minutes=INACTIVITY_MINUTES)
    ):
        attempt.is_locked = True
        attempt.save()
        return "locked"

    return "active"


# ✅ 4. LOCK ON LOGOUT (manual call)
def lock_attempt(attempt):
    attempt.is_locked = True
    attempt.save()


# ✅ 5. FINAL SUCCESS ACTION (after Dev2 submission)
def handle_passed_assessment(attempt):
    if attempt.passed:
        course = attempt.assessment.course

        # mark course completed (you can have a model for this)
        attempt.enrollment.status = "completed"
        attempt.enrollment.save()

# 6. ADMIN UNLOCK ATTEMPT
def unlock_attempt(attempt, admin_user):
    """
    Admin unlocks a locked attempt.
    """

    # ✅ Only admin allowed
    if admin_user.role != "admin":
        raise RuleError("Only admin can unlock attempts.")

    # ✅ Must be locked
    if not attempt.is_locked:
        raise RuleError("Attempt is not locked.")

    # ✅ Cannot unlock submitted attempt
    if attempt.is_submitted:
        raise RuleError("Cannot unlock a submitted attempt.")

    attempt.is_locked = False
    attempt.save()

    return attempt