from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .permissions import IsAdmin, IsEnrolled
from django.db.models import Sum
from django.contrib.auth import get_user_model
from courses_app.models import Lesson
from enrollments_app.models import Enrollment
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from .models import ContentProgress, LessonProgress, LearningSession
from courses_app.models import Content, Lesson, Course
from rest_framework import status
from .serializers import *

User = get_user_model()

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

        # 1️⃣ Check active session
        session = LearningSession.objects.filter(
            student=request.user,
            course_id=course_id,
            is_active=True
        ).first()

        if session:
            return Response({
                "status": "success",
                "message": "Continue learning.",
                "data": LearningSessionSerializer(session).data
            })

        # 2️⃣ Check enrollment
        try:
            enrollment = Enrollment.objects.get(
                student=request.user,
                course_id=course_id,
                status=Enrollment.Status.ACTIVE
            )
        except Enrollment.DoesNotExist:
            return Response({
                "status": "failed",
                "message": "You are not enrolled in this course.",
                "data": None
            })

        # 3️⃣ Check if user has previous session
        last_session = LearningSession.objects.filter(
            student=request.user,
            course_id=course_id
        ).order_by("-started_at").first()

        if not last_session:
            return Response({
                "status": "failed",
                "message": "You have not started this course yet.",
                "data": None
            })

        # 4️⃣ Create new session
        session = LearningSession.objects.create(
            student=request.user,
            course_id=course_id,
            enrollment=enrollment,
            started_at=timezone.now(),
            is_active=True
        )

        return Response({
            "status": "success",
            "message": "Learning session resumed.",
            "data": LearningSessionSerializer(session).data
        })
#.....................
#POST /progress/content/{content_id}/complete/
# 1️. Mark content completed
class CompleteContentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def post(self, request, course_id, lesson_id, content_id):

        # Validate course and lesson
        lesson = get_object_or_404(
            Lesson,
            id=lesson_id,
            course_id=course_id
        )

        content = get_object_or_404(
            Content,
            id=content_id,
            lesson=lesson
        )

        # Check enrollment
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course_id=course_id,
            status="active"
        )

        # -----------------------------------------
        # 1️⃣ Mark content completed
        # -----------------------------------------
        progress, created = ContentProgress.objects.get_or_create(
            student=request.user,
            content=content
        )

        progress.completed = True
        progress.completed_at = timezone.now()
        progress.save()

        # -----------------------------------------
        # 2️⃣ Lesson Progress Calculation
        # -----------------------------------------
        total_contents = lesson.contents.count()

        completed_contents = ContentProgress.objects.filter(
            student=request.user,
            content__lesson=lesson,
            completed=True
        ).count()

        lesson_progress, _ = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
            enrollment=enrollment
        )

        lesson_completed = completed_contents == total_contents

        lesson_progress.completed = lesson_completed
        lesson_progress.completed_at = timezone.now() if lesson_completed else None
        lesson_progress.save()

        # -----------------------------------------
        # 3️⃣ Course Auto Completion (only if no final assessment exists)
        # -----------------------------------------
        total_lessons = Lesson.objects.filter(
            course_id=course_id
        ).count()

        completed_lessons = LessonProgress.objects.filter(
            student=request.user,
            lesson__course_id=course_id,
            completed=True
        ).count()

        course_completed = False
        course = get_object_or_404(Course, id=course_id)
        has_final = course.final_assessment and isinstance(course.final_assessment, dict) and course.final_assessment.get('questions')

        if total_lessons > 0 and completed_lessons == total_lessons and not has_final:
            enrollment.status = Enrollment.Status.COMPLETED
            enrollment.completed_at = timezone.now()
            enrollment.save()
            course_completed = True
        elif enrollment.status == Enrollment.Status.COMPLETED:
            course_completed = True

        # -----------------------------------------
        # 4️⃣ Calculate percentages
        # -----------------------------------------
        lesson_percentage = round(
            (completed_contents / total_contents) * 100
        ) if total_contents > 0 else 0

        course_percentage = round(
            (completed_lessons / total_lessons) * 100
        ) if total_lessons > 0 else 0

        # -----------------------------------------
        # Response
        # -----------------------------------------
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
                "course_id": lesson.course.id,
                "course_title": lesson.course.title,
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "total_contents": total_contents,
                "completed_contents": completed_contents,
                "progress_percentage": lesson_percentage,
                "lesson_completed": lesson_completed,
                "completed_at": lesson_progress.completed_at
            },

            "course_progress": {
                "course_id": course_id,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "progress_percentage": course_percentage,
                "course_completed": course_completed
            }
        })
