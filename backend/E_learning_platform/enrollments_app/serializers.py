from rest_framework import serializers
from .models import Enrollment


class EnrollmentCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Enrollment
        fields = ["course"]

    def validate(self, data):
        student = self.context["request"].user
        course = data["course"]

        if not course.is_published:
            raise serializers.ValidationError("Cannot enroll in unpublished course.")

        if Enrollment.objects.filter(student=student, course=course).exists():
            raise serializers.ValidationError("You are already enrolled in this course.")

        return data

    def create(self, validated_data):
       student = self.context["request"].user
       course = validated_data["course"]

       enrollment = Enrollment.objects.filter(student=student,course=course).first()

       if enrollment:
                if enrollment.status == Enrollment.Status.CANCELLED:
                    enrollment.status = Enrollment.Status.ACTIVE
                    enrollment.save()
                    return enrollment
                else:
                    raise serializers.ValidationError(
                        "You are already enrolled in this course."
                    )

       return Enrollment.objects.create(
            student=student,
            status=Enrollment.Status.ACTIVE,
            **validated_data
        )

class StudentEnrollmentListSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "course",
            "course_title",
            "status",
            "enrolled_at",
        ]

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
