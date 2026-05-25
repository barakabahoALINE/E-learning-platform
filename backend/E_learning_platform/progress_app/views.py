from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from assessments_app.models import Assessment, Attempt
from .permissions import IsAdmin, IsEnrolled
from .models import ContentProgress, SectionProgress, ModuleProgress, CourseProgress, LearningSession
from courses_app.models import Content, Section, Module, Course
from enrollments_app.models import Enrollment
from .serializers import *
User = get_user_model()


def _calculate_course_progress_percentage(total_modules, completed_modules, final_assessment, final_passed):
    """Return a course progress percentage with final assessment weighted as 10%."""
    if final_assessment:
        if total_modules == 0:
            return 100 if final_passed else 0

        module_share = round((completed_modules / total_modules) * 90) if total_modules else 0
        pct = module_share + (10 if final_passed else 0)
        return min(pct, 100)

    return round((completed_modules / total_modules) * 100) if total_modules else 0


# ═══════════════════════════════════════════════════════════════
# 1. Mark content completed
class CompleteContentAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def post(self, request, course_id, section_id, content_id):
        content = get_object_or_404(Content, id=content_id, section__module__course_id=course_id)
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course_id=course_id,
            
            status__in=["active", "completed"],
        )

        # ── Mark content complete ──────────────────────────────────────
        cp, created = ContentProgress.objects.get_or_create(
            student=request.user,
            content=content,
            defaults={"enrollment": enrollment},
        )
        cp.completed = True
        cp.completed_at = timezone.now()
        cp.enrollment = enrollment
        cp.save()  # ← triggers cascade → Section → Module automatically

        # ── Read updated state for response ───────────────────────────
        section = content.section
        module = section.module

        # Section stats
        total_section_contents = section.contents.count()
        done_section_contents = ContentProgress.objects.filter(
            student=request.user,
            content__section=section,
            completed=True,
        ).count()
        section_pct = round((done_section_contents / total_section_contents) * 100) if total_section_contents else 0
        section_prog = SectionProgress.objects.filter(student=request.user, section=section).first()

        # Module stats
        total_module_sections = Section.objects.filter(module=module).count()
        done_module_sections = SectionProgress.objects.filter(
            student=request.user,
            section__module=module,
            completed=True,
        ).count()
        module_pct = round((done_module_sections / total_module_sections) * 100) if total_module_sections else 0
        module_prog = ModuleProgress.objects.filter(student=request.user, module=module).first()

        course = get_object_or_404(Course, id=course_id)
        total_sections = Section.objects.filter(module__course_id=course_id).count()
        completed_sections = SectionProgress.objects.filter(
            student=request.user,
            section__module__course_id=course_id,
            completed=True
        ).count()
        total_contents = Content.objects.filter(section__module__course_id=course_id).count()
        completed_contents = ContentProgress.objects.filter(
            student=request.user,
            content__section__module__course_id=course_id,
            completed=True,
        ).count()

        total_modules = Module.objects.filter(course_id=course_id).count()
        completed_modules = ModuleProgress.objects.filter(
            student=request.user,
            module__course_id=course_id,
            completed=True,
        ).count()

        final_assessment = Assessment.objects.filter(
            course=course,
            assessment_type="FINAL"
        ).first()
        final_passed = False
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=request.user,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()

        course_completed = False
        if final_assessment:
            if completed_modules == total_modules and final_passed:
                enrollment.status = Enrollment.Status.COMPLETED
                enrollment.save()
                course_completed = True
            elif enrollment.status == Enrollment.Status.COMPLETED:
                course_completed = True
        else:
            if total_sections > 0 and completed_sections == total_sections:
                enrollment.status = Enrollment.Status.COMPLETED
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

        course_percentage = _calculate_course_progress_percentage(
            total_modules,
            completed_modules,
            final_assessment,
            final_passed,
        )

        course_prog = CourseProgress.objects.filter(
            student=request.user,
            course=course
        ).first()

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
                "completed": cp.completed,
                "completed_at": cp.completed_at,
                "is_new": created,
            },
            "section_progress": {
                "section_id": section.id,
                "section_title": section.title,
                "total_contents": total_section_contents,
                "completed_contents": done_section_contents,
                "progress_percentage": section_pct,
                "section_completed": section_prog.completed if section_prog else False,
                "completed_at": section_prog.completed_at if section_prog else None,
            },
            "module_progress": {
                "module_id": module.id,
                "module_title": module.title,
                "total_sections": total_module_sections,
                "completed_sections": done_module_sections,
                "progress_percentage": module_pct,
                "module_completed": module_prog.completed if module_prog else False,
                "completed_at": module_prog.completed_at if module_prog else None,
            },
            "course_progress": {
                "course_id": course.id,
                "course_title": course.title,
                "total_modules": total_modules,
                "completed_modules": completed_modules,
                "has_final_assessment": bool(final_assessment),
                "final_passed": final_passed,
                "progress_percentage": course_percentage,
                "course_completed": course_prog.completed if course_prog else course_completed,
                "completed_at": course_prog.completed_at if course_prog else None,
            },
        })
