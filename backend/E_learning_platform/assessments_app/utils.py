from enrollments_app.models import Enrollment
from progress_app.models import ModuleProgress, SectionProgress
from courses_app.models import Section


def is_student_enrolled(user, course):
    return Enrollment.objects.filter(
        student=user,
        course=course,
        status__in=[
            Enrollment.Status.ACTIVE,
            Enrollment.Status.COMPLETED
        ]
    ).exists()



def has_completed_module_sections(user, module):

    total_sections = Section.objects.filter(
        module=module
    ).count()

    completed_sections = SectionProgress.objects.filter(
        student=user,
        section__module=module,
        completed=True
    ).count()

    return (
        total_sections > 0 and
        total_sections == completed_sections
    )


def has_completed_all_modules(user, course):
    total_modules = course.modules.count()

    completed_modules = ModuleProgress.objects.filter(
        student=user,
        module__course=course,
        completed=True
    ).count()

    return total_modules > 0 and total_modules == completed_modules
