from datetime import timedelta
from django.utils import timezone

from progress_app.models import SectionProgress
from assessments_app.models import Assessment, Attempt
from courses_app.models import Module


COOLDOWN_HOURS = 24


class RuleError(Exception):

    def __init__(self, message):
        self.message = message
        super().__init__(message)


# FINAL ASSESSMENT RULE
def check_course_completion(user, course):

    incomplete = SectionProgress.objects.filter(
        student=user,
        section__module__course=course,
        completed=False
    ).exists()

    if incomplete:
        raise RuleError(
            "Complete all sections before attempting final assessment."
        )


# ATTEMPT LIMIT RULE
def check_attempt_limit(user, assessment):

    # QUIZ = unlimited attempts
    if assessment.assessment_type == "QUIZ":
        return True

    attempts = Attempt.objects.filter(
        student=user,
        assessment=assessment
    ).order_by("-attempt_number")

    if not attempts.exists():
        return True

    last_attempt = attempts.first()

    if not last_attempt.is_submitted:
        return True

    if attempts.count() >= assessment.max_attempts:
        raise RuleError(
            "Maximum attempts reached for this assessment."
        )

    cooldown_end = (
        last_attempt.submitted_at +
        timedelta(hours=COOLDOWN_HOURS)
    )

    if timezone.now() < cooldown_end:

        remaining = cooldown_end - timezone.now()

        hours = int(remaining.total_seconds() // 3600)

        minutes = int(
            (remaining.total_seconds() % 3600) // 60
        )

        raise RuleError(
            f"Next attempt allowed in {hours}h {minutes}m."
        )

    return True


# HANDLE ATTEMPT STATE
def handle_attempt_state(attempt):

    if attempt.is_locked:
        return "locked"

    if attempt.is_submitted:
        return "submitted"

    duration_minutes = attempt.assessment.duration

    expiration_time = (
        attempt.started_at +
        timedelta(minutes=duration_minutes)
    )

    if timezone.now() > expiration_time:

        attempt.is_locked = True
        attempt.is_submitted = True
        attempt.submitted_at = timezone.now()

        attempt.save()

        return "submitted"

    return "active"


# ADMIN UNLOCK
def unlock_attempt(attempt, user):

    if getattr(user, "role", None) != "admin" and not user.is_staff:
        raise RuleError("Only admins can unlock attempts.")

    attempt.is_locked = False
    attempt.save()

    return attempt


# GET PREVIOUS MODULE
def get_previous_module(module):

    return Module.objects.filter(
        course=module.course,
        order__lt=module.order
    ).order_by("-order").first()


# QUIZ ACCESS RULE
def can_access_module(user, module):

    previous_module = get_previous_module(module)

    # first module
    if not previous_module:
        return True

    quiz = Assessment.objects.filter(
        module=previous_module,
        assessment_type="QUIZ"
    ).first()

    # no quiz
    if not quiz:
        return True

    passed = Attempt.objects.filter(
        student=user,
        assessment=quiz,
        passed=True
    ).exists()

    return passed