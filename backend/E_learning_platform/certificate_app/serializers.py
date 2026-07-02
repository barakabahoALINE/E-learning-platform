from django.template.loader import render_to_string
from rest_framework import serializers
from .models import Certificate, Feedback
from .utils import build_certificate_template_context


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    certificate_file_url = serializers.SerializerMethodField()
    preview_html = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = [
            "id",
            "course",
            "course_title",
            "student_name",
            "certificate_number",
            "score",
            "percentage",
            "issued_at",
            "certificate_file_url",
            "is_downloaded",
            "downloaded_at",
            "shared_via",
            "shared_at",
            "preview_html",
        ]
        read_only_fields = [
            "id",
            "course_title",
            "student_name",
            "certificate_number",
            "issued_at",
            "certificate_file_url",
            "is_downloaded",
            "downloaded_at",
            "shared_via",
            "shared_at",
            "preview_html",
        ]

    def get_certificate_file_url(self, obj):
        request = self.context.get("request")
        if obj.certificate_file and request:
            return request.build_absolute_uri(obj.certificate_file.url)
        return None

    def get_preview_html(self, obj):
        if not self.context.get("include_preview_html"):
            return None

        request = self.context.get("request")
        context = build_certificate_template_context(obj, request=request, embed_images=True)
        html = render_to_string("certificate_app/certificate.html", context)

        # Add preview-specific styles so the certificate HTML renders without
        # unwanted white padding or background within the iframe.
        # This keeps the preview tightly fitted to the iframe, matching the
        # card container as closely as possible.
        preview_styles = """
          <style>
            html, body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              width: 842px;
              height: 595px;
              background: transparent;
            }
            body {
              transform: scale(0.87);
              transform-origin: top left;
              width: 842px;
              height: 595px;
            }
            .page {
              margin: 0;
            }
          </style>
        """

        if '<head>' in html:
            html = html.replace('<head>', f'<head>{preview_styles}', 1)
        else:
            html = preview_styles + html

        return html


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = [
            "id",
            "student",
            "course",
            "certificate",
            "overall_rating",
            "content_quality",
            "instructor_clarity",
            "platform_usability",
            "comment",
            "submitted_at",
        ]
        read_only_fields = ["id", "student", "course", "certificate", "submitted_at"]


class CreateFeedbackSerializer(serializers.ModelSerializer):
    overall_rating = serializers.IntegerField(min_value=1, max_value=5)
    content_quality = serializers.IntegerField(min_value=1, max_value=5)
    instructor_clarity = serializers.IntegerField(min_value=1, max_value=5)
    platform_usability = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField()

    class Meta:
        model = Feedback
        fields = [
            "overall_rating",
            "content_quality",
            "instructor_clarity",
            "platform_usability",
            "comment",
        ]

    def validate_comment(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Feedback comment cannot be empty.")
        return value