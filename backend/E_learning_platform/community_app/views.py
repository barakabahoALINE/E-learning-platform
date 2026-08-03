from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import CommunityDiscussion, CommunityReply, CommunityLike
from .serializers import CommunityDiscussionSerializer, CommunityReplySerializer, CommunityLikeSerializer
from .permissions import (
    CanViewDiscussion,
    CanAddDiscussion,
    CanChangeDiscussion,
    CanDeleteDiscussion,
    CanChangeDiscussionStatus,
    CanViewReply,
    CanAddReply,
    CanChangeReply,
    CanDeleteReply,
    CanViewLike,
    CanDeleteLike,
    CanAddLike,
)


def _get_discussion_queryset(user):
    queryset = CommunityDiscussion.objects.select_related("author").prefetch_related("replies")
    return queryset


class DiscussionListAPIView(generics.ListAPIView):
    serializer_class = CommunityDiscussionSerializer
    permission_classes = [IsAuthenticated, CanViewDiscussion]

    def get_queryset(self):
        return _get_discussion_queryset(self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Discussions retrieved successfully.",
                "data": serializer.data,
            }
        )


class DiscussionCreateAPIView(generics.CreateAPIView):
    serializer_class = CommunityDiscussionSerializer
    permission_classes = [IsAuthenticated, CanAddDiscussion]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "success": True,
                "message": "Discussion created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class DiscussionDetailAPIView(generics.RetrieveAPIView):
    serializer_class = CommunityDiscussionSerializer
    permission_classes = [IsAuthenticated, CanViewDiscussion]
    queryset = CommunityDiscussion.objects.select_related("author").prefetch_related("replies")

    def retrieve(self, request, *args, **kwargs):
        discussion = self.get_object()
        serializer = self.get_serializer(discussion)
        return Response(
            {
                "success": True,
                "message": "Discussion retrieved successfully.",
                "data": serializer.data,
            }
        )


class DiscussionUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CommunityDiscussionSerializer
    permission_classes = [IsAuthenticated, CanChangeDiscussion]
    queryset = CommunityDiscussion.objects.select_related("author").prefetch_related("replies")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        discussion = self.get_object()
        serializer = self.get_serializer(discussion, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Discussion updated successfully.",
                "data": serializer.data,
            }
        )


class DiscussionDeleteAPIView(generics.DestroyAPIView):
    serializer_class = CommunityDiscussionSerializer
    permission_classes = [IsAuthenticated, CanDeleteDiscussion]
    queryset = CommunityDiscussion.objects.select_related("author").prefetch_related("replies")

    def destroy(self, request, *args, **kwargs):
        discussion = self.get_object()
        discussion.delete()
        return Response(
            {
                "success": True,
                "message": "Discussion deleted successfully.",
                "data": None,
            },
            status=status.HTTP_204_NO_CONTENT,
        )


class ReplyListAPIView(generics.ListAPIView):
    serializer_class = CommunityReplySerializer
    permission_classes = [IsAuthenticated, CanViewReply]

    def get_queryset(self):
        discussion_id = self.kwargs["discussion_id"]
        return CommunityReply.objects.filter(discussion_id=discussion_id).select_related("author")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Replies retrieved successfully.",
                "data": serializer.data,
            }
        )


