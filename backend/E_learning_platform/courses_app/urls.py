from django.urls import path
from .views import *

urlpatterns = [
     
     #COURSE URLS
     path("courses/", CourseListAPIView.as_view(),      name="course-list"),
     path("courses/create/", CourseCreateAPIView.as_view(),    name="course-create"),
     path("courses/<int:pk>/", CourseRetrieveAPIView.as_view(),  name="course-detail"),
     path("courses/<int:pk>/update/", CourseUpdateAPIView.as_view(),    name="course-update"),
     path("courses/<int:pk>/delete/", CourseDeleteAPIView.as_view(),    name="course-delete"),
     path("courses/<int:pk>/publish/", CoursePublishAPIView.as_view(),   name="course-publish"),
     path("courses/<int:pk>/unpublish/", CourseUnpublishAPIView.as_view(), name="course-unpublish"),
     path( "courses/<int:course_id>/publish-changes/", PublishCourseChangesAPIView.as_view() ),
     
     # MODULE URLS      
     path("courses/<int:course_id>/modules/", ModuleListAPIView.as_view(),   name="module-list"),
     path("courses/<int:course_id>/modules/create/", ModuleCreateAPIView.as_view(), name="module-create"),
     path("courses/<int:course_id>/modules/<int:pk>/update/", ModuleUpdateAPIView.as_view(), name="module-update"),
     path("courses/<int:course_id>/modules/<int:pk>/delete/", ModuleDeleteAPIView.as_view(), name="module-delete"),
     
     # SECTION URLS    
     path("courses/modules/<int:module_id>/sections/",SectionListAPIView.as_view(),   name="section-list"),
     path("courses/modules/<int:module_id>/sections/create/",SectionCreateAPIView.as_view(), name="section-create"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:pk>/update/",SectionUpdateAPIView.as_view(), name="section-update"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:pk>/delete/",SectionDeleteAPIView.as_view(), name="section-delete"),
     path("courses/modules/<int:module_id>/all-contents/", ModuleContentsAPIView.as_view(), name="module-all-contents"),

     # CONTENT URLS
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/",ContentListAPIView.as_view(), name="content-list"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/create/",ContentCreateAPIView.as_view(), name="content-create"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/",ContentRetrieveAPIView.as_view(), name="content-detail"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/update/",ContentUpdateAPIView.as_view(), name="content-update"),
     path("courses/<int:course_id>/modules/<int:module_id>/sections/<int:section_id>/contents/<int:pk>/delete/",ContentDeleteAPIView.as_view(), name="content-delete"),
     
     # OTHER URLS
     path("levels/", LevelListAPIView.as_view(), name="level-list"),
     path("levels/create/", LevelCreateAPIView.as_view(), name="level-create"),
     path("categories/", CategoryListAPIView.as_view(), name="category-list"),
     path("categories/create/", CategoryCreateAPIView.as_view(), name="category-create"),
     path("media/upload/", MediaUploadAPIView.as_view(), name="media-upload"),

]
