from rest_framework import serializers
from .models import Enrollment
from django.contrib.auth import get_user_model

User = get_user_model()


class EnrollmentSerializer(serializers.ModelSerializer):

    student_email = serializers.ReadOnlyField(source="student.email")
    course_title = serializers.ReadOnlyField(source="course.title")

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "student_email",
            "course",
            "course_title",
            "status",
            "enrolled_at",
            "updated_at"
        ]

        read_only_fields = ["enrolled_at", "updated_at"]

        # disable default unique validator
        validators = []

    def validate(self, data):

        student = data.get("student")
        course = data.get("course")

        if student is not None:
            # 1️⃣ Prevent admin enrollment
            if student.is_staff or student.is_superuser:
                raise serializers.ValidationError({
                    "student": "Admins cannot be enrolled, only students can be enrolled."
                })

            # 2️⃣ Ensure user role is student
            if hasattr(student, "role"):
                if student.role != "student":
                    raise serializers.ValidationError({
                        "student": "Only users with student role can be enrolled."
                    })

        if student is not None and course is not None:
            # 3️⃣ Prevent duplicate enrollment
            if Enrollment.objects.filter(student=student, course=course).exists():
                raise serializers.ValidationError({
                    "enrollment": f"This student {student.email} is already enrolled to this course."
                })

        return data
