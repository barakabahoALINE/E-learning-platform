from django.urls import path
# from .views import *
from .views import *


urlpatterns = [
    path("courses/", CourseListAPIView.as_view(), name="course-list"),
    path("courses/create/", CourseCreateAPIView.as_view(), name="course-create"),
    path("courses/<int:pk>/", CourseRetrieveAPIView.as_view(), name="course-detail"),
    path("courses/<int:pk>/update/", CourseUpdateAPIView.as_view(), name="course-update"),
    path("courses/<int:pk>/delete/", CourseDeleteAPIView.as_view(), name="course-delete"),
    path("courses/<int:pk>/publish/", CoursePublishAPIView.as_view(), name="course-publish"),
    path("courses/<int:pk>/unpublish/", CourseUnpublishAPIView.as_view(), name="course-unpublish"),
    path("courses/<int:course_id>/lessons/create/", LessonCreateAPIView.as_view()),
    path("courses/<int:course_id>/lessons/", LessonListAPIView.as_view()),
    path("courses/<int:course_id>/lessons/<int:pk>/update/", LessonUpdateAPIView.as_view()),
    path("courses/<int:course_id>/lessons/<int:pk>/delete/", LessonDeleteAPIView.as_view()),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/",LessonContentListAPIView.as_view(),name="lesson-contents"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/create/", LessonContentCreateAPIView.as_view(), name="content-create"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:pk>/", LessonContentRetrieveAPIView.as_view(), name="content-detail"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:pk>/update/", LessonContentUpdateAPIView.as_view(), name="content-update"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:pk>/delete/", LessonContentDeleteAPIView.as_view(), name="content-delete"),
]