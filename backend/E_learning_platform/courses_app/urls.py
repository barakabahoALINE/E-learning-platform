# from django.urls import path

from django.urls import path
from .views import (
    QuizDetailAPIView,
    StartAttemptAPIView,
    SubmitQuizAPIView,
    AttemptDetailAPIView,
    CheckAttemptAPIView
)
from .views import *

urlpatterns = [

    # ── Courses ───────────────────────────────────────────────────────
    path("courses/",                            CourseListAPIView.as_view(),      name="course-list"),
    path("courses/create/",                     CourseCreateAPIView.as_view(),    name="course-create"),
    path("courses/<int:pk>/",                   CourseRetrieveAPIView.as_view(),  name="course-detail"),
    path("courses/<int:pk>/update/",            CourseUpdateAPIView.as_view(),    name="course-update"),
    path("courses/<int:pk>/delete/",            CourseDeleteAPIView.as_view(),    name="course-delete"),
    path("courses/<int:pk>/publish/",           CoursePublishAPIView.as_view(),   name="course-publish"),
    path("courses/<int:pk>/unpublish/",         CourseUnpublishAPIView.as_view(), name="course-unpublish"),

    # ── Modules ───────────────────────────────────────────────────────
    # GET  /courses/{course_id}/modules/
    # POST /courses/{course_id}/modules/create/
    path("courses/<int:course_id>/modules/", ModuleListAPIView.as_view(),   name="module-list"),
    path("courses/<int:course_id>/modules/create/", ModuleCreateAPIView.as_view(), name="module-create"),
    path("courses/<int:course_id>/modules/<int:pk>/update/", ModuleUpdateAPIView.as_view(), name="module-update"),
    path("courses/<int:course_id>/modules/<int:pk>/delete/", ModuleDeleteAPIView.as_view(), name="module-delete"),

    # ── Sections (replaces Lessons) ───────────────────────────────────
    # GET  /courses/{course_id}/modules/{module_id}/sections/
    path("courses/<int:course_id>/modules/<int:module_id>/sections/",
         SectionListAPIView.as_view(),   name="section-list"),
    path("courses/<int:course_id>/modules/<int:module_id>/sections/create/",
         SectionCreateAPIView.as_view(), name="section-create"),
    path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:pk>/update/",
         SectionUpdateAPIView.as_view(), name="section-update"),
    path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:pk>/delete/",
         SectionDeleteAPIView.as_view(), name="section-delete"),

    # ── Contents ──────────────────────────────────────────────────────
    # GET  /courses/{course_id}/sections/{section_id}/contents/
    # POST /courses/{course_id}/sections/{section_id}/contents/create/
    path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/",
     ContentListAPIView.as_view(), name="content-list"),

path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/create/",
     ContentCreateAPIView.as_view(), name="content-create"),

path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/",
     ContentRetrieveAPIView.as_view(), name="content-detail"),

path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/update/",
     ContentUpdateAPIView.as_view(), name="content-update"),

path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/delete/",
     ContentDeleteAPIView.as_view(), name="content-delete"),

    #---------## FOR QUIZ-----------------
    # ─────────────────────────────
# QUIZ UNDER MODULE (IMPORTANT)
# ─────────────────────────────
# CREATE QUIZ FOR MODULE (END OF MODULE)
path("courses/<int:course_id>/modules/<int:module_id>/quiz/create/", QuizCreateAPIView.as_view(), name="quiz-create"),

# GET QUIZ FOR MODULE
path("courses/<int:course_id>/modules/<int:module_id>/quiz/", QuizDetailAPIView.as_view(), name="quiz-detail"),

# START QUIZ ATTEMPT  👇 Kuraho / imbere
# path("quiz/<int:quiz_id>/start/", StartAttemptAPIView.as_view(), name="quiz-start"),
path("quiz/start/", StartAttemptAPIView.as_view(), name="quiz-start"),
# CHECK IF USER ALREADY ATTEMPTED QUIZ
path("quiz/<int:quiz_id>/check/", CheckAttemptAPIView.as_view(), name="quiz-check"),


# SUBMIT QUIZ
path("attempt/<int:attempt_id>/submit/", SubmitQuizAPIView.as_view(), name="quiz-submit"),

# VIEW ATTEMPT DETAILS
path("attempt/<int:pk>/", AttemptDetailAPIView.as_view(), name="attempt-detail"),

# # CHECK IF USER ALREADY ATTEMPTED QUIZ
# path("quiz/<int:quiz_id>/check/", CheckAttemptAPIView.as_view(), name="quiz-check"),

    
    path("levels/", LevelListAPIView.as_view(), name="level-list"),
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    
]


