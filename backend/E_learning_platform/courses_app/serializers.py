from rest_framework import serializers
from .models import Course


class CourseCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Course
        fields = ["title", "description", "duration", "price"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class CourseListSerializer(serializers.ModelSerializer):
    instructor = serializers.CharField(source="instructor.full_name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "price",
            "instructor",
            "is_published",
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    instructor = serializers.CharField(source="instructor.full_name", read_only=True)

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["instructor", "created_at", "updated_at"]