#
from django.urls import path
from .views import *

urlpatterns = [
    path("enrollments/", AdminListEnrollmentsView.as_view()),
    path("enrollments/admin/<int:pk>/", AdminListEnrollmentsView.as_view()),
    path("enrollments/<int:pk>/update/", AdminUpdateEnrollmentView.as_view()),
    path("enrollments/<int:pk>/delete/", AdminDeleteEnrollmentView.as_view()),
    path("enrollments/create/", AdminCreateEnrollmentView.as_view()),
    path("enroll/",EnrollCourseAPIView.as_view(),name="enroll-course",), # 1️⃣ Enroll in a course
    path("my-courses/",MyEnrollmentsAPIView.as_view(),name="my-enrollments",), # 2️⃣ List my enrollments
    path("enrollments/<int:pk>/",EnrollmentDetailAPIView.as_view(),name="enrollment-detail",),# 3️⃣ Retrieve single enrollment
    path("enrollments/<int:pk>/cancel/",CancelEnrollmentAPIView.as_view(),name="cancel-enrollment",), # 4️⃣ Cancel enrollment
   
]
