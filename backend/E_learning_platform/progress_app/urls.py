from django.urls import path
from .views import (
    CompleteContentAPIView,
    LessonContentsProgressAPIView,
    LessonProgressAPIView,
    CourseLessonsProgressAPIView,
    CompletedLessonsAPIView,
    CompletedCourseLessonsAPIView
)

urlpatterns = [
    path('content/<int:content_id>/complete/', CompleteContentAPIView.as_view(), name='complete-content'),
    path('lessons/<int:lesson_id>/contents/', LessonContentsProgressAPIView.as_view(), name='lesson-contents-progress'),
    path('lessons/<int:lesson_id>/', LessonProgressAPIView.as_view(), name='lesson-progress'),
    path('courses/<int:course_id>/lessons/', CourseLessonsProgressAPIView.as_view(), name='course-lessons-progress'),
    path('lessons/completed/', CompletedLessonsAPIView.as_view(), name='completed-lessons'),
    path('courses/<int:course_id>/lessons/completed/', CompletedCourseLessonsAPIView.as_view(), name='completed-course-lessons'),
]