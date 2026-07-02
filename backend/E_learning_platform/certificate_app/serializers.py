from rest_framework import serializers
from .models import Certificate, Feedback


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    certificate_file_url = serializers.SerializerMethodField()

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
        ]

    def get_certificate_file_url(self, obj):
        request = self.context.get("request")
        if obj.certificate_file and request:
            return request.build_absolute_uri(obj.certificate_file.url)
        return None


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
