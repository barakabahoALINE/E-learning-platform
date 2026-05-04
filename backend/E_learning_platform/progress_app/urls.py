from django.urls import path
from .views import *

urlpatterns = [

    
    # Course Progress
    path("courses/<int:course_id>/", StudentCourseProgressAPIView.as_view(), name="student-course-progress"),
    
    # Lessons Progress
    path("courses/<int:course_id>/lessons/", CourseLessonsProgressAPIView.as_view(), name="course-lessons-progress"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/", LessonProgressAPIView.as_view(), name="lesson-progress"),

    # Lesson Contents Progress
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/", LessonContentsProgressAPIView.as_view(), name="lesson-contents-progress"),
    path("courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:content_id>/complete/", CompleteContentAPIView.as_view(), name="complete-content"),
    
    # Completed Lessons
    path("courses/lessons/completed/", CompletedLessonsAPIView.as_view(), name="completed-lessons"),
    path("courses/<int:course_id>/lessons/completed/", CompletedCourseLessonsAPIView.as_view(), name="completed-course-lessons"),

    # Learning Sessions
    path("courses/<int:course_id>/start/", StartLearningAPIView.as_view()),
    path("courses/<int:course_id>/continue/", ContinueLearningAPIView.as_view()),
    path("courses/<int:course_id>/end-session/", EndLearningSessionAPIView.as_view()),

    # Admin Progress APIs
    path("admin/students/<int:student_id>/courses/<int:course_id>/", AdminStudentCourseProgressAPIView.as_view(), name="admin-student-course-progress"),
    path("admin/courses/<int:course_id>/students-progress/", AdminCourseStudentsProgressAPIView.as_view(), name="admin-course-students-progress"),
    path("admin/students/<int:student_id>/courses/<int:course_id>/lessons/<int:lesson_id>/contents/<int:content_id>/complete/", AdminCompleteContentAPIView.as_view(), name="admin-complete-content"),
    path("admin/students/<int:student_id>/courses/<int:course_id>/lessons/<int:lesson_id>/complete/", AdminCompleteLessonAPIView.as_view(), name="admin-complete-lesson"),
    path("admin/students/<int:student_id>/courses/<int:course_id>/complete/", AdminCompleteCourseAPIView.as_view(), name="admin-complete-course"),

    # KPI APIs
    path("kpi/learning-hours/", LearningHoursKPIAPIView.as_view()),
    path("kpi/courses/", CoursesKPIAPIView.as_view()),
    path("kpi/completion-rate/", CompletionRateAPIView.as_view()),
]