# ═══════════════════════════════════════════════════════════════
# 2. List contents with progress for a section
#    GET /progress/courses/{course_id}/sections/{section_id}/contents/
# ═══════════════════════════════════════════════════════════════
class SectionContentsProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id, section_id):
        section = get_object_or_404(Section, id=section_id, module__course_id=course_id)
        enrollment = get_object_or_404(
            Enrollment, student=request.user, course_id=course_id, status__in=["active", "completed"]
        )
        contents = section.contents.all()
        total = contents.count()
        done = ContentProgress.objects.filter(
            student=request.user, content__section=section, completed=True
        ).count()
        pct = round((done / total) * 100) if total else 0

        return Response({
            "status": "success",
            "section": {
                "course_id": section.module.course.id,
                "course_title": section.module.course.title,
                "module_id": section.module.id,
                "module_title": section.module.title,
                "section_id": section.id,
                "section_title": section.title,
            },
            "summary": {"total_contents": total, "completed_contents": done, "progress_percentage": pct},
            "contents": SectionContentProgressSerializer(
                contents, many=True, context={"student": request.user, "enrollment": enrollment}
            ).data,
        })


# ═══════════════════════════════════════════════════════════════
# 3. Section progress detail
#    GET /progress/courses/{course_id}/sections/{section_id}/
# ═══════════════════════════════════════════════════════════════
class SectionProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id, section_id):
        section = get_object_or_404(Section, id=section_id, module__course_id=course_id)
        enrollment = get_object_or_404(
            Enrollment, student=request.user, course_id=course_id, status__in=["active", "completed"]
        )
        prog, _ = SectionProgress.objects.get_or_create(
            student=request.user, section=section, defaults={"enrollment": enrollment}
        )
        total = section.contents.count()
        done = ContentProgress.objects.filter(
            student=request.user, content__section=section, completed=True
        ).count()
        pct = round((done / total) * 100) if total else 0

        return Response({
            "status": "success",
            "section": {
                "course_id": section.module.course.id,
                "course_title": section.module.course.title,
                "module_id": section.module.id,
                "module_title": section.module.title,
                "section_id": section.id,
                "section_title": section.title,
            },
            "progress": {
                "total_contents": total,
                "completed_contents": done,
                "progress_percentage": pct,
                "section_completed": prog.completed,
                "completed_at": prog.completed_at,
            },
        })


