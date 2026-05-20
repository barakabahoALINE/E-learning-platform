from enrollments_app.models import Enrollment
from progress_app.models import ModuleProgress, SectionProgress


def is_student_enrolled(user, course):
    return Enrollment.objects.filter(
        student=user,
        course=course,
        status__in=[
            Enrollment.Status.ACTIVE,
            Enrollment.Status.COMPLETED
        ]
    ).exists()


def has_completed_module(user, module):
    total_sections = module.sections.count()

    if total_sections == 0:
        return False

    completed_sections = SectionProgress.objects.filter(
        student=user,
        section__module=module,
        completed=True
    ).count()

    return completed_sections == total_sections


def has_completed_all_modules(user, course):
    total_modules = course.modules.count()

    completed_modules = ModuleProgress.objects.filter(
        student=user,
        module__course=course,
        completed=True
    ).count()

    return total_modules > 0 and total_modules == completed_modules
