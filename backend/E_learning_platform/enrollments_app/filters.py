import django_filters
from .models import Enrollment


class AdminEnrollmentFilter(django_filters.FilterSet):

    status = django_filters.ChoiceFilter(
        choices=Enrollment.Status.choices
    )

    course = django_filters.NumberFilter(field_name="course_id")
    student = django_filters.NumberFilter(field_name="student_id")

    enrolled_after = django_filters.DateTimeFilter(
        field_name="enrolled_at",
        lookup_expr="gte"
    )

    enrolled_before = django_filters.DateTimeFilter(
        field_name="enrolled_at",
        lookup_expr="lte"
    )

    class Meta:
        model = Enrollment
        fields = ["status", "course", "student"]