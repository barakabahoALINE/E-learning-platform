from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    Group,
    PermissionsMixin
)
from django.utils import timezone


class TrainingUserProfile(models.Model):
    user = models.OneToOneField("User", on_delete=models.CASCADE, related_name="traininguserprofile")
    trainings = models.ManyToManyField("assessments_app.Training", related_name="training_users", blank=True)
    national_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    province = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    must_change_password = models.BooleanField(default=False)
    created_by = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True, related_name="created_training_users")
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} training profile"


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = (
        ("student", "Student"),
        ("instructor", "Instructor"),
        ("viewer", "Viewer"),
        ("admin", "Admin"),
        ("super_admin", "Super Admin"),
        ("training_user", "Training User"),
    )
    LEVEL_CHOICES = (
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    )

    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, null=True, blank=True)


    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    institution = models.CharField(max_length=255)
    department = models.CharField(max_length=255, null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    objects = UserManager()
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "institution"]

    class Meta:
        permissions = [
            ("assign_role", "Can assign roles"),
            ("modify_role", "Can modify roles"),
            ("modify_permission", "Can modify permissions"),
            ("view_analytics", "Can view analytics"),
            ("change_platform_settings", "Can change platform settings"),
        ]
    
    def save(self, *args, **kwargs):
        # set role based on is_superuser status
        if self.is_superuser:
            self.role = "super_admin"
            self.is_staff = True
            self.is_verified = True
        elif self.role == "admin":
            self.is_staff = True
        elif self.role == "training_user":
            self.is_staff = False
        else:
            self.is_staff = False

        super().save(*args, **kwargs)

        if self.pk:
            from .services.rbac import sync_user_role_group

            sync_user_role_group(self)

            if self.role == "training_user" and not TrainingUserProfile.objects.filter(user=self).exists():
                TrainingUserProfile.objects.get_or_create(user=self)

    
    def __str__(self):
        return self.email


class RoleMetadata(models.Model):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="metadata")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.group.name} metadata"


class AuditLog(models.Model):
    SEVERITY_CHOICES = (
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
    )
    STATUS_CHOICES = (
        ("success", "Success"),
        ("warning", "Warning"),
        ("failed", "Failed"),
        ("critical", "Critical"),
    )

    actor = models.ForeignKey("User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=120)
    target = models.CharField(max_length=255, blank=True, default="")
    details = models.TextField(blank=True, default="")
    module = models.CharField(max_length=80, default="Access Management")
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="info")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} by {self.actor.email if self.actor else 'system'}"