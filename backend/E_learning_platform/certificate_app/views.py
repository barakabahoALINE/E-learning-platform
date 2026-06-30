from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from assessments_app.models import Attempt

from courses_app.models import Course
from .models import Certificate, Feedback
from .serializers import (
    CertificateSerializer,
    FeedbackSerializer,
    CreateFeedbackSerializer,
)
from .permissions import (
    CanDownloadCertificate,
    CanShareCertificate,
    CanViewCertificate,
    CanSubmitCertificateFeedback,
)
from .utils import (
    course_completed_by_student,
    generate_certificate_file,
)
from .services import CertificateShareService, get_sharing_method


class ClaimCertificateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanSubmitCertificateFeedback]

    def get(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        final_passed, enrollment, course_progress = course_completed_by_student(request.user, course_id)

        if not enrollment:
            return Response({"success": False, "message": "Not enrolled in this course."}, status=status.HTTP_403_FORBIDDEN)
        if not course_progress:
            return Response({"success": False, "message": "Course progress is not complete."}, status=status.HTTP_403_FORBIDDEN)
        if not final_passed:
            return Response({"success": False, "message": "Final assessment must be passed before claiming a certificate."}, status=status.HTTP_403_FORBIDDEN)

        certificate = Certificate.objects.filter(student=request.user, course=course).first()
        data = {
            "course": course.title,
            "eligible": True,
            "certificate_exists": bool(certificate),
            "certificate": CertificateSerializer(certificate, context={"request": request}).data if certificate else None,
        }
        return Response({"success": True, "data": data})


class SubmitCertificateFeedbackAPIView(APIView):
    permission_classes = [IsAuthenticated, CanSubmitCertificateFeedback]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        final_passed, enrollment, course_progress = course_completed_by_student(request.user, course_id)

        if not enrollment:
            return Response({"success": False, "message": "Not enrolled in this course."}, status=status.HTTP_403_FORBIDDEN)
        if not course_progress:
            return Response({"success": False, "message": "Course progress is not complete."}, status=status.HTTP_403_FORBIDDEN)
        if not final_passed:
            return Response({"success": False, "message": "Final assessment must be passed first."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CreateFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        feedback, _ = Feedback.objects.update_or_create(
            student=request.user,
            course=course,
            defaults={
                **serializer.validated_data,
            },
        )

        final_attempt = Attempt.objects.filter(
            student=request.user,
            assessment__course=course,
            assessment__assessment_type="FINAL",
            is_submitted=True,
            is_passed=True,
        ).order_by("-submitted_at").first()

        percentage = final_attempt.percentage if final_attempt else course_progress.progress_percentage
        score = final_attempt.score if final_attempt else 0.0

        certificate, created = Certificate.objects.get_or_create(
            student=request.user,
            course=course,
            defaults={
                "enrollment": enrollment,
                "course_progress": course_progress,
                "score": score,
                "percentage": percentage,
            },
        )

        if not created:
            certificate.enrollment = enrollment
            certificate.course_progress = course_progress
            certificate.score = score
            certificate.percentage = percentage
            certificate.save()

        if not certificate.certificate_file:
            generate_certificate_file(certificate)

        feedback.certificate = certificate
        feedback.save(update_fields=["certificate"])

        return Response({
            "success": True,
            "message": "Feedback submitted and certificate generated successfully.",
            "data": CertificateSerializer(certificate, context={"request": request}).data,
        }, status=status.HTTP_201_CREATED)


class CertificateListAPIView(APIView):
    permission_classes = [IsAuthenticated, CanViewCertificate]

    def get(self, request):
        certificates = Certificate.objects.filter(student=request.user)
        serializer = CertificateSerializer(certificates, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class CertificateDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, CanViewCertificate]

    def get_object(self, certificate_id):
        certificate = get_object_or_404(Certificate, id=certificate_id)
        if not (self.request.user.is_superuser or certificate.student == self.request.user):
            raise Http404
        return certificate

    def get(self, request, certificate_id):
        certificate = self.get_object(certificate_id)
        serializer = CertificateSerializer(certificate, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class DownloadCertificateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanDownloadCertificate]

    def get(self, request, certificate_id):
        certificate = get_object_or_404(Certificate, id=certificate_id)
        if not (request.user.is_superuser or certificate.student == request.user):
            return Response({"success": False, "message": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        if not certificate.certificate_file:
            generate_certificate_file(certificate)

        certificate.is_downloaded = True
        certificate.downloaded_at = timezone.now()
        certificate.save(update_fields=["is_downloaded", "downloaded_at"])

        return Response({
            "success": True,
            "download_url": request.build_absolute_uri(certificate.certificate_file.url),
        })


class ShareCertificateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanShareCertificate]

    def post(self, request, certificate_id):
        certificate = get_object_or_404(Certificate, id=certificate_id)
        if not (request.user.is_superuser or certificate.student == request.user):
            return Response(
                {"success": False, "message": "Not authorized."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        platform = request.data.get("platform", "").lower()
        
        # Validate platform is provided
        if not platform:
            return Response({
                "success": False,
                "message": "Platform is required. Supported: linkedin"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the appropriate sharing method
        share_method = get_sharing_method(platform)
        
        if not share_method:
            return Response({
                "success": False,
                "message": f"Unsupported platform: {platform}. Supported: linkedin"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Execute the sharing based on platform
        if platform == "linkedin":
            access_token = request.data.get("access_token")
            if not access_token:
                return Response({
                    "success": False,
                    "message": "LinkedIn access token required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            share_result = share_method(certificate, access_token)
        
        else:
            return Response({
                "success": False,
                "message": f"Sharing method for {platform} not implemented"
            }, status=status.HTTP_400_BAD_REQUEST)

        # If sharing failed, return error
        if not share_result.get("success"):
            return Response({
                "success": False,
                "message": share_result.get("message", "Sharing failed")
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update certificate metadata
        certificate.shared_via = platform
        certificate.shared_at = timezone.now()
        certificate.save(update_fields=["shared_via", "shared_at"])

        return Response({
            "success": True,
            "message": share_result.get("message", f"Certificate shared via {platform} successfully."),
            "data": CertificateSerializer(certificate, context={"request": request}).data,
            "share_details": share_result
        }, status=status.HTTP_200_OK)