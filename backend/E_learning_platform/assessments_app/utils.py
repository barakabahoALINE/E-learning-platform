from enrollments_app.models import Enrollment

def is_student_enrolled(user, course):
    return Enrollment.objects.filter(
        student=user,
        course=course,
        status=Enrollment.Status.ACTIVE
    ).exists()