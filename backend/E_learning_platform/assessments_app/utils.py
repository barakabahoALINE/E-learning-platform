from enrollments_app.models import Enrollment
from progress_app.models import ModuleProgress


def is_student_enrolled(user, course):
    return Enrollment.objects.filter(
        student=user,
        course=course,
        status=Enrollment.Status.ACTIVE
    ).exists()


def has_completed_module(user, module):
    return ModuleProgress.objects.filter(
        student=user,
        module=module,
        completed=True
    ).exists()


def has_completed_all_modules(user, course):
    total_modules = course.modules.count()

    completed_modules = ModuleProgress.objects.filter(
        student=user,
        module__course=course,
        completed=True
    ).count()

    return total_modules > 0 and total_modules == completed_modules
