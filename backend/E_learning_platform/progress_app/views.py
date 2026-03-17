from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from .models import ContentProgress, LessonProgress
from courses_app.models import Content, Lesson, Course
from enrollments_app.models import Enrollment
from rest_framework import status
from .models import LearningSession
from .serializers import LearningSessionSerializer
from .serializers import *
from .permissions import IsEnrolled
#.....................
#POST /progress/content/{content_id}/complete/
# 1️. Mark content completed
class CompleteContentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def post(self, request, content_id):
        content = get_object_or_404(Content, id=content_id)
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course=content.lesson.course,
            status="active"
        )

        # Mark content completed
        progress, created = ContentProgress.objects.get_or_create(
            student=request.user,
            content=content,
            enrollment=enrollment
        )
        progress.completed = True
        progress.completed_at = timezone.now()
        progress.save()

        # Update lesson progress
        lesson = content.lesson
        total_contents = lesson.contents.count()
        completed_contents = ContentProgress.objects.filter(
            student=request.user,
            enrollment=enrollment,
            content__lesson=lesson,
            completed=True
        ).count()

        lesson_progress, _ = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
            enrollment=enrollment
        )

        lesson_progress.completed = completed_contents == total_contents
        lesson_progress.completed_at = timezone.now() if lesson_progress.completed else None
        lesson_progress.save()

        # Calculate percentage
        percentage = round((completed_contents / total_contents) * 100) if total_contents > 0 else 0

        return Response({
            "status": "success",
            "message": f"Content '{content.title}' marked as completed.",
            "content_progress": {
                "content_id": content.id,
                "content_title": content.title,
                "content_type": content.content_type,
                "completed": progress.completed,
                "completed_at": progress.completed_at,
                "is_new": created
            },
            "lesson_progress": {
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "total_contents": total_contents,
                "completed_contents": completed_contents,
                "progress_percentage": percentage,
                "lesson_completed": lesson_progress.completed,
                "completed_at": lesson_progress.completed_at
            }
        })

#........................
#GET /progress/lessons/{lesson_id}/contents/

# 2️⃣ List content progress for a lesson
class LessonContentsProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, id=lesson_id)
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course=lesson.course,
            status="active"
        )
        contents = lesson.contents.all()

        # Calculate progress
        total = contents.count()
        completed_count = ContentProgress.objects.filter(
            student=request.user,
            enrollment=enrollment,
            content__lesson=lesson,
            completed=True
        ).count()

        serializer = LessonContentProgressSerializer(
            contents,
            many=True,
            context={"student": request.user, "enrollment": enrollment}
        )

        percentage = round((completed_count / total) * 100) if total > 0 else 0

        return Response({
            "status": "success",
            "lesson": {
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
            },
            "summary": {
                "total_contents": total,
                "completed_contents": completed_count,
                "progress_percentage": percentage
            },
            "contents": serializer.data
        })
        
 #............................
 #http://127.0.0.1:8000/api/progress/lessons/lesson_id}/

# 3️. Get lesson progress (with percentage)
class LessonProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, lesson_id):
        lesson = get_object_or_404(Lesson, id=lesson_id)
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course=lesson.course,
            status="active"
        )
        progress, _ = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
            enrollment=enrollment
        )

        total = lesson.contents.count()
        completed_count = ContentProgress.objects.filter(
            student=request.user,
            enrollment=enrollment,
            content__lesson=lesson,
            completed=True
        ).count()

        percentage = round((completed_count / total) * 100) if total > 0 else 0

        return Response({
            "status": "success",
            "lesson": {
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "course_id": lesson.course.id,
                "course_title": lesson.course.title
            },
            "progress": {
                "total_contents": total,
                "completed_contents": completed_count,
                "progress_percentage": percentage,
                "lesson_completed": progress.completed,
                "completed_at": progress.completed_at
            }
        })

