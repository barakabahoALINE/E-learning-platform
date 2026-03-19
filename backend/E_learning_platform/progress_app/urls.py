from django.urls import path
from .views import *

urlpatterns = [
    path('courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:content_id>/complete/', CompleteContentAPIView.as_view(), name='complete-content'),
    path('courses/<int:course_id>/lessons/<int:lesson_id>/contents/', LessonContentsProgressAPIView.as_view(), name='lesson-contents-progress'),
    path('courses/<int:course_id>/lessons/<int:lesson_id>/', LessonProgressAPIView.as_view(), name='lesson-progress'),
    path('courses/<int:course_id>/lessons/', CourseLessonsProgressAPIView.as_view(), name='course-lessons-progress'),
    path('courses/lessons/completed/', CompletedLessonsAPIView.as_view(), name='completed-lessons'),
    path('courses/<int:course_id>/lessons/completed/', CompletedCourseLessonsAPIView.as_view(), name='completed-course-lessons'),
    path("courses/<int:course_id>/start/", StartLearningAPIView.as_view()),
    path("courses/<int:course_id>/end-session/", EndLearningSessionAPIView.as_view()),
    path("courses/<int:course_id>/continue/", ContinueLearningAPIView.as_view()),
    path("courses/<int:course_id>/", StudentCourseProgressAPIView.as_view(), name="student-course-progress"),
    path("students/<int:student_id>/courses/<int:course_id>/admin/",AdminStudentCourseProgressAPIView.as_view(), name="admin-student-course-progress"),
    path("courses/<int:course_id>/complete/", CompleteCourseAPIView.as_view()),
    path("admin/courses/<int:course_id>/complete/",AdminCompleteCourseAPIView.as_view(),name="admin-complete-course"),
    path("admin/courses/<int:course_id>/students-progress/", AdminCourseStudentsProgressAPIView.as_view(), name="admin-course-students-progress"),
    path("kpi/learning-hours/", LearningHoursKPIAPIView.as_view()),
    path("kpi/courses/", CoursesKPIAPIView.as_view()),
]