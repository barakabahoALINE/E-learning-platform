from rest_framework import serializers
from .models import Course
from rest_framework.validators import UniqueValidator
from .models import Lesson


class CourseCreateUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        validators=[UniqueValidator(queryset=Course.objects.all(), message="Course with this title already exists.")]
    )

    class Meta:
        model = Course
        fields = ["title", "description", "duration", "price"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value
    class Meta:
        model = Course
        fields = ["title", "description", "duration", "price"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class CourseListSerializer(serializers.ModelSerializer):
    admin= serializers.CharField(source="admin.full_name", read_only=True)

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "price",
            "admin",
            "is_published",
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    admin = serializers.CharField(source="admin.full_name", read_only=True)

    class Meta:
        model = Course
        fields = "__all__"
        read_only_fields = ["admin", "created_at", "updated_at"]
        
    

class LessonSerializer(serializers.ModelSerializer):

    class Meta:
        model = Lesson
        fields = "__all__"
        read_only_fields = ["course"]