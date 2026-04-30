from django.urls import path
from .views import *

urlpatterns = [

    # ── Content ───────────────────────────────────────────────────────
    # POST  mark content complete  (cascade → section → module auto)
    path("courses/<int:course_id>/sections/<int:section_id>/contents/<int:content_id>/complete/",
         CompleteContentAPIView.as_view(), name="complete-content"),

    # GET   contents + progress for a section
    path("courses/<int:course_id>/sections/<int:section_id>/contents/",
         SectionContentsProgressAPIView.as_view(), name="section-contents-progress"),

    # ── Section ───────────────────────────────────────────────────────
    # GET   one section progress
    path("courses/<int:course_id>/sections/<int:section_id>/",
         SectionProgressAPIView.as_view(), name="section-progress"),

    # GET   all sections of a course with progress
    path("courses/<int:course_id>/sections/",
         CourseSectionsProgressAPIView.as_view(), name="course-sections-progress"),

    # GET   completed sections across ALL courses
    path("courses/sections/completed/",
         CompletedSectionsAPIView.as_view(), name="completed-sections"),

    # GET   completed sections for a specific course
    path("courses/<int:course_id>/sections/completed/",
         CompletedCourseSectionsAPIView.as_view(), name="completed-course-sections"),

    # ── Module ────────────────────────────────────────────────────────
    # GET   one module progress (with section breakdown)
    path("courses/<int:course_id>/modules/<int:module_id>/",
         ModuleProgressAPIView.as_view(), name="module-progress"),

    # GET   all modules of a course with progress
    path("courses/<int:course_id>/modules/",
         CourseModulesProgressAPIView.as_view(), name="course-modules-progress"),

    # GET   completed modules for a specific course
    path("courses/<int:course_id>/modules/completed/",
         CompletedCourseModulesAPIView.as_view(), name="completed-course-modules"),

    # ── Learning session ──────────────────────────────────────────────
    path("courses/<int:course_id>/start/",       StartLearningAPIView.as_view(),      name="start-learning"),
    path("courses/<int:course_id>/end-session/", EndLearningSessionAPIView.as_view(), name="end-session"),
    path("courses/<int:course_id>/continue/",    ContinueLearningAPIView.as_view(),   name="continue-learning"),

    # ── Course-level progress ─────────────────────────────────────────
    path("courses/<int:course_id>/",          StudentCourseProgressAPIView.as_view(), name="student-course-progress"),
    path("courses/<int:course_id>/complete/", CompleteCourseAPIView.as_view(),        name="complete-course"),

    # ── Admin ─────────────────────────────────────────────────────────
    path("students/<int:student_id>/courses/<int:course_id>/admin/",
         AdminStudentCourseProgressAPIView.as_view(), name="admin-student-course-progress"),

    # ── KPI ───────────────────────────────────────────────────────────
    path("kpi/learning-hours/", LearningHoursKPIAPIView.as_view(), name="kpi-learning-hours"),
    path("kpi/courses/",        CoursesKPIAPIView.as_view(),        name="kpi-courses"),
]

