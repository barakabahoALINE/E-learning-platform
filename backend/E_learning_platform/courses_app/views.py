# This module provides helper functions to filter querysets so that
# users only see objects belonging to their own institution, while
# allowing global objects (with no creator or institution) to be visible.
# Super‑admin users bypass all filters and see every record.
# from rest_framework.permissions import AllowAny, IsAuthenticated
# from rest_framework.exceptions import PermissionDenied, ValidationError
# from rest_framework.response import Response
# from rest_framework.views import APIView
# from django.db import transaction
# from django.shortcuts import get_object_or_404
# from .models import Content, Section, Module, Course, Level, Category
# from .permissions import IsAdmin
# from rest_framework.exceptions import ValidationError
# from .models import Content, Section, Module, Course
# from .serializers import *
# from django.db.models import F
# # ═══════════════════════════════════════════════
# # COURSE VIEWS  (unchanged logic, updated names)
# # ═══════════════════════════════════════════════

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction, IntegrityError, models
from django.shortcuts import get_object_or_404
from .models import Content, Section, Module, Course, Level, Category
from .permissions import (
    CanViewCourses, CanAddCourse, CanChangeCourse, CanDeleteCourse, 
    CanPublishCourse, CanViewPublishedCourse, CanManageMeta
)
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import Content, Section, Module, Course
from .serializers import *


def _is_admin_user(user):
    return user.is_authenticated and (
        user.is_superuser or 
        user.groups.filter(name__in=["Admin", "Instructor"]).exists() or
        user.role in ["admin", "instructor"]
    )

def _is_instructor_user(user):
    return user.is_authenticated and (
        getattr(user, "role", "") == "instructor" or
        user.groups.filter(name="Instructor").exists()
    )

def _is_unrestricted_user(user):
    return user.is_authenticated and (
        user.is_superuser or
        getattr(user, "role", "") in ["admin", "viewer"] or
        user.groups.filter(name__in=["Admin", "Viewer"]).exists()
    )


def _is_student_or_viewer_user(user):
    return user.is_authenticated and getattr(user, "role", "").lower() in ["student", "viewer"]


def _same_institution_queryset(queryset, user, relation="created_by__institution"):
    if _is_unrestricted_user(user):
        return queryset
    if user.is_authenticated and getattr(user, "institution", None):
        parts = relation.split("__")
        creator_isnull_relation = "__".join(parts[:-1]) + "__isnull"
        institution_isnull_relation = relation + "__isnull"
        return queryset.filter(
            models.Q(**{relation: user.institution}) |
            models.Q(**{creator_isnull_relation: True}) |
            models.Q(**{institution_isnull_relation: True})
        )
    return queryset


# ═══════════════════════════════════════════════
# COURSE VIEWS  (unchanged logic, updated names)
# ═══════════════════════════════════════════════

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Course.objects.select_related("category", "level", "created_by").annotate(
            enrolled_students_count=models.Count("enrollments", distinct=True),
            rating=models.Avg("certificate_feedback__overall_rating"),
        )
        user = self.request.user

        if user.is_authenticated:
            if _is_unrestricted_user(user):
                queryset = queryset.distinct()
            elif _is_instructor_user(user):
                queryset = queryset.filter(created_by=user).distinct()
            elif _is_admin_user(user):
                queryset = queryset.filter(
                    models.Q(created_by__institution=user.institution) |
                    models.Q(created_by__isnull=True) |
                    models.Q(created_by__institution__isnull=True) |
                    models.Q(is_published=True)
                ).distinct()
            else:
                queryset = queryset.filter(is_published=True).distinct()
        else:
            queryset = queryset.filter(is_published=True).distinct()

        category = self.request.query_params.get("category")
        level = self.request.query_params.get("level")
        search = self.request.query_params.get("search") or self.request.query_params.get("q")

        if category:
            if category.isdigit():
                queryset = queryset.filter(
                    models.Q(category_id=category) |
                    models.Q(draft_category_id=category)
                )
            else:
                queryset = queryset.filter(
                    models.Q(category__name__icontains=category) |
                    models.Q(draft_category__name__icontains=category)
                )

        if level:
            if level.isdigit():
                queryset = queryset.filter(
                    models.Q(level_id=level) |
                    models.Q(draft_level_id=level)
                )
            else:
                queryset = queryset.filter(
                    models.Q(level__name__icontains=level) |
                    models.Q(draft_level__name__icontains=level)
                )

        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search)
            )

        return queryset.distinct()
    
    
class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, CanAddCourse]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            return Response({
                "success": True,
                "message": "Course created successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response({
                "success": False,
                "message": "Validation error",
                "errors": e.detail
            }, status=status.HTTP_400_BAD_REQUEST)



class CourseRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [IsAuthenticated, CanViewPublishedCourse]
    queryset = Course.objects.select_related("category", "level", "created_by").annotate(
        enrolled_students_count=models.Count("enrollments", distinct=True),
        rating=models.Avg("certificate_feedback__overall_rating"),
    )

    def get_object(self):
        course = super().get_object()
        if course.is_published:
            return course

        user = self.request.user
        if user.is_authenticated and (
            _is_unrestricted_user(user) or
            (_is_instructor_user(user) and course.created_by_id == user.id)
        ):
            return course
        raise PermissionDenied("Course is not published.")


class CourseUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, CanChangeCourse]
    queryset = Course.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        return _same_institution_queryset(queryset, self.request.user)

    def _sync_builder_structure(self, course, request_data):
        modules_data_str = request_data.get("modules")
        final_assessment_str = request_data.get("finalAssessment")
        is_published_course = course.is_published

        if final_assessment_str is not None:
            try:
                course.final_assessment = (
                    json.loads(final_assessment_str)
                    if isinstance(final_assessment_str, str)
                    else final_assessment_str
                )
                course.save(update_fields=["final_assessment"])
            except Exception:
                pass

        if modules_data_str is None:
            return

        if isinstance(modules_data_str, str):
            try:
                modules_data = json.loads(modules_data_str)
            except Exception:
                modules_data = []
        else:
            modules_data = modules_data_str

        provided_module_ids = [str(m.get("id")) for m in modules_data if m.get("id")]
        modules_to_remove = Module.objects.filter(course=course).exclude(id__in=provided_module_ids)
        if is_published_course:
            for module in modules_to_remove:
                module.pending_delete = True
                module.has_unpublished_changes = True
                module.save()
        else:
            modules_to_remove.delete()

        for module_data in modules_data:
            module_id = module_data.get("id")
            module = (
                Module.objects.filter(id=module_id, course=course).first()
                if module_id
                else None
            )

            if not module:
                module_kwargs = {
                    "course": course,
                    "title": module_data.get("title", ""),
                    "description": module_data.get("description", ""),
                    "order": module_data.get("order", 0),
                    "quiz_enabled": module_data.get("quizEnabled", False),
                }
                if is_published_course:
                    module_kwargs.update({
                        "draft_title": module_kwargs["title"],
                        "draft_description": module_kwargs["description"],
                        "draft_order": module_kwargs["order"],
                        "has_unpublished_changes": True,
                        "is_published": False,
                    })
                module = Module.objects.create(**module_kwargs)
            else:
                if is_published_course:
                    if module_data.get("title") is not None:
                        module.draft_title = module_data.get("title")
                    if module_data.get("description") is not None:
                        module.draft_description = module_data.get("description")
                    if module_data.get("order") is not None:
                        module.draft_order = module_data.get("order")
                    module.has_unpublished_changes = True
                    module.quiz_enabled = module_data.get("quizEnabled", module.quiz_enabled)
                    module.save()
                else:
                    module.title = module_data.get("title", module.title)
                    module.description = module_data.get("description", module.description)
                    module.order = module_data.get("order", module.order)
                    module.quiz_enabled = module_data.get("quizEnabled", module.quiz_enabled)
                    module.save()

            sections_data = module_data.get("sections", [])
            provided_section_ids = [str(s.get("id")) for s in sections_data if s.get("id")]
            sections_to_remove = Section.objects.filter(module=module).exclude(id__in=provided_section_ids)
            if is_published_course:
                for section in sections_to_remove:
                    section.pending_delete = True
                    section.has_unpublished_changes = True
                    section.save()
            else:
                sections_to_remove.delete()

            for section_data in sections_data:
                section_id = section_data.get("id")
                section = (
                    Section.objects.filter(id=section_id, module=module).first()
                    if section_id
                    else None
                )

                if not section:
                    section_kwargs = {
                        "module": module,
                        "title": section_data.get("title", ""),
                        "order": section_data.get("order", 0),
                    }
                    if is_published_course:
                        section_kwargs.update({
                            "draft_title": section_kwargs["title"],
                            "draft_order": section_kwargs["order"],
                            "has_unpublished_changes": True,
                            "is_published": False,
                        })
                    section = Section.objects.create(**section_kwargs)
                else:
                    if is_published_course:
                        if section_data.get("title") is not None:
                            section.draft_title = section_data.get("title")
                        if section_data.get("order") is not None:
                            section.draft_order = section_data.get("order")
                        section.has_unpublished_changes = True
                        section.save()
                    else:
                        section.title = section_data.get("title", section.title)
                        section.order = section_data.get("order", section.order)
                        section.save()

                contents_data = section_data.get("contents", [])
                provided_content_ids = [str(c.get("id")) for c in contents_data if c.get("id")]
                contents_to_remove = Content.objects.filter(section=section).exclude(id__in=provided_content_ids)
                if is_published_course:
                    for content in contents_to_remove:
                        content.pending_delete = True
                        content.has_unpublished_changes = True
                        content.save()
                else:
                    contents_to_remove.delete()

                for content_data in contents_data:
                    content_id = content_data.get("id")
                    content = (
                        Content.objects.filter(id=content_id, section=section).first()
                        if content_id
                        else None
                    )

                    if not content:
                        content_kwargs = {
                            "section": section,
                            "title": content_data.get("title", ""),
                            "content_type": content_data.get("content_type", "text"),
                            "description": content_data.get("description", ""),
                            "video_url": content_data.get("video_url", ""),
                            "text_content": content_data.get("text_content", ""),
                            "file": content_data.get("file", None),
                            "order": content_data.get("order", 0),
                        }
                        if is_published_course:
                            content_kwargs.update({
                                "draft_title": content_kwargs["title"],
                                "draft_content_type": content_kwargs["content_type"],
                                "draft_description": content_kwargs["description"],
                                "draft_video_url": content_kwargs["video_url"],
                                "draft_text_content": content_kwargs["text_content"],
                                "draft_file": content_kwargs["file"],
                                "draft_order": content_kwargs["order"],
                                "has_unpublished_changes": True,
                                "is_published": False,
                            })
                        Content.objects.create(**content_kwargs)
                    else:
                        if is_published_course:
                            if content_data.get("title") is not None:
                                content.draft_title = content_data.get("title")
                            if content_data.get("content_type") is not None:
                                content.draft_content_type = content_data.get("content_type")
                            if content_data.get("description") is not None:
                                content.draft_description = content_data.get("description")
                            if content_data.get("video_url") is not None:
                                content.draft_video_url = content_data.get("video_url")
                            if content_data.get("text_content") is not None:
                                content.draft_text_content = content_data.get("text_content")
                            if content_data.get("file") is not None:
                                content.draft_file = content_data.get("file")
                            if content_data.get("order") is not None:
                                content.draft_order = content_data.get("order")
                            content.has_unpublished_changes = True
                            content.save()
                        else:
                            content.title = content_data.get("title", content.title)
                            content.content_type = content_data.get("content_type", content.content_type)
                            content.description = content_data.get("description", content.description)
                            content.video_url = content_data.get("video_url", content.video_url)
                            content.text_content = content_data.get("text_content", content.text_content)
                            content.file = content_data.get("file", content.file)
                            content.order = content_data.get("order", content.order)
                            content.save()

    def update(self, request, *args, **kwargs):

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        if "title" in data:
            instance.draft_title = data["title"]

        if "description" in data:
            instance.draft_description = data["description"]

        if "duration" in data:
            instance.draft_duration = data["duration"]

        if "level" in data:
            instance.draft_level = data["level"]

        if "category" in data:
            instance.draft_category = data["category"]

        if "thumbnail" in data:
            instance.draft_thumbnail = data["thumbnail"]

        if "price" in data:
            instance.draft_price = data["price"]

        instance.has_unpublished_changes = True
        instance.save()

        self._sync_builder_structure(instance, request.data)

        return Response({
            "success": True,
            "message": "Course changes saved successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)



class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, CanDeleteCourse]
    queryset = Course.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        return _same_institution_queryset(queryset, self.request.user)

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        # If the course is a draft (not published), delete it directly
        if not instance.is_published:
            instance.delete()
            return Response({
                "success": True,
                "message": f"Course '{instance.title}' deleted successfully."
            }, status=status.HTTP_200_OK)

        # Otherwise, don't delete directly; mark for deletion only
        instance.pending_delete = True
        instance.has_unpublished_changes = True

        instance.save()

        return Response({
            "success": True,
            "message": f"Course '{instance.title}' marked for deletion. Publish changes to apply deletion."
        }, status=status.HTTP_200_OK)
        
def apply_draft_changes(course):
    with transaction.atomic():
        # =========================
        # 1. APPLY COURSE CHANGES
        # =========================
        if course.draft_title:
            course.title = course.draft_title

        if course.draft_description:
            course.description = course.draft_description

        if course.draft_duration:
            course.duration = course.draft_duration

        if course.draft_level:
            course.level = course.draft_level

        if course.draft_category:
            course.category = course.draft_category

        if course.draft_thumbnail:
            course.thumbnail = course.draft_thumbnail

        if course.draft_price is not None:
            course.price = course.draft_price

        # =========================
        # 2. HANDLE DELETE COURSE
        # =========================
        if course.pending_delete:
            course.delete()
            return True

        course.has_unpublished_changes = False

        # clear drafts
        course.draft_title = None
        course.draft_description = None
        course.draft_duration = None
        course.draft_level = None
        course.draft_category = None
        course.draft_thumbnail = None
        course.draft_price = None

        course.save()

        # =========================
        # 3. APPLY MODULES
        # =========================
        modules = course.modules.all()

        for module in modules:

            if module.pending_delete:
                module.delete()
                continue

            if module.draft_title:
                module.title = module.draft_title

            if module.draft_description:
                module.description = module.draft_description

            if module.draft_order is not None:
                module.order = module.draft_order

            module.has_unpublished_changes = False
            module.is_published = True

            module.draft_title = None
            module.draft_description = None
            module.draft_order = None

            module.save()

            # =========================
            # 4. APPLY SECTIONS
            # =========================
            for section in module.sections.all():

                if section.pending_delete:
                    section.delete()
                    continue

                if section.draft_title:
                    section.title = section.draft_title

                if section.draft_order is not None:
                    section.order = section.draft_order

                section.has_unpublished_changes = False
                section.is_published = True

                section.draft_title = None
                section.draft_order = None

                section.save()

                # =========================
                # 5. APPLY CONTENTS
                # =========================
                for content in section.contents.all():

                    if content.pending_delete:
                        content.delete()
                        continue

                    if content.draft_title:
                        content.title = content.draft_title

                    if content.draft_content_type:
                        content.content_type = content.draft_content_type

                    if content.draft_description:
                        content.description = content.draft_description

                    if content.draft_video_url:
                        content.video_url = content.draft_video_url

                    if content.draft_text_content:
                        content.text_content = content.draft_text_content

                    if content.draft_file:
                        content.file = content.draft_file

                    if content.draft_order is not None:
                        content.order = content.draft_order

                    content.has_unpublished_changes = False
                    content.is_published = True

                    content.draft_title = None
                    content.draft_content_type = None
                    content.draft_description = None
                    content.draft_video_url = None
                    content.draft_text_content = None
                    content.draft_file = None
                    content.draft_order = None

                    content.save()
        return False

class CoursePublishAPIView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated, CanPublishCourse]
    queryset = Course.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user)

    def post(self, request, pk):

        course = self.get_object()

        if course.price < 0:
            return Response(
                {
                    "error": "Course must have a price before publishing."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # =========================
        # PUBLISH COURSE
        # =========================
        course.pending_delete = False
        course.has_unpublished_changes = False
        course.is_published = True
        course.save()

        # Apply all draft changes and clear has_unpublished_changes flags
        apply_draft_changes(course)

        for assessment in course.assessments.all():
            if assessment.pending_delete:
                assessment.delete()
                continue
            assessment.has_unpublished_changes = False
            assessment.pending_delete = False
            assessment.is_published = True
            assessment.save(validate=False)

        return Response({"success": True, "message": "Course published successfully."})
        
class CourseUnpublishAPIView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated, CanPublishCourse]
    queryset = Course.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user)

    def post(self, request, pk):

        course = self.get_object()

        # =========================
        # UNPUBLISH COURSE
        # =========================
        course.pending_delete = False
        course.has_unpublished_changes = False
        course.is_published = False
        course.save()

        # =========================
        # UNPUBLISH ASSESSMENTS
        # =========================
        assessments = course.assessments.all()

        for assessment in assessments:
            assessment.pending_delete = False
            assessment.has_unpublished_changes = False
            assessment.is_published = False
            assessment.save()

        # =========================
        # UNPUBLISH MODULES
        # =========================
        modules = course.modules.all()

        for module in modules:

            module.pending_delete = False
            module.has_unpublished_changes = False
            module.is_published = False
            module.save()

            # =========================
            # UNPUBLISH SECTIONS
            # =========================
            sections = module.sections.all()

            for section in sections:

                section.pending_delete = False
                section.has_unpublished_changes = False
                section.is_published = False
                section.save()

                # =========================
                # UNPUBLISH CONTENTS
                # =========================
                contents = section.contents.all()

                for content in contents:

                    content.pending_delete = False
                    content.has_unpublished_changes = False
                    content.is_published = False
                    content.save()

        return Response({
            "success": True,
            "message": "Course and all related items unpublished successfully."
        })
