from rest_framework import serializers
from .models import CommunityDiscussion, CommunityReply, CommunityLike


class CommunityReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = CommunityReply
        fields = [
            "id",
            "discussion",
            "author",
            "author_name",
            "content",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "discussion", "author", "author_name", "created_at", "updated_at"]


class CommunityDiscussionSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    reply_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CommunityDiscussion
        fields = [
            "id",
            "course_id",
            "course_title",
            "title",
            "description",
            "author",
            "author_name",
            "status",
            "reply_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "author_name", "reply_count", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["reply_count"] = instance.replies.count()
        return data


class CommunityLikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityLike
        fields = ["id", "user", "item_type", "item_id", "created_at"]
        read_only_fields = ["id", "user", "created_at"]
