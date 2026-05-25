# from rest_framework import generics, status
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
from .permissions import IsAdmin
from rest_framework.exceptions import ValidationError
from .models import Content, Section, Module, Course
from .serializers import *

# ═══════════════════════════════════════════════
# COURSE VIEWS  (unchanged logic, updated names)
# ═══════════════════════════════════════════════

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Course.objects.select_related("category", "level")
        user = self.request.user
        if user.is_authenticated and getattr(user, "role", None) == "admin":
            return queryset
        return queryset.filter(is_published=True)
    
    
class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

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
    permission_classes = [IsAuthenticated]
    queryset = Course.objects.select_related("category", "level", "created_by")

    def get_object(self):
        course = super().get_object()
        if course.is_published:
            return course
        user = self.request.user
        if user.is_authenticated and user.role == "admin":
            return course
        raise PermissionDenied("Course is not published.")


class CourseUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def update(self, request, *args, **kwargs):

        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True
        )

        serializer.is_valid(raise_exception=True)

        # STORE AS DRAFT CHANGES
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

        # MARK AS HAVING UNPUBLISHED CHANGES
        instance.has_unpublished_changes = True

        instance.save()

        return Response({
            "success": True,
            "message": "Course changes saved as draft successfully",
            "data": serializer.data
        }, status=status.HTTP_200_OK)



class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        # DON'T DELETE DIRECTLY
        # MARK FOR DELETE ONLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True

        instance.save()

        return Response({
            "success": True,
            "message": f"Course '{instance.title}' marked for deletion. Publish changes to apply deletion."
        }, status=status.HTTP_200_OK)
        
class CoursePublishAPIView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

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
        course.has_unpublished_changes = False
        course.is_published = True
        course.save()

        # =========================
        # PUBLISH ASSESSMENTS
        # =========================
        assessments = course.assessments.all()

        for assessment in assessments:
            assessment.has_unpublished_changes = False
            assessment.is_published = True
            assessment.save()

        # =========================
        # PUBLISH MODULES
        # =========================
        modules = course.modules.all()

        for module in modules:

            module.has_unpublished_changes = False
            module.is_published = True
            module.save()

            # =========================
            # PUBLISH SECTIONS
            # =========================
            sections = module.sections.all()

            for section in sections:

                section.has_unpublished_changes = False
                section.is_published = True
                section.save()

                # =========================
                # PUBLISH CONTENTS
                # =========================
                contents = section.contents.all()

                for content in contents:

                    content.has_unpublished_changes = False
                    content.is_published = True
                    content.save()

        return Response({
            "success": True,
            "message": "Course and all related items published successfully."
        })
        
class CourseUnpublishAPIView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def post(self, request, pk):

        course = self.get_object()

        # =========================
        # UNPUBLISH COURSE
        # =========================
        course.is_published = False
        course.save()

        # =========================
        # UNPUBLISH ASSESSMENTS
        # =========================
        assessments = course.assessments.all()

        for assessment in assessments:
            assessment.is_published = False
            assessment.save()

        # =========================
        # UNPUBLISH MODULES
        # =========================
        modules = course.modules.all()

        for module in modules:

            module.is_published = False
            module.save()

            # =========================
            # UNPUBLISH SECTIONS
            # =========================
            sections = module.sections.all()

            for section in sections:

                section.is_published = False
                section.save()

                # =========================
                # UNPUBLISH CONTENTS
                # =========================
                contents = section.contents.all()

                for content in contents:

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
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_course(self):
        return get_object_or_404(Course, id=self.kwargs["course_id"])

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
        
        if user.is_authenticated and getattr(user, "role", None) == "admin":
            return queryset

        return queryset.filter(is_published=True)
 

class ModuleUpdateAPIView(generics.UpdateAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Module.objects.all()

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
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Module.objects.all()

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": f"Module '{instance.title}' marked for deletion. Publish changes to apply deletion."
            },
            status=status.HTTP_200_OK,
        )

