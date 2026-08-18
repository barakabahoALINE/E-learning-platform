from datetime import timedelta
from django.utils import timezone

from progress_app.models import SectionProgress
from assessments_app.models import Assessment, Attempt
from courses_app.models import Module


COOLDOWN_HOURS = 0.0333

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
def check_attempt_limit(user, assessment, course=None):

    if course is None:
        course = getattr(assessment, "course", None)

    # QUIZ = unlimited attempts
    if assessment.assessment_type == "QUIZ":
        return True

    # FINAL: if already passed in this course, don't allow any more attempts
    if assessment.assessment_type == "FINAL":
        if Attempt.objects.filter(
            student=user,
            assessment=assessment,
            course=course,
            is_submitted=True,
            is_passed=True
        ).exists():
            raise RuleError(
                "Final assessment already passed. No further attempts allowed."
            )

    submitted_attempts = Attempt.objects.filter(
        student=user,
        assessment=assessment,
        course=course,
        is_submitted=True
    ).order_by("-submitted_at")

    if not submitted_attempts.exists():
        return True

    total_attempts = submitted_attempts.count()

    if total_attempts < assessment.max_attempts:
        return True

    if total_attempts == assessment.max_attempts:
        last_attempt = submitted_attempts.first()
        cooldown_end = last_attempt.submitted_at + timedelta(hours=COOLDOWN_HOURS)

        if timezone.now() < cooldown_end:
            remaining = cooldown_end - timezone.now()
            hours = int(remaining.total_seconds() // 3600)
            minutes = int((remaining.total_seconds() % 3600) // 60)
            raise RuleError(
                f"Next attempt allowed in {hours}h {minutes}m."
            )

        return True

    raise RuleError(
        "Final assessment limit reached. No further attempts allowed."
    )


# HANDLE ATTEMPT STATE
def handle_attempt_state(attempt):

    if attempt.is_locked:
        return "locked"

    if attempt.is_submitted:
        return "submitted"

    # QUIZ attempts are not auto-locked or auto-submitted by timeout.
    if attempt.assessment.assessment_type == "QUIZ":
        return "active"

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


def enforce_tab_switch_limit(attempt):

    if (
        attempt.assessment.assessment_type != "FINAL"
        or not attempt.assessment.tab_switch_enabled
        or attempt.assessment.tab_switch_limit is None
    ):
        return False

    if attempt.tab_switch_count > attempt.assessment.tab_switch_limit:
        attempt.is_submitted = True
        attempt.submitted_at = timezone.now()
        attempt.save(update_fields=["is_submitted", "submitted_at"])
        return True

    return False


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
        assessment_type="QUIZ",
        is_published=True
    ).first()

    # no quiz
    if not quiz:
        return True

    passed = Attempt.objects.filter(
        student=user,
        assessment=quiz,
        is_passed=True
    ).exists()

    return passed


# MODULE COMPLETION RULE
def has_passed_module_quiz(user, module):
    """
    Check if module should be considered complete for the user.
    
    Returns True if:
    - Module has NO quiz, OR
    - Module has a quiz AND user has passed it
    
    Returns False if:
    - Module has a quiz AND user has NOT passed it yet
    """
    quiz = Assessment.objects.filter(
        module=module,
        assessment_type="QUIZ",
        is_published=True
    ).first()

    # No quiz requirement - module can be completed
    if not quiz:
        return True

    # Has quiz - check if user passed it
    passed = Attempt.objects.filter(
        student=user,
        assessment=quiz,
        is_submitted=True,
        is_passed=True
    ).exists()

    return passed
# ASSESSMENT CREATION RULES

def validate_unique_assessment(assessment):

    if assessment.assessment_type == "FINAL" and assessment.course is not None:

        existing_final = Assessment.objects.filter(
            course=assessment.course,
            assessment_type="FINAL"
        )

        if assessment.pk:
            existing_final = existing_final.exclude(pk=assessment.pk)

        if existing_final.exists():
            raise RuleError(
                "Only one final assessment is allowed per course."
            )

    if assessment.assessment_type == "QUIZ" and assessment.module is not None:

        existing_quiz = Assessment.objects.filter(
            module=assessment.module,
            assessment_type="QUIZ"
        )

        if assessment.pk:
            existing_quiz = existing_quiz.exclude(pk=assessment.pk)

        if existing_quiz.exists():
            raise RuleError(
                "Only one quiz is allowed per module."
            )

    return True
def apply_assessment_rules(data):

    assessment_type = data.get("assessment_type")

    # QUIZ RULES
    if assessment_type == "QUIZ":

        # Store quiz-specific fields as safe defaults for DB writes.
        # Quiz rules bypass max_attempts and duration logic at runtime.
        data["max_attempts"] = 0
        data["duration"] = 0
        data["instructions"] = ""

    # FINAL RULES
    elif assessment_type == "FINAL":

        data["module"] = None

    return data