# ═══════════════════════════════════════════════
# MODULE VIEWS
# ═══════════════════════════════════════════════

class ModuleCreateAPIView(generics.CreateAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, CanAddCourse]

    def get_course(self):
        queryset = Course.objects.filter(id=self.kwargs["course_id"])
        if not self.request.user.is_superuser:
            queryset = _same_institution_queryset(queryset, self.request.user)
        return get_object_or_404(queryset)

    def create(self, request, *args, **kwargs):
        try:
            course = self.get_course()
            
            # Get the next order number automatically
            max_order = Module.objects.filter(course=course).aggregate(
                max_order=models.Max('order')
            )['max_order']
            next_order = (max_order or 0) + 1
            
            # Prepare data with auto-calculated order
            data = request.data.copy()
            data['order'] = next_order
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(course=course, is_published=False)
            course.has_unpublished_changes = True
            course.save()
            return Response(
                {"success": True, "message": "Module created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Module creation failed",
                    "error": e.detail[0] if isinstance(e.detail, list) else e.detail,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class ModuleListAPIView(generics.ListAPIView):
    serializer_class = ModuleSerializer

    def get_queryset(self):
        queryset = Module.objects.filter(course_id=self.kwargs["course_id"])
        user = self.request.user
        queryset = _same_institution_queryset(queryset, user, relation="course__created_by__institution")

        if user.is_authenticated and _is_admin_user(user):
            return queryset

        if user.is_authenticated and _is_student_or_viewer_user(user):
            return queryset.filter(is_published=True)

        return queryset.filter(is_published=True)
 

class ModuleUpdateAPIView(generics.UpdateAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, CanChangeCourse]
    queryset = Module.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="course__created_by__institution")

    def update(self, request, *args, **kwargs):

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # SAVE AS DRAFT
        if "title" in data:
            instance.draft_title = data["title"]

        if "description" in data:
            instance.draft_description = data["description"]

        if "order" in data:
            instance.draft_order = data["order"]

        # MARK AS UNPUBLISHED CHANGES
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": "Module changes saved as draft successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK,
        )


class ModuleDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, CanDeleteCourse]
    queryset = Module.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="course__created_by__institution")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.course.is_published:
            title = instance.title
            instance.delete()
            return Response(
                {
                    "success": True,
                    "message": f"Module '{title}' deleted successfully.",
                    "hard_deleted": True
                },
                status=status.HTTP_200_OK,
            )

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True
        instance.save()
        instance.course.has_unpublished_changes = True
        instance.course.save(update_fields=["has_unpublished_changes"])

        return Response(
            {
                "success": True,
                "message": f"Module '{instance.title}' marked for deletion. Publish changes to apply deletion.",
                "hard_deleted": False
            },
            status=status.HTTP_200_OK,
        )

# ═══════════════════════════════════════════════
# SECTION VIEWS  (replaces Lesson views)
# ═══════════════════════════════════════════════

class SectionCreateAPIView(generics.CreateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, CanAddCourse]

    def get_module(self):
        queryset = Module.objects.filter(
            id=self.kwargs["module_id"],
        )
        if not self.request.user.is_superuser:
            queryset = _same_institution_queryset(queryset, self.request.user, relation="course__created_by__institution")
        return get_object_or_404(queryset)

    def create(self, request, *args, **kwargs):
        try:
            module = self.get_module()
            
            # Get the next order number automatically
            max_order = Section.objects.filter(module=module).aggregate(
                max_order=models.Max('order')
            )['max_order']
            next_order = (max_order or 0) + 1
            
            # Prepare data with auto-calculated order
            data = request.data.copy()
            data['order'] = next_order
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            section = serializer.save(module=module, is_published=False)
            # mark module
            module.has_unpublished_changes = True
            module.save()

            # mark course
            module.course.has_unpublished_changes = True
            module.course.save()
            return Response(
                {"success": True, "message": "Section created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Section creation failed",
                    "error": e.detail[0] if isinstance(e.detail, list) else e.detail,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class SectionListAPIView(generics.ListAPIView):
    serializer_class = SectionSerializer

    def get_queryset(self):
        queryset = Section.objects.filter(module_id=self.kwargs["module_id"])
        user = self.request.user
        queryset = _same_institution_queryset(queryset, user, relation="module__course__created_by__institution")
        if user.is_authenticated and _is_admin_user(user):
            return queryset

        if user.is_authenticated and _is_student_or_viewer_user(user):
            return queryset.filter(is_published=True)

        return queryset.filter(is_published=True)


class SectionUpdateAPIView(generics.UpdateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, CanChangeCourse]
    queryset = Section.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="module__course__created_by__institution")

    def update(self, request, *args, **kwargs):

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # SAVE AS DRAFT
        if "title" in data:
            instance.draft_title = data["title"]

        if "order" in data:
            instance.draft_order = data["order"]

        # MARK AS UNPUBLISHED CHANGES
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": "Section changes saved as draft successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK,
        )


class SectionDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, CanDeleteCourse]
    queryset = Section.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="module__course__created_by__institution")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.module.course.is_published:
            title = instance.title
            instance.delete()
            return Response(
                {
                    "success": True,
                    "message": f"Section '{title}' deleted successfully.",
                    "hard_deleted": True
                },
                status=status.HTTP_200_OK,
            )

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True
        instance.save()
        instance.module.has_unpublished_changes = True
        instance.module.save(update_fields=["has_unpublished_changes"])
        instance.module.course.has_unpublished_changes = True
        instance.module.course.save(update_fields=["has_unpublished_changes"])

        return Response(
            {
                "success": True,
                "message": f"Section '{instance.title}' marked for deletion. Publish changes to apply deletion.",
                "hard_deleted": False
            },
            status=status.HTTP_200_OK,
        )

# ═══════════════════════════════════════════════
# CONTENT VIEWS
# ═══════════════════════════════════════════════

class ContentListAPIView(generics.ListAPIView):
    serializer_class = ContentListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Content.objects.filter(section_id=self.kwargs["section_id"])
        user = self.request.user
        queryset = _same_institution_queryset(queryset, user, relation="section__module__course__created_by__institution")

        if user.is_authenticated and _is_admin_user(user):
            return queryset

        if user.is_authenticated and _is_student_or_viewer_user(user):
            return queryset.filter(is_published=True)

        return queryset.filter(is_published=True)


