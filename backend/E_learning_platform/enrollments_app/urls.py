# enrollments_app/urls_instructor.py
from django.urls import path
from .views import CourseStudentsView, EnrollmentDetailView
from django.urls import path
from .views import (
    CourseStudentsView,
    EnrollmentDetailView,
    EnrollmentUpdateView,
    EnrollmentDeleteView
)

app_name = "enrollments_app"

urlpatterns = [
    path('courses/<int:course_id>/students/', CourseStudentsView.as_view(), name='course-students'),
    path('enrollments/<int:enrollment_id>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path("enrollments/<int:enrollment_id>/update/",EnrollmentUpdateView.as_view(),name="enrollment-update"),
    path("enrollments/<int:enrollment_id>/delete/",EnrollmentDeleteView.as_view(),name="enrollment-delete"),

]

