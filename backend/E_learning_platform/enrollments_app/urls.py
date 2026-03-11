#
from django.urls import path
from .views import *

urlpatterns = [

    path("enrollments/", AdminListEnrollmentsView.as_view()),
    path("enrollments/<int:pk>/", AdminEnrollmentDetailView.as_view()),
    path("enrollments/<int:pk>/update/", AdminUpdateEnrollmentView.as_view()),
    path("enrollments/<int:pk>/delete/", AdminDeleteEnrollmentView.as_view()),
    path("enrollments/create/", AdminCreateEnrollmentView.as_view()),
]