# ═══════════════════════════════════════════════════════════════
# 4. Module progress detail
#    GET /progress/courses/{course_id}/modules/{module_id}/
# ═══════════════════════════════════════════════════════════════
class ModuleProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id, module_id):
        module = get_object_or_404(Module, id=module_id, course_id=course_id)
        enrollment = get_object_or_404(
            Enrollment, student=request.user, course_id=course_id, status__in=["active", "completed"]
        )

        # Ensure ModuleProgress row exists
        module_prog, _ = ModuleProgress.objects.get_or_create(
            student=request.user, module=module, defaults={"enrollment": enrollment}
        )

        total_sections = Section.objects.filter(module=module).count()
        done_sections = SectionProgress.objects.filter(
            student=request.user, section__module=module, completed=True
        ).count()
        module_pct = round((done_sections / total_sections) * 100) if total_sections else 0

        # Per-section breakdown
        sections_data = []
        for section in module.sections.all():
            total_c = section.contents.count()
            done_c = ContentProgress.objects.filter(
                student=request.user, content__section=section, completed=True
            ).count()
            sec_pct = round((done_c / total_c) * 100) if total_c else 0
            sp = SectionProgress.objects.filter(student=request.user, section=section).first()

            sections_data.append({
                "section_id": section.id,
                "section_title": section.title,
                "order": section.order,
                "total_contents": total_c,
                "completed_contents": done_c,
                "progress_percentage": sec_pct,
                "section_completed": sp.completed if sp else False,
                "completed_at": sp.completed_at if sp else None,
            })

        return Response({
            "status": "success",
            "module": {
                "course_id": module.course.id,
                "course_title": module.course.title,
                "module_id": module.id,
                "module_title": module.title,
            },
            "progress": {
                "total_sections": total_sections,
                "completed_sections": done_sections,
                "progress_percentage": module_pct,
                "module_completed": module_prog.completed,
                "completed_at": module_prog.completed_at,
            },
            "sections": sections_data,
        })


# ═══════════════════════════════════════════════════════════════
# 5. All sections for a course with progress
#    GET /progress/courses/{course_id}/sections/
# ═══════════════════════════════════════════════════════════════
class CourseSectionsProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        enrollment = get_object_or_404(
            Enrollment, student=request.user, course_id=course_id, status__in=["active", "completed"]
        )
        sections = Section.objects.filter(
            module__course_id=course_id
        ).select_related("module").order_by("module__order", "order")

        total_sections = sections.count()
        completed_sections = 0
        sections_data = []

        for section in sections:
            total_c = section.contents.count()
            done_c = ContentProgress.objects.filter(
                student=request.user, enrollment=enrollment,
                content__section=section, completed=True,
            ).count()
            pct = round((done_c / total_c) * 100) if total_c else 0
            prog, _ = SectionProgress.objects.get_or_create(
                student=request.user, section=section, defaults={"enrollment": enrollment}
            )
            if prog.completed:
                completed_sections += 1
            sections_data.append({
                "module_id": section.module.id,
                "module_title": section.module.title,
                "section_id": section.id,
                "section_title": section.title,
                "order": section.order,
                "total_contents": total_c,
                "completed_contents": done_c,
                "progress_percentage": pct,
                "section_completed": prog.completed,
                "completed_at": prog.completed_at,
            })

        total_modules = Module.objects.filter(course_id=course_id).count()
        completed_modules = ModuleProgress.objects.filter(
            student=request.user, module__course_id=course_id, completed=True
        ).count()
        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        final_passed = False
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=request.user,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()

        course_pct = _calculate_course_progress_percentage(
            total_modules,
            completed_modules,
            final_assessment,
            final_passed,
        )
        return Response({
            "status": "success",
            "course_id": course_id,
            "summary": {
                "total_sections": total_sections,
                "completed_sections": completed_sections,
                "total_modules": total_modules,
                "completed_modules": completed_modules,
                "has_final_assessment": bool(final_assessment),
                "final_passed": final_passed,
                "course_progress_percentage": course_pct,
            },
            "sections": sections_data,
        })


# ═══════════════════════════════════════════════════════════════
# 6. All modules for a course with progress
#    GET /progress/courses/{course_id}/modules/
# ═══════════════════════════════════════════════════════════════
class CourseModulesProgressAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        enrollment = get_object_or_404(
            Enrollment, student=request.user, course_id=course_id, status__in=["active", "completed"]
        )
        modules = Module.objects.filter(course_id=course_id).order_by("order")

        total_modules = modules.count()
        completed_modules = 0
        modules_data = []

        for module in modules:
            total_s = Section.objects.filter(module=module).count()
            done_s = SectionProgress.objects.filter(
                student=request.user, section__module=module, completed=True
            ).count()
            mod_pct = round((done_s / total_s) * 100) if total_s else 0

            mod_prog, _ = ModuleProgress.objects.get_or_create(
                student=request.user, module=module, defaults={"enrollment": enrollment}
            )
            if mod_prog.completed:
                completed_modules += 1

            modules_data.append({
                "module_id": module.id,
                "module_title": module.title,
                "order": module.order,
                "total_sections": total_s,
                "completed_sections": done_s,
                "progress_percentage": mod_pct,
                "module_completed": mod_prog.completed,
                "completed_at": mod_prog.completed_at,
            })

        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        final_passed = False
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=request.user,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()

        course_pct = _calculate_course_progress_percentage(
            total_modules,
            completed_modules,
            final_assessment,
            final_passed,
        )
        return Response({
            "status": "success",
            "course_id": course_id,
            "summary": {
                "total_modules": total_modules,
                "completed_modules": completed_modules,
                "has_final_assessment": bool(final_assessment),
                "final_passed": final_passed,
                "course_progress_percentage": course_pct,
            },
            "modules": modules_data,
        })


