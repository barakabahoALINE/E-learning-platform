from django.db import models
from django.conf import settings


class CommunityDiscussion(models.Model):
    course_id = models.CharField(max_length=64)
    course_title = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_discussions")
    status = models.CharField(max_length=50, default="Open")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("change_discussion_status", "Can change discussion status"),
        ]

    def __str__(self):
        return f"{self.course_title} — {self.title}"


class CommunityReply(models.Model):
    discussion = models.ForeignKey(CommunityDiscussion, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_replies")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply by {self.author} on {self.discussion}"


class CommunityLike(models.Model):
    class ItemType(models.TextChoices):
        DISCUSSION = "discussion", "Discussion"
        REPLY = "reply", "Reply"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_likes")
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    item_id = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [["user", "item_type", "item_id"]]
        indexes = [
            models.Index(fields=["item_type", "item_id"]),
        ]
        permissions = [
            ("add_like", "Can add like"),
        ]

    def __str__(self):
        return f"{self.user} likes {self.item_type} {self.item_id}"
