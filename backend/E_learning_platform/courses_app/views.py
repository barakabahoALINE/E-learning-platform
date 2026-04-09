from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .permissions import IsAdmin
from django.shortcuts import get_object_or_404
from courses_app.models import Lesson
from rest_framework.exceptions import ValidationError
from .models import Content, Lesson, Course, Level, Category, MediaUpload
from .serializers import (
    CourseCreateUpdateSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    LessonSerializer,
    LessonContentCreateUpdateSerializer,
    LessonContentListSerializer,
    LessonContentDetailSerializer,
    LevelSerializer,
    CategorySerializer,
)

# =====================================
# 1️⃣ LIST COURSES (Public - Published Only)
# =====================================

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Course.objects.select_related("category", "level", "created_by")
        is_admin = self.request.query_params.get("admin", "false").lower() == "true"
        if is_admin:
            return queryset
        return queryset.filter(is_published=True)

class LevelListAPIView(generics.ListAPIView):
    queryset = Level.objects.all()
    serializer_class = LevelSerializer
    permission_classes = [AllowAny]


class CategoryListAPIView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


# =====================================
# 2️⃣ CREATE COURSE (Instructor Only)
# =====================================

class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            # Save with instructor
            self.perform_create(serializer)
            return Response(
                {
                    "success": True,
                    "message": "Course created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            error_data = serializer.errors if hasattr(serializer, "errors") and serializer.errors else str(e)
            return Response(
                {
                    "success": False,
                    "message": "Course creation failed",
                    "errors": error_data
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


# =====================================
# 3️⃣ RETRIEVE COURSE
# =====================================

class CourseRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [AllowAny]

    queryset = Course.objects.select_related("category", "level", "created_by")

    def get_object(self):
        course = super().get_object()
        if course.is_published:
                return course

            # If not published → allow only admin users
        user = self.request.user

        if user.is_authenticated and user.role == "admin":
                return course

        raise PermissionDenied("Course is not published.")


# =====================================
# 4️⃣ UPDATE COURSE (Owner Only)
# =====================================

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


# =====================================
# 5️⃣ DELETE COURSE (Instructor Only)
# =====================================

class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        title = instance.title
        self.perform_destroy(instance)
        return Response(
            {"success": True, "message": f"Course '{title}' deleted successfully"},
            status=status.HTTP_200_OK
        )
    

# =====================================


# 6️⃣ PUBLISH COURSE (Instructor)
# =====================================

class CoursePublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()

        if course.price < 0:
            return Response(
                {"error": "Course must have a price before publishing."},
                status=status.HTTP_400_BAD_REQUEST
            )

        course.is_published = True
        course.save()

        return Response(
            {"success": True, "message": "Course published successfully."}
        )


# =====================================
# 7️⃣ UNPUBLISH COURSE(Admin)
# =====================================

class CourseUnpublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()
        course.is_published = False
        course.save()

        return Response(
            {"success": True, "message": "Course unpublished successfully."}
        )
        
from rest_framework.exceptions import ValidationError

class LessonCreateAPIView(generics.CreateAPIView):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_course(self):
        return Course.objects.get(id=self.kwargs["course_id"])

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            course = self.get_course()
            serializer.save(course=course)

            return Response(
                {
                    "success": True,
                    "message": "Lesson created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Lesson create failed",
                    "error": e.detail[0] if isinstance(e.detail, list) else e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
class LessonListAPIView(generics.ListAPIView):
     serializer_class = LessonSerializer

     def get_queryset(self):
        course_id = self.kwargs["course_id"]
        return Lesson.objects.filter(course_id=course_id)
    
class LessonUpdateAPIView(generics.UpdateAPIView):
     serializer_class = LessonSerializer
     permission_classes = [IsAuthenticated, IsAdmin]
     queryset = Lesson.objects.all()

     def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "success": True,
                "message": "Lesson updated successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )
        
class LessonDeleteAPIView(generics.DestroyAPIView):
     permission_classes = [IsAuthenticated, IsAdmin]
     queryset = Lesson.objects.all()

     def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        lesson_title = instance.title
        self.perform_destroy(instance)

        return Response(
            {
                "success": True,
                "message": f"Lesson '{lesson_title}' deleted successfully"
            },
            status=status.HTTP_200_OK
        )
    
class LessonContentListAPIView(generics.ListAPIView):
    serializer_class = LessonContentListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        lesson_id = self.kwargs["lesson_id"]
        return Content.objects.filter(lesson_id=lesson_id)

# Create content (Admin only)

class LessonContentCreateAPIView(generics.CreateAPIView):
    serializer_class = LessonContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        course_id = self.kwargs.get("course_id")
        lesson_id = self.kwargs.get("lesson_id")

        lesson = get_object_or_404(
            Lesson,
            id=lesson_id,
            course_id=course_id
        )

        serializer.save(lesson=lesson)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            return Response(
                {
                    "success": True,
                    "message": "Content created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Validation error",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )

class LessonContentRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = LessonContentDetailSerializer
    permission_classes = [AllowAny]
    queryset = Content.objects.all()
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)

            return Response(
                {
                    "success": True,
                    "message": "Content retrieved successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Content not found",
                    "errors": str(e)
                },
                status=status.HTTP_404_NOT_FOUND
            )
# Update content (Admin)
class LessonContentUpdateAPIView(generics.UpdateAPIView):
    serializer_class = LessonContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()
    
    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()

            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)

            return Response(
                {
                    "success": True,
                    "message": "Content updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )

        except ValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": "Validation error",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
# Delete content (Admin)
class LessonContentDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)

            return Response(
                {
                    "success": True,
                    "message": "Content deleted successfully",
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {
                    "success": False,
                    "message": "Failed to delete content",
                    "errors": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
class MediaUploadAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response(
                {"success": False, "message": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            media = MediaUpload.objects.create(file=file)
            url = request.build_absolute_uri(media.file.url)
            
            return Response({
                "success": True,
                "message": "File uploaded successfully",
                "url": url,
                "id": media.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
