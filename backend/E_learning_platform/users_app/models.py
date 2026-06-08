from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    Group,
    PermissionsMixin
)
from django.utils import timezone


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
        else:
            self.is_staff = False

        super().save(*args, **kwargs)

        if self.pk:
            from .services.rbac import sync_user_role_group

            sync_user_role_group(self)

    
    def __str__(self):
        return self.email


class RoleMetadata(models.Model):
    group = models.OneToOneField(Group, on_delete=models.CASCADE, related_name="metadata")
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.group.name} metadata"