# ═══════════════════════════════════════════════════════════════
# 7. Completed sections across all courses
# ═══════════════════════════════════════════════════════════════
class CompletedSectionsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sps = SectionProgress.objects.filter(
            student=request.user, completed=True
        ).select_related("section", "section__module", "section__module__course")
        data = [{
            "section_id": sp.section.id,
            "section_title": sp.section.title,
            "module_id": sp.section.module.id,
            "module_title": sp.section.module.title,
            "course_id": sp.section.module.course.id,
            "course_title": sp.section.module.course.title,
            "completed_at": sp.completed_at,
        } for sp in sps]
        return Response({"status": "success", "total_completed": sps.count(), "data": data})


# ═══════════════════════════════════════════════════════════════
# 8. Completed sections for a specific course
# ═══════════════════════════════════════════════════════════════
class CompletedCourseSectionsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        sps = SectionProgress.objects.filter(
            student=request.user,
            section__module__course_id=course_id,
            completed=True,
        ).select_related("section")
        data = [{
            "section_id": sp.section.id,
            "section_title": sp.section.title,
            "completed_at": sp.completed_at,
        } for sp in sps]
        return Response({"status": "success", "course_id": course_id, "total_completed": sps.count(), "data": data})


# ═══════════════════════════════════════════════════════════════
# 9. Completed modules for a course
#    GET /progress/courses/{course_id}/modules/completed/
# ═══════════════════════════════════════════════════════════════
class CompletedCourseModulesAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id):
        mps = ModuleProgress.objects.filter(
            student=request.user,
            module__course_id=course_id,
            completed=True,
        ).select_related("module")
        data = [{
            "module_id": mp.module.id,
            "module_title": mp.module.title,
            "completed_at": mp.completed_at,
        } for mp in mps]
        return Response({"status": "success", "course_id": course_id, "total_completed": mps.count(), "data": data})