# ═══════════════════════════════════════════════
# SECTION VIEWS  (replaces Lesson views)
# ═══════════════════════════════════════════════

class SectionCreateAPIView(generics.CreateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_module(self):
        return get_object_or_404(
            Module,
            id=self.kwargs["module_id"],
            # course_id=self.kwargs["course_id"],
        )

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
        if user.is_authenticated and getattr(user, "role", None) == "admin":
            return queryset

        return queryset.filter(is_published=True)


class SectionUpdateAPIView(generics.UpdateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Section.objects.all()

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
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Section.objects.all()

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": f"Section '{instance.title}' marked for deletion. Publish changes to apply deletion."
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
        
        if user.is_authenticated and getattr(user, "role", None) == "admin":
            return queryset
        return queryset.filter(is_published=True)


class ContentCreateAPIView(generics.CreateAPIView):
    serializer_class = ContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        section = get_object_or_404(
            Section,
            id=self.kwargs["section_id"],
            module__course_id=self.kwargs["course_id"],
        )
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
    permission_classes = [AllowAny]
    queryset = Content.objects.all()

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
    permission_classes = [IsAuthenticated]

    def get(self, request, module_id):

        module = get_object_or_404(Module, id=module_id)

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
        sections = Section.objects.filter(
            module__course_id=course_id
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
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

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
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()

        # DON'T DELETE DIRECTLY
        instance.pending_delete = True
        instance.has_unpublished_changes = True

        instance.save()

        return Response(
            {
                "success": True,
                "message": f"Content '{instance.title}' marked for deletion. Publish changes to apply deletion."
            },
            status=status.HTTP_200_OK,
        )

class PublishCourseChangesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

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
            # 2.5 APPLY ASSESSMENTS
            # =========================
            assessments = list(course.assessments.all())
            for assessment in assessments:
                assessment.has_unpublished_changes = False
                assessment.is_published = True
                assessment.save()

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
    permission_classes = [IsAuthenticated, IsAdmin]

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
    permission_classes = [IsAuthenticated, IsAdmin]

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
        
class ModuleContentsAPIView(APIView):

    permission_classes = [IsAuthenticated]

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

# class CourseListAPIView(generics.ListAPIView):
#     serializer_class = CourseListSerializer
#     permission_classes = [AllowAny]

#     def get_queryset(self):
#         queryset = Course.objects.select_related("category", "level")
#         user = self.request.user
#         if user.is_authenticated and getattr(user, "role", None) == "admin":
#             return queryset
#         return queryset.filter(is_published=True)
    
    
# class CourseCreateAPIView(generics.CreateAPIView):
#     serializer_class = CourseCreateUpdateSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)

#         try:
#             serializer.is_valid(raise_exception=True)
#             self.perform_create(serializer)

#             return Response({
#                 "success": True,
#                 "message": "Course created successfully",
#                 "data": serializer.data
#             }, status=status.HTTP_201_CREATED)

#         except ValidationError as e:
#             return Response({
#                 "success": False,
#                 "message": "Validation error",
#                 "errors": e.detail
#             }, status=status.HTTP_400_BAD_REQUEST)



# class CourseRetrieveAPIView(generics.RetrieveAPIView):
#     serializer_class = CourseDetailSerializer
#     permission_classes = [IsAuthenticated]
#     queryset = Course.objects.select_related("category", "level", "created_by")

#     def get_object(self):
#         course = super().get_object()
#         if course.is_published:
#             return course
#         user = self.request.user
#         if user.is_authenticated and user.role == "admin":
#             return course
#         raise PermissionDenied("Course is not published.")


# class CourseUpdateAPIView(generics.UpdateAPIView):
#     serializer_class = CourseCreateUpdateSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Course.objects.all()

#     def update(self, request, *args, **kwargs):

#         instance = self.get_object()

#         serializer = self.get_serializer(
#             instance,
#             data=request.data,
#             partial=True
#         )

#         serializer.is_valid(raise_exception=True)

#         # STORE AS DRAFT CHANGES
#         data = serializer.validated_data

#         if "title" in data:
#             instance.draft_title = data["title"]

#         if "description" in data:
#             instance.draft_description = data["description"]

#         if "duration" in data:
#             instance.draft_duration = data["duration"]

#         if "level" in data:
#             instance.draft_level = data["level"]

#         if "category" in data:
#             instance.draft_category = data["category"]

#         if "thumbnail" in data:
#             instance.draft_thumbnail = data["thumbnail"]

#         if "price" in data:
#             instance.draft_price = data["price"]

#         # MARK AS HAVING UNPUBLISHED CHANGES
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response({
#             "success": True,
#             "message": "Course changes saved as draft successfully",
#             "data": serializer.data
#         }, status=status.HTTP_200_OK)



# class CourseDeleteAPIView(generics.DestroyAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Course.objects.all()

#     def destroy(self, request, *args, **kwargs):

#         instance = self.get_object()

#         # DON'T DELETE DIRECTLY
#         # MARK FOR DELETE ONLY
#         instance.pending_delete = True
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response({
#             "success": True,
#             "message": f"Course '{instance.title}' marked for deletion. Publish changes to apply deletion."
#         }, status=status.HTTP_200_OK)
        
# class CoursePublishAPIView(generics.GenericAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Course.objects.all()

#     def post(self, request, pk):
#         course = self.get_object()
#         if course.price < 0:
#             return Response(
#                 {"error": "Course must have a price before publishing."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )
#         course.is_published = True
#         course.save()
#         return Response({"success": True, "message": "Course published successfully."})


# class CourseUnpublishAPIView(generics.GenericAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Course.objects.all()

#     def post(self, request, pk):
#         course = self.get_object()
#         course.is_published = False
#         course.save()
#         return Response({"success": True, "message": "Course unpublished successfully."})


# # ═══════════════════════════════════════════════
# # MODULE VIEWS
# # ═══════════════════════════════════════════════

# class ModuleCreateAPIView(generics.CreateAPIView):
#     serializer_class = ModuleSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def get_course(self):
#         return get_object_or_404(Course, id=self.kwargs["course_id"])

#     def create(self, request, *args, **kwargs):
#         try:
#             serializer = self.get_serializer(data=request.data)
#             serializer.is_valid(raise_exception=True)
#             course = self.get_course()
#             serializer.save(course=course)
#             return Response(
#                 {"success": True, "message": "Module created successfully", "data": serializer.data},
#                 status=status.HTTP_201_CREATED,
#             )
#         except ValidationError as e:
#             return Response(
#                 {
#                     "success": False,
#                     "message": "Module creation failed",
#                     "error": e.detail[0] if isinstance(e.detail, list) else e.detail,
#                 },
#                 status=status.HTTP_400_BAD_REQUEST,
#             )


# class ModuleListAPIView(generics.ListAPIView):
#     serializer_class = ModuleSerializer

#     def get_queryset(self):
#         return Module.objects.filter(course_id=self.kwargs["course_id"])
 

# class ModuleUpdateAPIView(generics.UpdateAPIView):
#     serializer_class = ModuleSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Module.objects.all()

#     def update(self, request, *args, **kwargs):

#         instance = self.get_object()

#         serializer = self.get_serializer(
#             instance,
#             data=request.data,
#             partial=True
#         )

#         serializer.is_valid(raise_exception=True)

#         data = serializer.validated_data

#         # SAVE AS DRAFT
#         if "title" in data:
#             instance.draft_title = data["title"]

#         if "description" in data:
#             instance.draft_description = data["description"]

#         if "order" in data:
#             instance.draft_order = data["order"]

#         # MARK AS UNPUBLISHED CHANGES
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": "Module changes saved as draft successfully",
#                 "data": serializer.data
#             },
#             status=status.HTTP_200_OK,
#         )


# class ModuleDeleteAPIView(generics.DestroyAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Module.objects.all()

#     def destroy(self, request, *args, **kwargs):

#         instance = self.get_object()

#         # DON'T DELETE DIRECTLY
#         instance.pending_delete = True
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": f"Module '{instance.title}' marked for deletion. Publish changes to apply deletion."
#             },
#             status=status.HTTP_200_OK,
#         )

# # ═══════════════════════════════════════════════
# # SECTION VIEWS  (replaces Lesson views)
# # ═══════════════════════════════════════════════

# class SectionCreateAPIView(generics.CreateAPIView):
#     serializer_class = SectionSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def get_module(self):
#         return get_object_or_404(
#             Module,
#             id=self.kwargs["module_id"],
#             # course_id=self.kwargs["course_id"],
#         )

#     def create(self, request, *args, **kwargs):
#         try:
#             serializer = self.get_serializer(data=request.data)
#             serializer.is_valid(raise_exception=True)
#             module = self.get_module()
#             serializer.save(module=module)
#             return Response(
#                 {"success": True, "message": "Section created successfully", "data": serializer.data},
#                 status=status.HTTP_201_CREATED,
#             )
#         except ValidationError as e:
#             return Response(
#                 {
#                     "success": False,
#                     "message": "Section creation failed",
#                     "error": e.detail[0] if isinstance(e.detail, list) else e.detail,
#                 },
#                 status=status.HTTP_400_BAD_REQUEST,
#             )


# class SectionListAPIView(generics.ListAPIView):
#     serializer_class = SectionSerializer

#     def get_queryset(self):
#         return Section.objects.filter(module_id=self.kwargs["module_id"])


# class SectionUpdateAPIView(generics.UpdateAPIView):
#     serializer_class = SectionSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Section.objects.all()

#     def update(self, request, *args, **kwargs):

#         instance = self.get_object()

#         serializer = self.get_serializer(
#             instance,
#             data=request.data,
#             partial=True
#         )

#         serializer.is_valid(raise_exception=True)

#         data = serializer.validated_data

#         # SAVE AS DRAFT
#         if "title" in data:
#             instance.draft_title = data["title"]

#         if "order" in data:
#             instance.draft_order = data["order"]

#         # MARK AS UNPUBLISHED CHANGES
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": "Section changes saved as draft successfully",
#                 "data": serializer.data
#             },
#             status=status.HTTP_200_OK,
#         )


# class SectionDeleteAPIView(generics.DestroyAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Section.objects.all()

#     def destroy(self, request, *args, **kwargs):

#         instance = self.get_object()

#         # DON'T DELETE DIRECTLY
#         instance.pending_delete = True
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": f"Section '{instance.title}' marked for deletion. Publish changes to apply deletion."
#             },
#             status=status.HTTP_200_OK,
#         )

# # ═══════════════════════════════════════════════
# # CONTENT VIEWS
# # ═══════════════════════════════════════════════

# class ContentListAPIView(generics.ListAPIView):
#     serializer_class = ContentListSerializer
#     permission_classes = [AllowAny]

#     def get_queryset(self):
#         return Content.objects.filter(section_id=self.kwargs["section_id"])


# class ContentCreateAPIView(generics.CreateAPIView):
#     serializer_class = ContentCreateUpdateSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def perform_create(self, serializer):
#         section = get_object_or_404(
#             Section,
#             id=self.kwargs["section_id"],
#             module__course_id=self.kwargs["course_id"],
#         )
#         serializer.save(section=section)

#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         try:
#             serializer.is_valid(raise_exception=True)
#             self.perform_create(serializer)
#             return Response(
#                 {"success": True, "message": "Content created successfully", "data": serializer.data},
#                 status=status.HTTP_201_CREATED,
#             )
#         except ValidationError as e:
#             return Response(
#                 {"success": False, "message": "Validation error", "errors": e.detail},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )


# class ContentRetrieveAPIView(generics.RetrieveAPIView):
#     serializer_class = ContentDetailSerializer
#     permission_classes = [AllowAny]
#     queryset = Content.objects.all()

#     def retrieve(self, request, *args, **kwargs):
#         try:
#             instance = self.get_object()
#             return Response(
#                 {"success": True, "message": "Content retrieved successfully", "data": self.get_serializer(instance).data},
#                 status=status.HTTP_200_OK,
#             )
#         except Exception as e:
#             return Response(
#                 {"success": False, "message": "Content not found", "errors": str(e)},
#                 status=status.HTTP_404_NOT_FOUND,
#             )

# class ModuleContentsAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request, module_id):

#         module = get_object_or_404(Module, id=module_id)

#         contents = Content.objects.filter(
#             section__module=module
#         ).select_related(
#             "section"
#         ).order_by(
#             "section__order",
#             "order"
#         )

#         data = [
#             {
#                 "id": content.id,
#                 "title": content.title,
#                 "content_type": content.content_type,
#                 "description": content.description,
#                 "video_url": content.video_url,
#                 "text_content": content.text_content,
#                 "file": content.file.url if content.file else None,
#                 "order": content.order,
#                 "section_id": content.section.id,
#                 "section_title": content.section.title,
#             }
#             for content in contents
#         ]

#         return Response({
#             "success": True,
#             "module_id": module.id,
#             "module_title": module.title,
#             "contents": data
#         })

# class ContentUpdateAPIView(generics.UpdateAPIView):
#     serializer_class = ContentCreateUpdateSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Content.objects.all()

#     def update(self, request, *args, **kwargs):

#         instance = self.get_object()

#         serializer = self.get_serializer(
#             instance,
#             data=request.data,
#             partial=True
#         )

#         serializer.is_valid(raise_exception=True)

#         data = serializer.validated_data

#         # SAVE AS DRAFT
#         if "title" in data:
#             instance.draft_title = data["title"]

#         if "content_type" in data:
#             instance.draft_content_type = data["content_type"]

#         if "description" in data:
#             instance.draft_description = data["description"]

#         if "video_url" in data:
#             instance.draft_video_url = data["video_url"]

#         if "text_content" in data:
#             instance.draft_text_content = data["text_content"]

#         if "file" in data:
#             instance.draft_file = data["file"]

#         if "order" in data:
#             instance.draft_order = data["order"]

#         # MARK AS UNPUBLISHED CHANGES
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": "Content changes saved as draft successfully",
#                 "data": serializer.data
#             },
#             status=status.HTTP_200_OK,
#         )


# class ContentDeleteAPIView(generics.DestroyAPIView):
#     permission_classes = [IsAuthenticated, IsAdmin]
#     queryset = Content.objects.all()

#     def destroy(self, request, *args, **kwargs):

#         instance = self.get_object()

#         # DON'T DELETE DIRECTLY
#         instance.pending_delete = True
#         instance.has_unpublished_changes = True

#         instance.save()

#         return Response(
#             {
#                 "success": True,
#                 "message": f"Content '{instance.title}' marked for deletion. Publish changes to apply deletion."
#             },
#             status=status.HTTP_200_OK,
#         )

# class PublishCourseChangesAPIView(APIView):
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def post(self, request, course_id):

#         serializer = PublishCourseChangesSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)

#         course = get_object_or_404(Course, id=course_id)

#         with transaction.atomic():

#             # =========================
#             # 1. APPLY COURSE CHANGES
#             # =========================
#             if course.draft_title:
#                 course.title = course.draft_title

#             if course.draft_description:
#                 course.description = course.draft_description

#             if course.draft_duration:
#                 course.duration = course.draft_duration

#             if course.draft_level:
#                 course.level = course.draft_level

#             if course.draft_category:
#                 course.category = course.draft_category

#             if course.draft_thumbnail:
#                 course.thumbnail = course.draft_thumbnail

#             if course.draft_price is not None:
#                 course.price = course.draft_price

#             # =========================
#             # 2. HANDLE DELETE COURSE
#             # =========================
#             if course.pending_delete:
#                 course.delete()
#                 return Response({
#                     "success": True,
#                     "message": "Course deleted successfully"
#                 }, status=status.HTTP_200_OK)

#             course.has_unpublished_changes = False

#             # clear drafts
#             course.draft_title = None
#             course.draft_description = None
#             course.draft_duration = None
#             course.draft_level = None
#             course.draft_category = None
#             course.draft_thumbnail = None
#             course.draft_price = None

#             course.save()

#             # =========================
#             # 3. APPLY MODULES
#             # =========================
#             modules = course.modules.all()

#             for module in modules:

#                 if module.pending_delete:
#                     module.delete()
#                     continue

#                 if module.draft_title:
#                     module.title = module.draft_title

#                 if module.draft_description:
#                     module.description = module.draft_description

#                 if module.draft_order is not None:
#                     module.order = module.draft_order

#                 module.has_unpublished_changes = False

#                 module.draft_title = None
#                 module.draft_description = None
#                 module.draft_order = None

#                 module.save()

#                 # =========================
#                 # 4. APPLY SECTIONS
#                 # =========================
#                 for section in module.sections.all():

#                     if section.pending_delete:
#                         section.delete()
#                         continue

#                     if section.draft_title:
#                         section.title = section.draft_title

#                     if section.draft_order is not None:
#                         section.order = section.draft_order

#                     section.has_unpublished_changes = False

#                     section.draft_title = None
#                     section.draft_order = None

#                     section.save()

#                     # =========================
#                     # 5. APPLY CONTENTS
#                     # =========================
#                     for content in section.contents.all():

#                         if content.pending_delete:
#                             content.delete()
#                             continue

#                         if content.draft_title:
#                             content.title = content.draft_title

#                         if content.draft_content_type:
#                             content.content_type = content.draft_content_type

#                         if content.draft_description:
#                             content.description = content.draft_description

#                         if content.draft_video_url:
#                             content.video_url = content.draft_video_url

#                         if content.draft_text_content:
#                             content.text_content = content.draft_text_content

#                         if content.draft_file:
#                             content.file = content.draft_file

#                         if content.draft_order is not None:
#                             content.order = content.draft_order

#                         content.has_unpublished_changes = False

#                         content.draft_title = None
#                         content.draft_content_type = None
#                         content.draft_description = None
#                         content.draft_video_url = None
#                         content.draft_text_content = None
#                         content.draft_file = None
#                         content.draft_order = None

#                         content.save()

#         return Response({
#             "success": True,
#             "message": "All course changes published successfully"
#         }, status=status.HTTP_200_OK)


        
# class LevelListAPIView(generics.ListAPIView):
#     queryset = Level.objects.all()
#     serializer_class = LevelSerializer
#     permission_classes = [AllowAny]

#     def list(self, request, *args, **kwargs):
#         try:
#             queryset = self.get_queryset()

#             if not queryset.exists():
#                 return Response({
#                     "success": False,
#                     "message": "No levels found",
#                     "data": []
#                 }, status=status.HTTP_404_NOT_FOUND)

#             serializer = self.get_serializer(queryset, many=True)

#             return Response({
#                 "success": True,
#                 "message": "Levels retrieved successfully",
#                 "count": queryset.count(),
#                 "data": serializer.data
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({
#                 "success": False,
#                 "message": "Failed to retrieve levels",
#                 "error": str(e)
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class LevelCreateAPIView(generics.CreateAPIView):
#     serializer_class = LevelSerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         try:
#             serializer.is_valid(raise_exception=True)
#             self.perform_create(serializer)
#             return Response(
#                 {"success": True, "message": "Level created successfully", "data": serializer.data},
#                 status=status.HTTP_201_CREATED,
#             )
#         except ValidationError as e:
#             return Response(
#                 {"success": False, "message": "Validation error", "errors": e.detail},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )


# class CategoryListAPIView(generics.ListAPIView):
#     queryset = Category.objects.all()
#     serializer_class = CategorySerializer
#     permission_classes = [AllowAny]

#     def list(self, request, *args, **kwargs):
#         try:
#             queryset = self.get_queryset()

#             if not queryset.exists():
#                 return Response({
#                     "success": False,
#                     "message": "No categories found",
#                     "data": []
#                 }, status=status.HTTP_404_NOT_FOUND)

#             serializer = self.get_serializer(queryset, many=True)

#             return Response({
#                 "success": True,
#                 "message": "Categories retrieved successfully",
#                 "count": queryset.count(),
#                 "data": serializer.data
#             }, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({
#                 "success": False,
#                 "message": "Failed to retrieve categories",
#                 "error": str(e)
#             }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# class CategoryCreateAPIView(generics.CreateAPIView):
#     serializer_class = CategorySerializer
#     permission_classes = [IsAuthenticated, IsAdmin]

#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         try:
#             serializer.is_valid(raise_exception=True)
#             self.perform_create(serializer)
#             return Response(
#                 {"success": True, "message": "Category created successfully", "data": serializer.data},
#                 status=status.HTTP_201_CREATED,
#             )
#         except ValidationError as e:
#             return Response(
#                 {"success": False, "message": "Validation error", "errors": e.detail},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )
        
# class ModuleContentsAPIView(APIView):

#     permission_classes = [IsAuthenticated]

#     def get(self, request, course_id, module_id):

#         module = get_object_or_404(
#             Module,
#             id=module_id,
#             course_id=course_id
#         )

#         sections = module.sections.all().order_by("order")

#         sections_data = []

#         total_contents = 0

#         for section in sections:

#             contents = section.contents.all().order_by("order")

#             contents_data = []

#             for content in contents:

#                 total_contents += 1

#                 contents_data.append({
#                     "content_id": content.id,
#                     "title": content.title,
#                     "description": content.description,
#                     "content_type": content.content_type,
#                     "video_url": content.video_url,
#                     "file": content.file.url if content.file else None,
#                     "order": content.order,
#                     "is_preview": content.is_preview,
#                 })

#             sections_data.append({
#                 "section_id": section.id,
#                 "section_title": section.title,
#                 "order": section.order,
#                 "total_contents": contents.count(),
#                 "contents": contents_data,
#             })

#         return Response({
#             "success": True,
#             "message": "Module contents retrieved successfully",
#             "data": {
#                 "module_id": module.id,
#                 "module_title": module.title,
#                 "module_order": module.order,
#                 "total_sections": sections.count(),
#                 "total_contents": total_contents,
#                 "sections": sections_data,
#             }
#         })   


# class ModuleContentsAPIView(APIView):

#     def get(self, request, course_id, module_id):

#         module = get_object_or_404(
#             Module,
#             id=module_id,
#             course_id=course_id
#         )

#         contents = Content.objects.filter(
#             section__module=module
#         ).select_related(
#             "section"
#         ).order_by(
#             "section__order",
#             "order"
#         )

#         data = []

#         for content in contents:
#             data.append({
#                 "id": content.id,
#                 "title": content.title,
#                 "content_type": content.content_type,
#                 "order": content.order,

#                 "section": {
#                     "id": content.section.id,
#                     "title": content.section.title,
#                     "order": content.section.order,
#                 }
#             })

#         return Response({
#             "status": "success",
#             "module_id": module.id,
#             "module_title": module.title,
#             "count": len(data),
#             "results": data
#         })