class ReplyCreateAPIView(generics.CreateAPIView):
    serializer_class = CommunityReplySerializer
    permission_classes = [IsAuthenticated, CanAddReply]

    def perform_create(self, serializer):
        discussion = get_object_or_404(CommunityDiscussion, pk=self.kwargs["discussion_id"])
        serializer.save(author=self.request.user, discussion=discussion)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {
                "success": True,
                "message": "Reply added successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class ReplyDetailAPIView(generics.RetrieveAPIView):
    serializer_class = CommunityReplySerializer
    permission_classes = [IsAuthenticated, CanViewReply]
    queryset = CommunityReply.objects.select_related("author", "discussion")

    def retrieve(self, request, *args, **kwargs):
        reply = self.get_object()
        serializer = self.get_serializer(reply)
        return Response(
            {
                "success": True,
                "message": "Reply retrieved successfully.",
                "data": serializer.data,
            }
        )


class ReplyUpdateAPIView(generics.UpdateAPIView):
    serializer_class = CommunityReplySerializer
    permission_classes = [IsAuthenticated, CanChangeReply]
    queryset = CommunityReply.objects.select_related("author", "discussion")

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        reply = self.get_object()
        serializer = self.get_serializer(reply, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Reply updated successfully.",
                "data": serializer.data,
            }
        )


class ReplyDeleteAPIView(generics.DestroyAPIView):
    serializer_class = CommunityReplySerializer
    permission_classes = [IsAuthenticated, CanDeleteReply]
    queryset = CommunityReply.objects.select_related("author", "discussion")

    def destroy(self, request, *args, **kwargs):
        reply = self.get_object()
        reply.delete()
        return Response(
            {
                "success": True,
                "message": "Reply deleted successfully.",
                "data": None,
            },
            status=status.HTTP_204_NO_CONTENT,
        )


class CommunityDiscussionStatusUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated, CanChangeDiscussionStatus]

    def patch(self, request, pk):
        discussion = get_object_or_404(CommunityDiscussion, pk=pk)
        status_value = request.data.get("status")

        if not status_value:
            return Response({"success": False, "message": "Status is required."}, status=status.HTTP_400_BAD_REQUEST)

        discussion.status = status_value
        discussion.save()
        serializer = CommunityDiscussionSerializer(discussion)

        return Response(
            {
                "success": True,
                "message": "Discussion status updated successfully.",
                "data": serializer.data,
            }
        )


class LikeListAPIView(generics.ListAPIView):
    serializer_class = CommunityLikeSerializer
    permission_classes = [IsAuthenticated, CanViewLike]

    def get_queryset(self):
        return CommunityLike.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "success": True,
                "message": "Likes retrieved successfully.",
                "data": serializer.data,
            }
        )


class LikeCreateAPIView(generics.CreateAPIView):
    serializer_class = CommunityLikeSerializer
    permission_classes = [IsAuthenticated, CanAddLike]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        item_type = request.data.get("item_type")
        item_id = request.data.get("item_id")

        if item_type not in ["discussion", "reply"]:
            return Response(
                {"success": False, "message": "Invalid item_type."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not item_id:
            return Response(
                {"success": False, "message": "item_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        like, created = CommunityLike.objects.get_or_create(
            user=request.user,
            item_type=item_type,
            item_id=item_id,
        )

        if not created:
            serializer = self.get_serializer(like)
            return Response(
                {
                    "success": False,
                    "message": "Like already exists.",
                    "data": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(like)
        return Response(
            {
                "success": True,
                "message": "Like created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class LikeDetailAPIView(generics.RetrieveAPIView):
    serializer_class = CommunityLikeSerializer
    permission_classes = [IsAuthenticated, CanViewLike]
    queryset = CommunityLike.objects.select_related("user")

    def retrieve(self, request, *args, **kwargs):
        like = self.get_object()
        serializer = self.get_serializer(like)
        return Response(
            {
                "success": True,
                "message": "Like retrieved successfully.",
                "data": serializer.data,
            }
        )


class LikeDeleteAPIView(generics.DestroyAPIView):
    serializer_class = CommunityLikeSerializer
    permission_classes = [IsAuthenticated, CanDeleteLike]
    queryset = CommunityLike.objects.select_related("user")

    def destroy(self, request, *args, **kwargs):
        like = self.get_object()
        like.delete()
        return Response(
            {
                "success": True,
                "message": "Like deleted successfully.",
                "data": None,
            },
            status=status.HTTP_204_NO_CONTENT,
        )
