#
from django.urls import path
from .views import *

urlpatterns = [
    path("enrollments/", AdminListEnrollmentsView.as_view()),
    path("enrollments/admin/<int:pk>/", AdminEnrollmentDetailView.as_view()),
    path("enrollments/<int:pk>/update/", AdminUpdateEnrollmentView.as_view()),
    path("enrollments/<int:pk>/delete/", AdminDeleteEnrollmentView.as_view()),
    path("enrollments/create/", AdminCreateEnrollmentView.as_view()),
    path("enroll/", EnrollCourseAPIView.as_view(), name="enroll-course"),
    path("my-courses/", MyEnrollmentsAPIView.as_view(), name="my-enrollments"),
    path("enrollments/<int:pk>/", EnrollmentDetailAPIView.as_view(), name="enrollment-detail"),
    path("enrollments/<int:pk>/cancel/", CancelEnrollmentAPIView.as_view(), name="cancel-enrollment"),
    # Instructor views
    path("instructor/course-enrollments/", InstructorCourseEnrollmentsAPIView.as_view(), name="instructor-course-enrollments"),
    path("instructor/course-enrollments/<int:pk>/", InstructorCourseEnrollmentDetailAPIView.as_view(), name="instructor-course-enrollment-detail"),
]
