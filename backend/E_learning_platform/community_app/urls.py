from django.urls import path
from .views import *

urlpatterns = [
    path("discussions/", DiscussionListAPIView.as_view(), name="community-discussion-list"),
    path("discussions/create/", DiscussionCreateAPIView.as_view(), name="community-discussion-create"),
    path("discussions/<int:pk>/", DiscussionDetailAPIView.as_view(), name="community-discussion-detail"),
    path("discussions/<int:pk>/update/", DiscussionUpdateAPIView.as_view(), name="community-discussion-update"),
    path("discussions/<int:pk>/delete/", DiscussionDeleteAPIView.as_view(), name="community-discussion-delete"),
    path("discussions/<int:pk>/status/", CommunityDiscussionStatusUpdateAPIView.as_view(), name="community-discussion-status-update"),
    path("discussions/<int:discussion_id>/replies/", ReplyListAPIView.as_view(), name="community-reply-list"),
    path("discussions/<int:discussion_id>/replies/create/", ReplyCreateAPIView.as_view(), name="community-reply-create"),
    path("replies/<int:pk>/", ReplyDetailAPIView.as_view(), name="community-reply-detail"),
    path("replies/<int:pk>/update/", ReplyUpdateAPIView.as_view(), name="community-reply-update"),
    path("replies/<int:pk>/delete/", ReplyDeleteAPIView.as_view(), name="community-reply-delete"),
    path("likes/", LikeListAPIView.as_view(), name="community-like-list"),
    path("likes/create/", LikeCreateAPIView.as_view(), name="community-like-create"),
    path("likes/<int:pk>/", LikeDetailAPIView.as_view(), name="community-like-detail"),
    path("likes/<int:pk>/delete/", LikeDeleteAPIView.as_view(), name="community-like-delete"),
]
