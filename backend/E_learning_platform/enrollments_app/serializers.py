
from enrollments_app.models import Enrollment
from rest_framework import serializers
from .models import Enrollment  

class CourseStudentsSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(source="student.id")
    first_name = serializers.CharField(source="student.first_name")
    last_name = serializers.CharField(source="student.last_name")
    email = serializers.EmailField(source="student.email")

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student_id",
            "first_name",
            "last_name",
            "email",
            "status",
            "created_at",
        ]
      


class EnrollmentDetailSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(source="student.id")
    student_first_name = serializers.CharField(source="student.first_name")
    student_last_name = serializers.CharField(source="student.last_name")
    student_email = serializers.EmailField(source="student.email")

    course_id = serializers.IntegerField(source="course.id")
    course_title = serializers.CharField(source="course.title")

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student_id",
            "student_first_name",
            "student_last_name",
            "student_email",
            "course_id",
            "course_title",
            "status",
            "created_at",
        ]

class AdminEnrollmentSerializer(serializers.ModelSerializer):

    student_email = serializers.EmailField(source="student.email", read_only=True)
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student_id",
            "student_first_name",
            "student_last_name",
            "student_email",
            "course_id",
            "course_title",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "student_id",
            "student_first_name",
            "student_last_name",
            "student_email",
            "course_id",
            "course_title",
            "created_at",
        ]

    def validate_status(self, value):
        allowed_status = ["active", "completed", "cancelled", "pending"]

        if value not in allowed_status:
            raise serializers.ValidationError("Invalid status value.")

        return value