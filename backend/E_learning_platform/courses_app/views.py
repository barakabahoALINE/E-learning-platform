from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from .permissions import IsAdmin
from .models import Lesson, Course,Content 
from .serializers import (
    CourseCreateUpdateSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
    LessonSerializer,
    LessonContentCreateUpdateSerializer,
    LessonContentListSerializer,
    LessonContentDetailSerializer,
)

# =====================================
# 1️⃣ LIST COURSES (Public - Published Only)
# =====================================

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Course.objects.filter(is_published=True).select_related("category" , "level")


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
            # Catch validation errors
            return Response(
                {
                    "success": False,
                    "message": "Course creation failed",
                    "errors": serializer.errors if hasattr(serializer, "errors") else str(e)
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
        
class LessonCreateAPIView(generics.CreateAPIView):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_course(self):
        return Course.objects.get(id=self.kwargs["course_id"])

    def create(self, request, *args, **kwargs):
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

# Retrieve content
class LessonContentRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = LessonContentDetailSerializer
    permission_classes = [AllowAny]
    queryset = Content.objects.all()

# Update content (Admin)
class LessonContentUpdateAPIView(generics.UpdateAPIView):
    serializer_class = LessonContentCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()

# Delete content (Admin)
class LessonContentDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = Content.objects.all()