class ContentCreateAPIView(generics.CreateAPIView):
    serializer_class = ContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, CanAddCourse]

    def perform_create(self, serializer):
        section_qs = Section.objects.filter(
            id=self.kwargs["section_id"],
            module__course_id=self.kwargs["course_id"],
        )
        if not self.request.user.is_superuser:
            section_qs = _same_institution_queryset(section_qs, self.request.user, relation="module__course__created_by__institution")
        section = get_object_or_404(section_qs)
        content = serializer.save(section=section, is_published=False)
        section.has_unpublished_changes=True
        section.save()
        # mark module
        section.module.has_unpublished_changes = True
        section.module.save()
        
        # mark course
        section.module.course.has_unpublished_changes = True
        section.module.course.save()

    def create(self, request, *args, **kwargs):
        try:
            section = get_object_or_404(
                Section,
                id=self.kwargs["section_id"],
                module__course_id=self.kwargs["course_id"],
            )
            
            # Get the next order number automatically
            max_order = Content.objects.filter(section=section).aggregate(
                max_order=models.Max('order')
            )['max_order']
            next_order = (max_order or 0) + 1
            
            # Prepare data with auto-calculated order
            data = request.data.copy()
            data['order'] = next_order
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(
                {"success": True, "message": "Content created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ContentRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = ContentDetailSerializer
    permission_classes = [IsAuthenticated, CanViewCourses]
    queryset = Content.objects.all()

    def get_queryset(self):
        queryset = _same_institution_queryset(super().get_queryset(), self.request.user, relation="section__module__course__created_by__institution")
        if self.request.user.is_authenticated and _is_admin_user(self.request.user):
            return queryset
        return queryset.filter(is_published=True)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            return Response(
                {"success": True, "message": "Content retrieved successfully", "data": self.get_serializer(instance).data},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": "Content not found", "errors": str(e)},
                status=status.HTTP_404_NOT_FOUND,
            )

class ModuleContentsAPIView(APIView):
    permission_classes = [IsAuthenticated, CanViewCourses]

    def get(self, request, module_id):
        module_qs = Module.objects.filter(id=module_id)
        if not request.user.is_superuser:
            module_qs = _same_institution_queryset(module_qs, request.user, relation="course__created_by__institution")
        module = get_object_or_404(module_qs)

        contents = Content.objects.filter(
            section__module=module
        ).select_related(
            "section"
        ).order_by(
            "section__order",
            "order"
        )

        data = [
            {
                "id": content.id,
                "title": content.title,
                "content_type": content.content_type,
                "description": content.description,
                "video_url": content.video_url,
                "text_content": content.text_content,
                "file": content.file.url if content.file else None,
                "order": content.order,
                "section_id": content.section.id,
                "section_title": content.section.title,
            }
            for content in contents
        ]

        return Response({
            "success": True,
            "module_id": module.id,
            "module_title": module.title,
            "contents": data
        })

class CourseSectionsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, course_id):
        course_qs = Course.objects.filter(id=course_id)
        if not request.user.is_superuser:
            course_qs = _same_institution_queryset(course_qs, request.user)
        course = get_object_or_404(course_qs)

        sections = Section.objects.filter(
            module__course=course
        ).select_related("module").order_by(
            "module__order",
            "order"
        )

        data = [
            {
                "id": section.id,
                "title": section.title,
                "order": section.order,
                "module": {
                    "id": section.module.id,
                    "title": section.module.title,
                    "order": section.module.order,
                },
            }
            for section in sections
        ]

        return Response({
            "status": "success",
            "count": len(data),
            "results": data
        })

class ContentUpdateAPIView(generics.UpdateAPIView):
    serializer_class = ContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, CanChangeCourse]
    queryset = Content.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="section__module__course__created_by__institution")

    def update(self, request, *args, **kwargs):

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # SAVE AS DRAFT
        if "title" in data:
            instance.draft_title = data["title"]

        if "content_type" in data:
            instance.draft_content_type = data["content_type"]

        if "description" in data:
            instance.draft_description = data["description"]

        if "video_url" in data:
            instance.draft_video_url = data["video_url"]

        if "text_content" in data:
            instance.draft_text_content = data["text_content"]

        if "file" in data:
            instance.draft_file = data["file"]

        if "order" in data:
            instance.draft_order = data["order"]

        # MARK AS UNPUBLISHED CHANGES
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": "Content changes saved as draft successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK,
        )


class ContentDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, CanDeleteCourse]
    queryset = Content.objects.all()

    def get_queryset(self):
        return _same_institution_queryset(super().get_queryset(), self.request.user, relation="section__module__course__created_by__institution")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if not instance.section.module.course.is_published:
            title = instance.title
            instance.delete()
            return Response(
                {
                    "success": True,
                    "message": f"Content '{title}' deleted successfully.",
                    "hard_deleted": True
                },
                status=status.HTTP_200_OK,
            )

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True
        instance.save()
        instance.section.has_unpublished_changes = True
        instance.section.save(update_fields=["has_unpublished_changes"])
        instance.section.module.has_unpublished_changes = True
        instance.section.module.save(update_fields=["has_unpublished_changes"])
        instance.section.module.course.has_unpublished_changes = True
        instance.section.module.course.save(update_fields=["has_unpublished_changes"])

        return Response(
            {
                "success": True,
                "message": f"Content '{instance.title}' marked for deletion. Publish changes to apply deletion.",
                "hard_deleted": False
            },
            status=status.HTTP_200_OK,
        )

