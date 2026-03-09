
from enrollments_app.models import Enrollment
from rest_framework import serializers
# serializers.py
from .models import Enrollment  # relative import works if models.py is in the same app

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
        


class EnrollmentDetailSerializer(serializers.ModelSerializer):
    student_id = serializers.IntegerField(source="student.id", read_only=True)
    student_first_name = serializers.CharField(source="student.first_name", read_only=True)
    student_last_name = serializers.CharField(source="student.last_name", read_only=True)
    student_email = serializers.EmailField(source="student.email", read_only=True)

    course_id = serializers.IntegerField(source="course.id", read_only=True)
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

# User = get_user_model()

# class StudentBriefSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = User
#         fields = ("id", "first_name", "last_name", "email")

# class CourseStudentsSerializer(serializers.Serializer):
#     student = StudentBriefSerializer()
#     enrollment_id = serializers.IntegerField()
#     status = serializers.CharField()
#     enrolled_at = serializers.DateTimeField()

# class EnrollmentDetailSerializer(serializers.Serializer):
#     id = serializers.IntegerField(read_only=True)
#     student = StudentBriefSerializer(read_only=True)
#     course_id = serializers.IntegerField(source="course.id", read_only=True)
#     status = serializers.CharField()
#     created_at = serializers.DateTimeField(read_only=True)
#     updated_at = serializers.DateTimeField(read_only=True)

#     def validate_status(self, value):
#         allowed = ["active", "pending", "completed", "cancelled"]
#         if value not in allowed:
#             raise serializers.ValidationError(f"Invalid status. Allowed: {allowed}")
#         return value

#     def update(self, instance, validated_data):
#         status = validated_data.get("status")
#         if status:
#             instance.status = status
#             instance.save(update_fields=["status", "updated_at"])
#         return instance