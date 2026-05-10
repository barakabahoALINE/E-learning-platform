from django.core.exceptions import ValidationError


def validate_assessment_module_relationship(instance):

    """
    RULES:
    - Quiz must belong to module
    - Final assessment must not belong to module
    - Only ONE final assessment per course
    - Only ONE quiz per module
    """

    # =========================================
    # FINAL ASSESSMENT RULES
    # =========================================
    if instance.is_final:

        # Final should not have module
        if instance.module:
            raise ValidationError(
                "Final assessment should not have module."
            )

        # Only one final assessment per course
        existing_final = instance.__class__.objects.filter(
            course=instance.course,
            is_final=True
        ).exclude(id=instance.id)

        if existing_final.exists():
            raise ValidationError(
                "This course already has a final assessment."
            )

    # =========================================
    # QUIZ RULES
    # =========================================
    else:

        # Quiz must belong to module
        if not instance.module:
            raise ValidationError(
                "Quiz must belong to a module."
            )

        # Only one quiz per module
        existing_quiz = instance.__class__.objects.filter(
            module=instance.module,
            is_final=False
        ).exclude(id=instance.id)

        if existing_quiz.exists():
            raise ValidationError(
                "This module already has a quiz."
            )