# ═══════════════════════════════════════════════════════════════
# 10-12. Learning session views
# ═══════════════════════════════════════════════════════════════
class StartLearningAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            enrollment = Enrollment.objects.get(
                student=request.user,
                course_id=course_id,
                status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
            )
        except Enrollment.DoesNotExist:
            return Response(
                {"status": "failed", "message": "You are not enrolled in this course.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if LearningSession.objects.filter(student=request.user, course_id=course_id, is_active=True).exists():
            return Response(
                {"status": "failed", "message": "You already have an active learning session.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session = LearningSession.objects.create(
            student=request.user, course_id=course_id,
            enrollment=enrollment, started_at=timezone.now()
        )

        session, created = LearningSession.objects.get_or_create(
            student=request.user,
            course_id=course_id,
            is_active=True,
            defaults={
                "enrollment": enrollment,
                "started_at": timezone.now()
            }
        )

        # =====================================================
        # AUTO CREATE PROGRESS RECORDS
        # =====================================================

        modules = Module.objects.filter(course_id=course_id)

        for module in modules:

            ModuleProgress.objects.get_or_create(
                student=request.user,
                module=module,
                defaults={"enrollment": enrollment}
            )

            for section in module.sections.all():

                SectionProgress.objects.get_or_create(
                    student=request.user,
                    section=section,
                    defaults={"enrollment": enrollment}
                )

                for content in section.contents.all():

                    ContentProgress.objects.get_or_create(
                        student=request.user,
                        content=content,
                        defaults={"enrollment": enrollment}
                    )

        return Response({
            "success": True,
            "message": "Learning session started successfully",
            "data": LearningSessionSerializer(session).data
        })



class EndLearningSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            session = LearningSession.objects.get(
                student=request.user, course_id=course_id, is_active=True
            )
        except LearningSession.DoesNotExist:
            return Response(
                {"status": "failed", "message": "No active learning session found.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )
        session.end_session()
        return Response(
            {"status": "success", "message": "Learning session ended.", "data": LearningSessionSerializer(session).data}
        )


class ContinueLearningAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        active_session = LearningSession.objects.filter(
            student=request.user, course_id=course_id, is_active=True
        ).order_by("-started_at").first()
        if active_session:
            return Response(
                {"status": "success", "message": "Continue learning data retrieved.", "data": LearningSessionSerializer(active_session).data}
            )

        last_session = LearningSession.objects.filter(
            student=request.user, course_id=course_id
        ).order_by("-started_at").first()
        if not last_session:
            return Response(
                {"status": "failed", "message": "No learning history found.", "data": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resumed_session = LearningSession.objects.create(
            student=request.user,
            course_id=course_id,
            enrollment=last_session.enrollment,
            started_at=timezone.now(),
            is_active=True,
        )
        return Response(
            {"status": "success", "message": "Learning session resumed.", "data": LearningSessionSerializer(resumed_session).data},
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════
# 13. Student overall course progress
#     GET /progress/courses/{course_id}/
# ═══════════════════════════════════════════════════════════════
class StudentCourseProgressAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        enrollment = Enrollment.objects.filter(student=request.user, course_id=course_id).first()
        if not enrollment:
            return Response({"success": False, "message": "You are not enrolled in this course"})

        total_modules = Module.objects.filter(course_id=course_id).count()
        done_modules = ModuleProgress.objects.filter(
            student=request.user, module__course_id=course_id, completed=True
        ).count()

        total_sections = Section.objects.filter(module__course_id=course_id).count()
        done_sections = SectionProgress.objects.filter(
            student=request.user, section__module__course_id=course_id, completed=True
        ).count()

        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        final_passed = False
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=request.user,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()

        pct = _calculate_course_progress_percentage(
            total_modules,
            done_modules,
            final_assessment,
            final_passed,
        )

        return Response({
            "success": True,
            "message": "Course progress retrieved successfully",
            "data": {
                "course_id": course_id,
                "total_modules": total_modules,
                "completed_modules": done_modules,
                "total_sections": total_sections,
                "completed_sections": done_sections,
                "has_final_assessment": bool(final_assessment),
                "final_passed": final_passed,
                "progress_percentage": pct,
            },
        })


# ═══════════════════════════════════════════════════════════════
# 14. Admin: view any student's progress
# ═══════════════════════════════════════════════════════════════
class AdminStudentCourseProgressAPIView(APIView):
    """
    Admin can view progress of any student in a course
    """

    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, student_id, course_id):
        try:
            student = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({"success": False, "message": "Student not found"})
        if not Enrollment.objects.filter(student=student, course_id=course_id).exists():
            return Response({"success": False, "message": "Student is not enrolled in this course"})

        total_modules = Module.objects.filter(course_id=course_id).count()
        done_modules = ModuleProgress.objects.filter(
            student=student, module__course_id=course_id, completed=True
        ).count()

        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        final_passed = False
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=student,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()

        pct = _calculate_course_progress_percentage(
            total_modules,
            done_modules,
            final_assessment,
            final_passed,
        )

        return Response({
            "success": True,
            "message": "Student course progress retrieved successfully",
            "data": {
                "student_id": student.id,
                "student_name": student.full_name,
                "course_id": course_id,
                "total_modules": total_modules,
                "completed_modules": done_modules,
                "has_final_assessment": bool(final_assessment),
                "final_passed": final_passed,
                "progress_percentage": pct,
            },
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

        total_sections = Section.objects.filter(module__course_id=course_id).count()

        completed_sections = SectionProgress.objects.filter(
            student=student,
            section__module__course_id=course_id,
            completed=True
        ).count()

        if total_sections != completed_sections:
            return Response({
                "success": False,
                "message": "Cannot complete course. All lessons must be completed first.",
                "total_sections": total_sections,
                "completed_sections": completed_sections
            }, status=400)

        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=student,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()
            if not final_passed:
                return Response({
                    "success": False,
                    "message": "Cannot complete course. Final assessment must be passed first.",
                }, status=400)

        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.save()

        return Response({
            "success": True,
            "message": "Course marked as completed successfully",
            "data": {
                "student_id": student.id,
                "course_id": course_id
            }
        })
        
# 15. Complete course
# ═══════════════════════════════════════════════════════════════
class CompleteCourseAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, course_id):
        try:
            enrollment = Enrollment.objects.get(student=request.user, course_id=course_id)
        except Enrollment.DoesNotExist:
            return Response({"success": False, "message": "Enrollment not found"})

        total = Section.objects.filter(module__course_id=course_id).count()
        done = SectionProgress.objects.filter(
            student=request.user, section__module__course_id=course_id, completed=True
        ).count()

        if done < total:
            return Response({"success": False, "message": "You must complete all modules before finishing the course"})

        final_assessment = Assessment.objects.filter(course_id=course_id, assessment_type="FINAL").first()
        if final_assessment:
            final_passed = Attempt.objects.filter(
                student=request.user,
                assessment=final_assessment,
                is_submitted=True,
                is_passed=True,
            ).exists()
            if not final_passed:
                return Response({"success": False, "message": "You must pass the final assessment before finishing the course"}, status=400)

        enrollment.status = Enrollment.Status.COMPLETED
        enrollment.save()
        return Response({"success": True, "message": "Course marked as completed successfully"})
    

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


class CoursesKPIAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        enrollments = Enrollment.objects.filter(student=request.user)

        total_courses = enrollments.count()
        in_progress = enrollments.filter(
            status=Enrollment.Status.ACTIVE
        ).count()

        completed = enrollments.filter(
            status=Enrollment.Status.COMPLETED
        ).count()

        completion_rate = 0
        in_progress_percentage = 0

        if total_courses > 0:
            completion_rate = round(
                (completed / total_courses) * 100
            )

            in_progress_percentage = round(
                (in_progress / total_courses) * 100
            )

        return Response({
            "success": True,
            "message": "Courses KPI retrieved successfully",

            "statistics": {
                "total_courses_enrolled": total_courses,
                "courses_in_progress": in_progress,
                "courses_completed": completed,
                "courses_completion_rate": completion_rate,
                "courses_in_progress_percentage": in_progress_percentage
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
class ModuleContentsAPIView(APIView):
    permission_classes = [IsAuthenticated, IsEnrolled]

    def get(self, request, course_id, module_id):

        # Validate module belongs to course
        module = get_object_or_404(
            Module,
            id=module_id,
            course_id=course_id
        )

        # Validate enrollment
        enrollment = get_object_or_404(
            Enrollment,
            student=request.user,
            course_id=course_id,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
        )

        sections = module.sections.all().order_by("order")

        sections_data = []

        total_contents = 0
        completed_contents = 0

        for section in sections:

            contents = section.contents.all().order_by("order")

            contents_data = []

            for content in contents:

                is_completed = ContentProgress.objects.filter(
                    student=request.user,
                    content=content,
                    completed=True
                ).exists()

                if is_completed:
                    completed_contents += 1

                total_contents += 1

                contents_data.append({
                    "content_id": content.id,
                    "title": content.title,
                    "content_type": content.content_type,
                    "order": content.order,
                    "completed": is_completed,
                    "progress_percentage": 100 if is_completed else 0,
                })

            sections_data.append({
                "section_id": section.id,
                "section_title": section.title,
                "order": section.order,
                "total_contents": contents.count(),
                "contents": contents_data
            })

        module_progress = round(
            (completed_contents / total_contents) * 100
        ) if total_contents > 0 else 0

        return Response({
            "status": "success",
            "message": "Module contents progress retrieved successfully",
            "data": {
                "module_id": module.id,
                "module_title": module.title,
                "order": module.order,
                "total_contents": total_contents,
                "completed_contents": completed_contents,
                "progress_percentage": module_progress,
                "sections": sections_data   
            },
        })

class MyCourseProgressAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        progress = (
            CourseProgress.objects.filter(
                student=request.user
            )
        )

        serializer = (
            CourseProgressSerializer(
                progress,
                many=True
            )
        )

        return Response({
            "success": True,
            "data": serializer.data
        })