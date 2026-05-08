from django.urls import path
from .views import *

urlpatterns = [

    # Course Progress APIS
    path("courses/<int:course_id>/", StudentCourseProgressAPIView.as_view(), name="student-course-progress"),
#     path("courses/<int:course_id>/final/complete/", CompleteFinalAssessmentAPIView.as_view(), name="complete-final-assessment"),    
    path("courses/<int:course_id>/complete/", CompleteCourseAPIView.as_view(),        name="complete-course"),
    
    
    # Admin Progress APIs
    path("admin/students/<int:student_id>/courses/<int:course_id>/", AdminStudentCourseProgressAPIView.as_view(), name="admin-student-course-progress"),
#     path("admin/courses/<int:course_id>/students-progress/", AdminCourseStudentsProgressAPIView.as_view(), name="admin-course-students-progress"),
    path("admin/students/<int:student_id>/courses/<int:course_id>/complete/", AdminCompleteCourseAPIView.as_view(), name="admin-complete-course"),
    
    
    # Content APIS
    path("courses/<int:course_id>/sections/<int:section_id>/contents/<int:content_id>/complete/",CompleteContentAPIView.as_view(), name="complete-content"),
    path("courses/<int:course_id>/sections/<int:section_id>/contents/",SectionContentsProgressAPIView.as_view(), name="section-contents-progress"),

    # Section APIS
    path("courses/<int:course_id>/sections/<int:section_id>/",SectionProgressAPIView.as_view(), name="section-progress"),
    path("courses/<int:course_id>/sections/",CourseSectionsProgressAPIView.as_view(), name="course-sections-progress"),
    path("courses/sections/completed/", CompletedSectionsAPIView.as_view(), name="completed-sections"),
    path("courses/<int:course_id>/sections/completed/", CompletedCourseSectionsAPIView.as_view(), name="completed-course-sections"),


    # MODULE APIS
    path("courses/<int:course_id>/modules/<int:module_id>/",ModuleProgressAPIView.as_view(), name="module-progress"),
    path("courses/<int:course_id>/modules/",CourseModulesProgressAPIView.as_view(), name="course-modules-progress"),
    path("courses/<int:course_id>/modules/completed/",CompletedCourseModulesAPIView.as_view(), name="completed-course-modules"),


    # Learning session 
    path("courses/<int:course_id>/start/",       StartLearningAPIView.as_view(),      name="start-learning"),
    path("courses/<int:course_id>/end-session/", EndLearningSessionAPIView.as_view(), name="end-session"),
    path("courses/<int:course_id>/continue/",    ContinueLearningAPIView.as_view(),   name="continue-learning"),
    
    
     # KPI APIS
    path("kpi/learning-hours/", LearningHoursKPIAPIView.as_view(), name="kpi-learning-hours"),
    path("kpi/courses/",        CoursesKPIAPIView.as_view(),        name="kpi-courses"),
    path("kpi/completion-rate/", CompletionRateAPIView.as_view()),
]