class PublishCourseChangesAPIView(APIView):
    permission_classes = [IsAuthenticated, CanPublishCourse]

    def _filter_pending(self, items):
        remaining = []
        for item in items:
            if item.pending_delete:
                item.delete()
            else:
                remaining.append(item)
        return remaining

    def _normalize_orders(self, items, field_name, draft_field_name):
        ordered_items = sorted(
            items,
            key=lambda item: (
                getattr(item, draft_field_name)
                if getattr(item, draft_field_name) is not None
                else getattr(item, field_name),
                getattr(item, field_name),
                item.pk,
            ),
        )

        if not ordered_items:
            return

        current_orders = [getattr(item, field_name) for item in ordered_items]
        target_orders = [
            getattr(item, draft_field_name)
            if getattr(item, draft_field_name) is not None
            else getattr(item, field_name)
            for item in ordered_items
        ]
        offset = max(current_orders + target_orders) + 1

        # Move all items into a temporary non-conflicting range first.
        for temp_index, item in enumerate(ordered_items, start=1):
            temp_order = offset + temp_index
            if getattr(item, field_name) != temp_order:
                setattr(item, field_name, temp_order)
                item.save(update_fields=[field_name])

        # Then assign final normalized values.
        for new_order, item in enumerate(ordered_items, start=1):
            if getattr(item, field_name) != new_order:
                setattr(item, field_name, new_order)
                item.save(update_fields=[field_name])

    def post(self, request, course_id):
        serializer = PublishCourseChangesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = get_object_or_404(Course, id=course_id)

        with transaction.atomic():
            # =========================
            # 1. APPLY COURSE CHANGES
            # =========================
            if course.draft_title:
                course.title = course.draft_title

            if course.draft_description:
                course.description = course.draft_description

            if course.draft_duration:
                course.duration = course.draft_duration

            if course.draft_level:
                course.level = course.draft_level

            if course.draft_category:
                course.category = course.draft_category

            if course.draft_thumbnail:
                course.thumbnail = course.draft_thumbnail

            if course.draft_price is not None:
                course.price = course.draft_price

            # =========================
            # 2. HANDLE DELETE COURSE
            # =========================
            if course.pending_delete:
                course.delete()
                return Response({
                    "success": True,
                    "message": "Course deleted successfully"
                }, status=status.HTTP_200_OK)

            course.has_unpublished_changes = False

            # clear drafts
            course.draft_title = None
            course.draft_description = None
            course.draft_duration = None
            course.draft_level = None
            course.draft_category = None
            course.draft_thumbnail = None
            course.draft_price = None

            course.save()

            # =========================
            # 3. APPLY MODULES
            # =========================
            modules = list(course.modules.all())
            modules = self._filter_pending(modules)
            self._normalize_orders(modules, "order", "draft_order")

            for module in modules:
                if module.draft_title:
                    module.title = module.draft_title

                if module.draft_description:
                    module.description = module.draft_description

                module.has_unpublished_changes = False
                module.draft_title = None
                module.draft_description = None
                module.draft_order = None
                module.is_published = True
                module.save()

                # =========================
                # 4. APPLY SECTIONS
                # =========================
                sections = list(module.sections.all())
                sections = self._filter_pending(sections)
                self._normalize_orders(sections, "order", "draft_order")

                for section in sections:
                    if section.draft_title:
                        section.title = section.draft_title

                    section.has_unpublished_changes = False
                    section.draft_title = None
                    section.draft_order = None
                    section.is_published = True
                    section.save()

                    # =========================
                    # 5. APPLY CONTENTS
                    # =========================
                    contents = list(section.contents.all())
                    contents = self._filter_pending(contents)
                    self._normalize_orders(contents, "order", "draft_order")

                    for content in contents:
                        if content.draft_title:
                            content.title = content.draft_title

                        if content.draft_content_type:
                            content.content_type = content.draft_content_type

                        if content.draft_description:
                            content.description = content.draft_description

                        if content.draft_video_url:
                            content.video_url = content.draft_video_url

                        if content.draft_text_content:
                            content.text_content = content.draft_text_content

                        if content.draft_file:
                            content.file = content.draft_file

                        content.has_unpublished_changes = False
                        content.draft_title = None
                        content.draft_content_type = None
                        content.draft_description = None
                        content.draft_video_url = None
                        content.draft_text_content = None
                        content.draft_file = None
                        content.draft_order = None
                        content.is_published = True
                        content.save()
        deleted = apply_draft_changes(course)
        if deleted:
            return Response({
                "success": True,
                "message": "Course deleted successfully"
            }, status=status.HTTP_200_OK)

        return Response({
            "success": True,
            "message": "All course changes published successfully"
        }, status=status.HTTP_200_OK)
        
