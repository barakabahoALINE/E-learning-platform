from django.urls import path
from .views import (
    CourseListAPIView,
    CourseCreateAPIView,
    CourseRetrieveAPIView,
    CourseUpdateAPIView,
    CourseDeleteAPIView,
    CoursePublishAPIView,
    CourseUnpublishAPIView,
    SectionCreateAPIView, 
    SectionListAPIView,
    SectionUpdateView,
    SectionDeleteView,
)


urlpatterns = [
    path("courses/", CourseListAPIView.as_view(), name="course-list"),
    path("courses/create/", CourseCreateAPIView.as_view(), name="course-create"),
    path("courses/<int:pk>/", CourseRetrieveAPIView.as_view(), name="course-detail"),
    path("courses/<int:pk>/update/", CourseUpdateAPIView.as_view(), name="course-update"),
    path("courses/<int:pk>/delete/", CourseDeleteAPIView.as_view(), name="course-delete"),
    path("courses/<int:pk>/publish/", CoursePublishAPIView.as_view(), name="course-publish"),
    path("courses/<int:pk>/unpublish/", CourseUnpublishAPIView.as_view(), name="course-unpublish"),
    path("courses/<int:course_id>/sections/create/", SectionCreateAPIView.as_view(),name="section-create"),
    path("courses/<int:course_id>/sections/", SectionListAPIView.as_view(), name="section-list" ),
    path("sections/<int:pk>/update/", SectionUpdateView.as_view(),name="section-update"),
    path("sections/<int:pk>/delete/", SectionDeleteView.as_view(), name="section-delete")
]