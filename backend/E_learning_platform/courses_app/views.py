
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status    
from .models import Section, Course
from .serializers import SectionSerializer
from .permissions import IsCourseInstructor, IsInstructor, IsSectionInstructor


from .serializers import (
    CourseCreateUpdateSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
)

# =====================================
# 1️⃣ LIST COURSES (Public - Published Only)
# =====================================

class CourseListAPIView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Course.objects.filter(is_published=True).select_related("instructor")


# =====================================
# 2️⃣ CREATE COURSE (Instructor Only)
# =====================================

class CourseCreateAPIView(generics.CreateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
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

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)     

# =====================================
# 3️⃣ RETRIEVE COURSE
# =====================================

class CourseRetrieveAPIView(generics.RetrieveAPIView):
    serializer_class = CourseDetailSerializer
    permission_classes = [AllowAny]

    queryset = Course.objects.select_related("instructor")

    def get_object(self):
        course = super().get_object()

        # If unpublished, only owner can view
        if not course.is_published:
            if self.request.user != course.instructor:
                raise PermissionDenied("Course is not published.")
        return course


# =====================================
# 4️⃣ UPDATE COURSE (Owner Only)
# =====================================

class CourseUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CourseCreateUpdateSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    queryset = Course.objects.all()


# =====================================
# 5️⃣ DELETE COURSE (Instructor Only)
# =====================================

class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]
    queryset = Course.objects.all()
    
    def destroy(self, request, *args, **kwargs):
     instance = self.get_object()
     course_title = instance.title
     self.perform_destroy(instance)

     return Response(
        {
            "success": True,
            "message": f"Course '{course_title}' deleted successfully"
        },
        status=status.HTTP_200_OK
    )


# =====================================
# 6️⃣ PUBLISH COURSE (Instructor)
# =====================================

class CoursePublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]
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
# 7️⃣ UNPUBLISH COURSE(Instructor)
# =====================================

class CourseUnpublishAPIView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()
        course.is_published = False
        course.save()

        return Response(
            {"success": True, "message": "Course unpublished successfully."}
        )
        

class SectionCreateAPIView(generics.CreateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsCourseInstructor]

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
                "message": "Section created successfully",
                "data": serializer.data
            },
            status=status.HTTP_201_CREATED
        )

class SectionListAPIView(generics.ListAPIView):
    serializer_class = SectionSerializer

    def get_queryset(self):
        course_id = self.kwargs["course_id"]
        return Section.objects.filter(course_id=course_id)

class SectionUpdateView(generics.UpdateAPIView):
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsSectionInstructor]
    queryset = Section.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "success": True,
                "message": "Section updated successfully",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )

class SectionDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsSectionInstructor]
    queryset = Section.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        section_title = instance.title
        self.perform_destroy(instance)

        return Response(
            {
                "success": True,
                "message": f"Section '{section_title}' deleted successfully"
            }
        )