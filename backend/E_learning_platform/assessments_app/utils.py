from enrollments_app.models import Enrollment
from courses_app.models import Lesson
from progress_app.models import LessonProgress

def is_student_enrolled(user, course):
    return Enrollment.objects.filter(
        student=user,
        course=course,
        status=Enrollment.Status.ACTIVE
    ).exists()
    

def has_completed_all_lessons(user, course):
    enrollment = Enrollment.objects.filter(
        student=user,
        course=course
    ).first()

    if not enrollment:
        return False

    total_lessons = Lesson.objects.filter(course=course).count()

    completed_lessons = LessonProgress.objects.filter(
        student=user,
        lesson__course=course,
        enrollment=enrollment,
        completed=True
    ).count()

    print("TOTAL:", total_lessons)
    print("COMPLETED:", completed_lessons)

    return total_lessons > 0 and completed_lessons == total_lessons