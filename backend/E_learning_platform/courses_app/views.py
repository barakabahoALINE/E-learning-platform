from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
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
        return Course.objects.filter(is_published=True).select_related("category", "level")
    
    
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
    permission_classes = [AllowAny]
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
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response({
            "success": True,
            "message": "Course updated successfully",
            "data": serializer.data
        })


class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        title = instance.title
        self.perform_destroy(instance)
        return Response(
            {"success": True, "message": f"Course '{title}' deleted successfully"},
            status=status.HTTP_200_OK,
        )


class CoursePublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()
        if course.price < 0:
            return Response(
                {"error": "Course must have a price before publishing."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course.is_published = True
        course.save()
        return Response({"success": True, "message": "Course published successfully."})


class CourseUnpublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()
        course.is_published = False
        course.save()
        return Response({"success": True, "message": "Course unpublished successfully."})


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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            course = self.get_course()
            serializer.save(course=course)
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
        return Module.objects.filter(course_id=self.kwargs["course_id"])
 

class ModuleUpdateAPIView(generics.UpdateAPIView):
    serializer_class = ModuleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Module.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Module updated successfully", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


class ModuleDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Module.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        title = instance.title
        self.perform_destroy(instance)
        return Response(
            {"success": True, "message": f"Module '{title}' deleted successfully"},
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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            module = self.get_module()
            serializer.save(module=module)
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
        return Section.objects.filter(module_id=self.kwargs["module_id"])


class SectionUpdateAPIView(generics.UpdateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Section.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"success": True, "message": "Section updated successfully", "data": serializer.data},
            status=status.HTTP_200_OK,
        )


class SectionDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Section.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        title = instance.title
        self.perform_destroy(instance)
        return Response(
            {"success": True, "message": f"Section '{title}' deleted successfully"},
            status=status.HTTP_200_OK,
        )


# ═══════════════════════════════════════════════
# CONTENT VIEWS
# ═══════════════════════════════════════════════

class ContentListAPIView(generics.ListAPIView):
    serializer_class = ContentListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Content.objects.filter(section_id=self.kwargs["section_id"])


class ContentCreateAPIView(generics.CreateAPIView):
    serializer_class = ContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        section = get_object_or_404(
            Section,
            id=self.kwargs["section_id"],
            module__course_id=self.kwargs["course_id"],
        )
        serializer.save(section=section)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
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

class ContentUpdateAPIView(generics.UpdateAPIView):
    serializer_class = ContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop("partial", False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(
                {"success": True, "message": "Content updated successfully", "data": serializer.data},
                status=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return Response(
                {"success": False, "message": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ContentDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(
                {"success": True, "message": "Content deleted successfully"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"success": False, "message": "Failed to delete content", "errors": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        
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
        
    



