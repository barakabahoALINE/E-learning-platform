# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.response import Response
# from rest_framework import status
# from rest_framework.permissions import AllowAny
# from rest_framework.decorators import api_view, permission_classes
# from rest_framework.permissions import IsAuthenticated
# from .models import Course
# from .serializers import CourseSerializer

# # =========================
# # 1. LIST COURSES
# # =========================

# @api_view(['GET'])
# @permission_classes([AllowAny])
# def list_courses(request):

#     courses = Course.objects.all()
#     serializer = CourseSerializer(courses, many=True)

#     return Response(serializer.data)


# # =========================
# # 2. CREATE COURSE
# # =========================

# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def create_course(request):
#     serializer = CourseSerializer(data=request.data)

#     if serializer.is_valid():
#         # Save the course
#         course = serializer.save(instructor=request.user if request.user.is_authenticated else None)

#         # Return structured response
#         return Response(
#             {
#                 "success": True,
#                 "message": "Course created successfully",
#                 "course": serializer.data
#             },
#             status=status.HTTP_201_CREATED
#         )

#     return Response(
#         {
#             "success": False,
#             "message": "Course creation failed",
#             "errors": serializer.errors
#         },
#         status=status.HTTP_400_BAD_REQUEST
#     )

# # =========================
# # 3. UPDATE COURSE
# # =========================

# @api_view(['PUT'])
# @permission_classes([IsAuthenticated])
# def update_course(request, pk):

#     try:
#         course = Course.objects.get(id=pk)

#     except Course.DoesNotExist:

#         return Response(
#             {"error": "Course not found"},
#             status=status.HTTP_404_NOT_FOUND
#         )

#     serializer = CourseSerializer(
#         course,
#         data=request.data,
#         partial=True
#     )

#     if serializer.is_valid():

#         serializer.save()

#         return Response(serializer.data)

#     return Response(
#         serializer.errors,
#         status=status.HTTP_400_BAD_REQUEST
#     )


# # =========================
# # 4. DELETE COURSE
# # =========================

# @api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# def delete_course(request, pk):

#     try:
#         course = Course.objects.get(id=pk)

#     except Course.DoesNotExist:

#         return Response(
#             {"error": "Course not found"},
#             status=status.HTTP_404_NOT_FOUND
#         )

#     course.delete()

#     return Response(
#     {"success": True, "message": "Course deleted successfully"},
#     status=status.HTTP_200_OK
#     )
  
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import Course


from .models import Course
from .serializers import (
    CourseCreateUpdateSerializer,
    CourseListSerializer,
    CourseDetailSerializer,
)
from .permissions import IsInstructor


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
    permission_classes = [AllowAny] #IsInstructor]

    def perform_create(self, serializer):
        #serializer.save(instructor=self.request.user)
        serializer.save()



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
    permission_classes = [AllowAny] #IsInstructor]
    queryset = Course.objects.all()


# =====================================
# 5️⃣ DELETE COURSE (Instructor Only)
# =====================================

class CourseDeleteAPIView(generics.DestroyAPIView):
    permission_classes = [AllowAny] #IsInstructor]
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
    permission_classes = [AllowAny] #IsInstructor]
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
    permission_classes = [AllowAny] #IsInstructor]
    queryset = Course.objects.all()

    def post(self, request, pk):
        course = self.get_object()
        course.is_published = False
        course.save()

        return Response(
            {"success": True, "message": "Course unpublished successfully."}
        )