class LevelListAPIView(generics.ListAPIView):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer
    permission_classes = [AllowAny]

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()

            if not queryset.exists():
                return Response({
                    "success": False,
                    "message": "No levels found",
                    "data": []
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(queryset, many=True)

            return Response({
                "success": True,
                "message": "Levels retrieved successfully",
                "count": queryset.count(),
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": "Failed to retrieve levels",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LevelCreateAPIView(generics.CreateAPIView):
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated, CanManageMeta]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(
                {"success": True, "message": "Level created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LevelBulkCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanManageMeta]

    def post(self, request, *args, **kwargs):
        names = request.data.get("names", [])
        if not isinstance(names, list) or not names:
            return Response(
                {"success": False, "message": "Provide a non-empty list of level names."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_names = []
        existing_names = set(Level.objects.filter(name__in=names).values_list("name", flat=True))
        for name in names:
            clean_name = str(name).strip()
            if clean_name and clean_name not in existing_names and clean_name not in clean_names:
                clean_names.append(clean_name)

        created = [Level(name=name) for name in clean_names]
        Level.objects.bulk_create(created)
        all_levels = Level.objects.filter(name__in=existing_names.union(set(clean_names)))
        serializer = LevelSerializer(all_levels, many=True)

        return Response(
            {"success": True, "message": "Levels bulk created successfully", "count": all_levels.count(), "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class CategoryListAPIView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()

            if not queryset.exists():
                return Response({
                    "success": False,
                    "message": "No categories found",
                    "data": []
                }, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(queryset, many=True)

            return Response({
                "success": True,
                "message": "Categories retrieved successfully",
                "count": queryset.count(),
                "data": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "success": False,
                "message": "Failed to retrieve categories",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CategoryCreateAPIView(generics.CreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, CanManageMeta]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(
                {"success": True, "message": "Category created successfully", "data": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CategoryBulkCreateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanManageMeta]

    def post(self, request, *args, **kwargs):
        names = request.data.get("names", [])
        if not isinstance(names, list) or not names:
            return Response(
                {"success": False, "message": "Provide a non-empty list of category names."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        clean_names = []
        existing_names = set(Category.objects.filter(name__in=names).values_list("name", flat=True))
        for name in names:
            clean_name = str(name).strip()
            if clean_name and clean_name not in existing_names and clean_name not in clean_names:
                clean_names.append(clean_name)

        created = [Category(name=name) for name in clean_names]
        Category.objects.bulk_create(created)
        all_categories = Category.objects.filter(name__in=existing_names.union(set(clean_names)))
        serializer = CategorySerializer(all_categories, many=True)

        return Response(
            {"success": True, "message": "Categories bulk created successfully", "count": all_categories.count(), "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class CategoryUpdateAPIView(generics.UpdateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated, CanManageMeta]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(
                {"success": True, "message": "Category updated successfully", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CategoryDeleteAPIView(generics.DestroyAPIView):
    queryset = Category.objects.all()
    permission_classes = [IsAuthenticated, CanManageMeta]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Course.objects.filter(models.Q(category=instance) | models.Q(draft_category=instance)).exists():
            return Response(
                {"success": False, "message": "This category cannot be deleted because it is currently in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response({"success": True, "message": "Category deleted successfully"}, status=status.HTTP_200_OK)


class LevelUpdateAPIView(generics.UpdateAPIView):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer
    permission_classes = [IsAuthenticated, CanManageMeta]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(
                {"success": True, "message": "Level updated successfully", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LevelDeleteAPIView(generics.DestroyAPIView):
    queryset = Level.objects.all()
    permission_classes = [IsAuthenticated, CanManageMeta]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if Course.objects.filter(models.Q(level=instance) | models.Q(draft_level=instance)).exists():
            return Response(
                {"success": False, "message": "This level cannot be deleted because it is currently in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response({"success": True, "message": "Level deleted successfully"}, status=status.HTTP_200_OK)


class ModuleContentsAPIView(APIView):

    permission_classes = [IsAuthenticated, CanViewCourses]

    def get(self, request, course_id, module_id):

        module = get_object_or_404(
            Module,
            id=module_id,
            course_id=course_id
        )

        sections = module.sections.all().order_by("order")

        sections_data = []

        total_contents = 0

        for section in sections:

            contents = section.contents.all().order_by("order")

            contents_data = []

            for content in contents:

                total_contents += 1

                contents_data.append({
                    "content_id": content.id,
                    "title": content.title,
                    "description": content.description,
                    "content_type": content.content_type,
                    "video_url": content.video_url,
                    "file": content.file.url if content.file else None,
                    "order": content.order,
                    "is_preview": content.is_preview,
                })

            sections_data.append({
                "section_id": section.id,
                "section_title": section.title,
                "order": section.order,
                "total_contents": contents.count(),
                "contents": contents_data,
            })

        return Response({
            "success": True,
            "message": "Module contents retrieved successfully",
            "data": {
                "module_id": module.id,
                "module_title": module.title,
                "module_order": module.order,
                "total_sections": sections.count(),
                "total_contents": total_contents,
                "sections": sections_data,
            }
        })

class MediaUploadAPIView(generics.CreateAPIView):
    serializer_class = MediaUploadSerializer
    permission_classes = [IsAuthenticated, CanAddCourse]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "message": "Media uploaded successfully",
                "data": serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class PublicStatsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        User = get_user_model()
        total_students = User.objects.filter(role="student").count()
        total_instructors = User.objects.filter(role="instructor").count()
        total_courses = Course.objects.filter(is_published=True).count()
        return Response({
            "success": True,
            "data": {
                "total_students": total_students, 
                "total_instructors": total_instructors,
                "total_courses": total_courses,
            }
        })