#........................
#GET /progress/lessons/{lesson_id}/contents/

# 2️⃣ List content progress for a lesson
class LessonContentsProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id, lesson_id):
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
                "course_id": lesson.course.id,
                "course_title": lesson.course.title,
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

    def get(self, request, course_id, lesson_id):
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
            content__lesson=lesson,
            completed=True
        ).count()

        percentage = round((completed_count / total) * 100) if total > 0 else 0

        return Response({
            "status": "success",
            "lesson": {
                "course_id": lesson.course.id,
                "course_title": lesson.course.title,
                "lesson_id": lesson.id,
                "lesson_title": lesson.title
                
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
        total_lessons = lessons.count()
        completed_lessons = 0
        lessons_data = []

        for lesson in lessons:
            contents = lesson.contents.all()
            total_contents = contents.count()
            
            completed_content_progress = ContentProgress.objects.filter(
                student=request.user,
                content__lesson=lesson,
                completed=True
            )
            completed_contents_count = completed_content_progress.count()
            completed_content_ids = list(completed_content_progress.values_list("content_id", flat=True))

            progress, _ = LessonProgress.objects.get_or_create(
                student=request.user,
                lesson=lesson,
                enrollment=enrollment
            )

            percentage = round((completed_contents_count / total_contents) * 100) if total_contents > 0 else 0

            if progress.completed:
                completed_lessons += 1

            lessons_data.append({
                "lesson_id": lesson.id,
                "lesson_title": lesson.title,
                "order": lesson.order,
                "total_contents": total_contents,
                "completed_contents": completed_contents_count,
                "completed_content_ids": completed_content_ids,
                "progress_percentage": percentage,       
                "lesson_completed": progress.completed,
                "completed_at": progress.completed_at
            })

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

# 7️⃣ Complete Final Assessment
class CompleteFinalAssessmentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def post(self, request, course_id):
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course_id=course_id,
            status="active"
        )
        course = enrollment.course

        # Validate that all lessons are completed before allowing final assessment completion
        total_lessons = Lesson.objects.filter(course_id=course_id).count()
        completed_lessons = LessonProgress.objects.filter(
            student=request.user,
            lesson__course_id=course_id,
            completed=True
        ).count()

        if total_lessons != completed_lessons:
            return Response({
                "status": "failed",
                "message": "You must complete all lessons before finishing the final assessment."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Mark course as completed
        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.save()

        return Response({
            "status": "success",
            "message": "Final assessment passed. Course completed!",
            "data": {
                "course_id": course_id,
                "course_title": course.title,
                "completed": True,
                "completed_at": enrollment.completed_at
            }
        })
        
# --------------------------------------------------
# ADMIN COMPLETE CONTENT API
# --------------------------------------------------
class AdminCompleteContentAPIView(APIView):
    """
    Admin can mark a content as completed for a student
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, student_id, course_id, lesson_id, content_id):

        student = get_object_or_404(User, id=student_id)

        lesson = get_object_or_404(
            Lesson,
            id=lesson_id,
            course_id=course_id
        )

        content = get_object_or_404(
            Content,
            id=content_id,
            lesson=lesson
        )

        progress, created = ContentProgress.objects.get_or_create(
            student=student,
            content=content
        )

        progress.completed = True
        progress.completed_at = timezone.now()
        progress.save()

        return Response({
            "success": True,
            "message": "Content marked as completed for student",
            "data": {
                "student_id": student.id,
                "content_id": content.id
            }
        })
        
# --------------------------------------------------
# ADMIN COMPLETE LESSON API
# --------------------------------------------------
class AdminCompleteLessonAPIView(APIView):
    """
    Admin can mark a lesson as completed for a student
    only if all lesson contents are completed
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, student_id, course_id, lesson_id):

        student = get_object_or_404(User, id=student_id)

        lesson = get_object_or_404(
            Lesson,
            id=lesson_id,
            course_id=course_id
        )

        total_contents = lesson.contents.count()

        completed_contents = ContentProgress.objects.filter(
            student=student,
            content__lesson=lesson,
            completed=True
        ).count()

        if total_contents != completed_contents:
            return Response({
                "success": False,
                "message": "Cannot complete lesson. All contents must be completed first.",
                "total_contents": total_contents,
                "completed_contents": completed_contents
            }, status=400)

        lesson_progress, created = LessonProgress.objects.get_or_create(
            student=student,
            lesson=lesson
        )

        lesson_progress.completed = True
        lesson_progress.completed_at = timezone.now()
        lesson_progress.save()

        return Response({
            "success": True,
            "message": "Lesson completed successfully for student",
            "data": {
                "student_id": student.id,
                "lesson_id": lesson.id
            }
        })
        

# --------------------------------------------------
# STUDENT COURSE PROGRESS API
# --------------------------------------------------
class StudentCourseProgressAPIView(APIView):
    """
    Student can view their own course progress
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):

        student = request.user

        # Check enrollment
        enrollment = Enrollment.objects.filter(student=student,course_id=course_id).first()
        if not enrollment:
            return Response({
                "success": False,
                "message": "You are not enrolled in this course"
            })

        # Total lessons
        total_lessons = Lesson.objects.filter(course_id=course_id).count()

        # Completed lessons
        completed_lessons = LessonProgress.objects.filter(
            student=student,
            lesson__course_id=course_id,
            completed=True
        ).count()

        # Total contents in the course
        lessons_in_course = Lesson.objects.filter(course_id=course_id)
        total_contents = Content.objects.filter(lesson__in=lessons_in_course).count()

        # Check if course has a final assessment
        course = get_object_or_404(Course, id=course_id)
        has_final = hasattr(course, 'final_assessment') and course.final_assessment is not None
        
        if has_final:
            total_contents += 1

        # Completed contents in the course
        completed_contents = ContentProgress.objects.filter(
            student=student,
            content__lesson__course_id=course_id,
            completed=True
        ).count()

        # If has final and enrollment is completed, count it as a completed content
        if has_final and enrollment.status == Enrollment.Status.COMPLETED:
            completed_contents += 1

        progress_percentage = 0

        if total_contents > 0:
            progress_percentage = round((completed_contents / total_contents) * 100)

        return Response({
            "success": True,
            "message": "Course progress retrieved successfully",
            "data": {
                "course_id": course_id,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "total_contents": total_contents,
                "completed_contents": completed_contents,
                "progress_percentage": progress_percentage,
                "has_final_assessment": has_final,
                "is_course_completed": enrollment.status == Enrollment.Status.COMPLETED
            }
        })
    
# --------------------------------------------------
# ADMIN STUDENT COURSE PROGRESS API
# --------------------------------------------------

class AdminStudentCourseProgressAPIView(APIView):
    """
    Admin can view progress of any student in a course
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, student_id, course_id):

        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "message": "Student not found"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check enrollment
        enrollment = Enrollment.objects.filter(
            student=student,
            course_id=course_id
        ).first()

        if not enrollment:
            return Response({
                "success": False,
                "message": "Student is not enrolled in this course"
            }, status=status.HTTP_404_NOT_FOUND)

        # Total lessons in the course
        total_lessons = Lesson.objects.filter(course_id=course_id).count()

        # Completed lessons
        completed_lessons = LessonProgress.objects.filter(
            student=student,
            lesson__course_id=course_id,
            completed=True
        ).count()

        progress_percentage = 0

        if total_lessons > 0:
            progress_percentage = round((completed_lessons / total_lessons) * 100)

        return Response({
            "success": True,
            "message": "Student course progress retrieved successfully",
            "data": {
                "student_id": student.id,
                "student_name": student.username,
                "course_id": course_id,
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons,
                "progress_percentage": progress_percentage
            }
        })
# --------------------------------------------------
# ADMIN COMPLETE COURSE API
# --------------------------------------------------
class AdminCompleteCourseAPIView(APIView):
    """
    Admin can mark a course as completed for a student
    only if all lessons are completed
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, student_id, course_id):

        student = get_object_or_404(User, id=student_id)

        enrollment = get_object_or_404(
            Enrollment,
            student=student,
            course_id=course_id
        )

        total_lessons = Lesson.objects.filter(course_id=course_id).count()

        completed_lessons = LessonProgress.objects.filter(
            student=student,
            lesson__course_id=course_id,
            completed=True
        ).count()

        if total_lessons != completed_lessons:
            return Response({
                "success": False,
                "message": "Cannot complete course. All lessons must be completed first.",
                "total_lessons": total_lessons,
                "completed_lessons": completed_lessons
            }, status=400)

        enrollment.completed = True
        enrollment.completed_at = timezone.now()
        enrollment.save()

        return Response({
            "success": True,
            "message": "Course marked as completed successfully",
            "data": {
                "student_id": student.id,
                "course_id": course_id
            }
        })
        
class AdminCourseStudentsProgressAPIView(APIView):
    """
    Admin can view progress of all students enrolled in a course
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, course_id):

        enrollments = Enrollment.objects.filter(course_id=course_id)

        if not enrollments.exists():
            return Response({
                "success": False,
                "message": "No students enrolled in this course"
            })

        total_lessons = Lesson.objects.filter(course_id=course_id).count()

        students_progress = []

        for enrollment in enrollments:

            student = enrollment.student

            completed_lessons = LessonProgress.objects.filter(
                student=student,
                lesson__course_id=course_id,
                completed=True
            ).count()

            progress_percentage = 0

            if total_lessons > 0:
                progress_percentage = round((completed_lessons / total_lessons) * 100)

            students_progress.append({
                "student_id": student.id,
                "student_name": f"{student.full_name}",
                "completed_lessons": completed_lessons,
                "total_lessons": total_lessons,
                "progress_percentage": progress_percentage
            })

        return Response({
            "success": True,
            "course_id": course_id,
            "students_progress": students_progress
        })

# --------------------------------------------------
# LEARNING HOURS KPI API
# --------------------------------------------------

class LearningHoursKPIAPIView(APIView):
    """
    Return total hours learned by the student
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # 1️⃣ Get total minutes from completed sessions
        completed_minutes = LearningSession.objects.filter(
            student=request.user,
            is_active=False
        ).aggregate(total=Sum("duration_minutes"))["total"] or 0

        # 2️⃣ Add time from active sessions
        active_sessions = LearningSession.objects.filter(
            student=request.user,
            is_active=True
        )

        active_minutes = 0

        for session in active_sessions:
            elapsed = (timezone.now() - session.started_at).total_seconds() / 60
            active_minutes += int(elapsed)

        # 3️⃣ Total minutes
        total_minutes = completed_minutes + active_minutes

        total_hours = round(total_minutes / 60, 2)

        return Response({
            "success": True,
            "message": "Learning hours KPI retrieved successfully",
            "data": {
                "total_hours_learned": total_hours,
                "total_minutes_learned": total_minutes,
                "completed_sessions_minutes": completed_minutes,
                "active_sessions_minutes": active_minutes,
                "active_sessions_count": active_sessions.count()
            }
        })


# --------------------------------------------------
# COURSES KPI API
# --------------------------------------------------
class CoursesKPIAPIView(APIView):
    """
    Return course statistics for the student.

    Includes:
    - Total courses enrolled
    - Courses in progress
    - Courses completed
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        enrollments = Enrollment.objects.filter(student=request.user)

        total_courses = enrollments.count()

        completed_courses = enrollments.filter(status="COMPLETED").count()

        in_progress_courses = enrollments.filter(status="ACTIVE").count()

        return Response({
            "success": True,
            "message": "Courses KPI retrieved successfully",
            "data": {
                "total_courses_enrolled": total_courses,
                "courses_in_progress": in_progress_courses,
                "courses_completed": completed_courses
            }
        })

class CompletionRateAPIView(APIView):
    """
    Completion rate based on courses
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):

        student = request.user

        # Total enrolled courses
        total_courses = Enrollment.objects.filter(
            student=student
        ).count()

        # Completed courses
        completed_courses = Enrollment.objects.filter(
            student=student,
            status=Enrollment.Status.COMPLETED
        ).count()

        completion_rate = 0

        if total_courses > 0:
            completion_rate = round((completed_courses / total_courses) * 100)

        return Response({
            "success": True,
            "message": "Course completion rate retrieved successfully",
            "data": {
                "total_courses": total_courses,
                "completed_courses": completed_courses,
                "completion_rate": completion_rate
            }
        })