#.................................
#GET /progress/courses/{course_id}/lessons/
# 4️. List all lessons for a course with progress
class CourseLessonsProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course_id=course_id,
            status="active"
        )
        lessons = Lesson.objects.filter(course_id=course_id).order_by("order")
        lessons_data = []

        total_lessons = lessons.count()
        completed_lessons = 0

        for lesson in lessons:
            progress, _ = LessonProgress.objects.get_or_create(
                student=request.user,
                lesson=lesson,
                enrollment=enrollment
            )
            completed_lessons += 1 if progress.completed else 0
            serializer = LessonProgressSerializer(progress)
            lessons_data.append(serializer.data)

        course_percentage = round((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0

        return Response({
            "status": "success",
            "course_id": course_id,
            "summary": {
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "course_progress_percentage": course_percentage
            },
            "lessons": lessons_data
        })

#.....................
#GET /progress/lessons/completed/
# 5️. Completed lessons across all courses
class CompletedLessonsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lessons = LessonProgress.objects.filter(
            student=request.user,
            completed=True
        ).select_related("lesson", "lesson__course")

        data = [
            {
                "lesson_id": lp.lesson.id,
                "lesson_title": lp.lesson.title,
                "course_id": lp.lesson.course.id,
                "course_title": lp.lesson.course.title,
                "completed_at": lp.completed_at,
                "progress_percentage": 100
            }
            for lp in lessons
        ]
        return Response({
            "status": "success",
            "total_completed": lessons.count(),
            "data": data
        })

#.....................
#GET /progress/courses/{course_id}/lessons/completed/
# 6️. Completed lessons for a specific course
class CompletedCourseLessonsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        lessons = LessonProgress.objects.filter(
            student=request.user,
            lesson__course_id=course_id,
            completed=True
        ).select_related("lesson")

        data = [
            {
                "lesson_id": lp.lesson.id,
                "lesson_title": lp.lesson.title,
                "completed_at": lp.completed_at,
                "progress_percentage": 100
            }
            for lp in lessons
        ]
        return Response({
            "status": "success",
            "course_id": course_id,
            "total_completed": lessons.count(),
            "data": data
        })

class StartLearningAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):

        try:
            enrollment = Enrollment.objects.get(
                student=request.user,
                course_id=course_id,
                status=Enrollment.Status.ACTIVE
            )
        except Enrollment.DoesNotExist:
            return Response(
                {
                    "status": "failed",
                    "message": "You are not enrolled in this course.",
                    "data": None
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent multiple active sessions
        if LearningSession.objects.filter(
            student=request.user,
            course_id=course_id,
            is_active=True
        ).exists():
            return Response(
                {
                    "status": "failed",
                    "message": "You already have an active learning session.",
                    "data": None
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        session = LearningSession.objects.create(
            student=request.user,
            course_id=course_id,
            enrollment=enrollment,
            started_at=timezone.now()
        )

        return Response(
            {
                "status": "success",
                "message": "Learning session started.",
                "data": LearningSessionSerializer(session).data
            },
            status=status.HTTP_201_CREATED
        )
    
class EndLearningSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):

        try:
            session = LearningSession.objects.get(
                student=request.user,
                course_id=course_id,
                is_active=True
            )
        except LearningSession.DoesNotExist:
            return Response(
                {
                    "status": "failed",
                    "message": "No active learning session found.",
                    "data": None
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        session.end_session()

        return Response(
            {
                "status": "success",
                "message": "Learning session ended.",
                "data": LearningSessionSerializer(session).data
            }
        )

class ContinueLearningAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):

        session = LearningSession.objects.filter(
            student=request.user,
            course_id=course_id
        ).order_by("-started_at").first()

        if not session:
            return Response(
                {
                    "status": "failed",
                    "message": "No learning history found.",
                    "data": None
                }
            )

        return Response(
            {
                "status": "success",
                "message": "Continue learning data retrieved.",
                "data": LearningSessionSerializer(session).data
            }
        )

   
