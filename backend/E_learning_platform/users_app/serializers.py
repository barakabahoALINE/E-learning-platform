from rest_framework import serializers, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import ValidationError
from .tokens import email_verification_token
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import Group, Permission
from .services.rbac import sync_user_role_group


User = get_user_model()


def get_user_auth_payload(user):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "institution": user.institution,
        "role": user.role,
        "groups": list(user.groups.values_list("name", flat=True)),
        "permissions": sorted(user.get_all_permissions()),
        "is_superuser": user.is_superuser,
    }

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'institution', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            institution=validated_data['institution'],
            password=validated_data['password']
        )

        sync_user_role_group(user)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        verification_link = f"http://localhost:5173/verify-email/{uid}/{token}"

        try:
            send_mail(
                subject="Verify your email",
                message=f"Click the link to verify your email: {verification_link}",
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            raise serializers.ValidationError(
                "Failed to send verification email. Please try again later."
            )

        return user
# Login Serializer

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid email or password")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password")

        if not user.is_active:
            raise serializers.ValidationError("Account is deactivated")
        
        if not user.is_verified:
            raise serializers.ValidationError("Email is not verified")
        
         # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        refresh = RefreshToken.for_user(user)

        return {
            "user": get_user_auth_payload(user),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

# google login serializer

class GoogleLoginSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate(self, data):
        token = data['token']

        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo['email']
            name = idinfo.get('name')

        except ValueError:
            raise serializers.ValidationError("Invalid Google token")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email,
            }
        )

        refresh = RefreshToken.for_user(user)

        return {
            "user": get_user_auth_payload(user),
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }


# Logout Serializer

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, data):
        self.token = data['refresh']
        return data

    def save(self):
        try:
            token = RefreshToken(self.token)
            token.blacklist()
        except Exception:
            raise serializers.ValidationError("Invalid or expired token")

class UserListSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="name",
    )
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "institution",
            "role",
            "is_verified",
            "is_superuser",
            "groups",
            "permissions",
        ]

    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())
class UserUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "full_name",
            "institution",
            "role",
            "is_active"
        ]

    def validate_role(self, value):
        if value == "learner":
            raise serializers.ValidationError("Learner is not a supported role.")
        return value
class UserDeleteSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ["id"]
    
class ProfilePictureSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['profile_picture']
        
class UpdateNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name']


class UserProfileSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="name",
    )
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "institution",
            "profile_picture",
            "level",
            "role",
            "is_superuser",
            "groups",
            "permissions",
        ]
        read_only_fields = ["id", "email", "role", "groups", "permissions", "is_superuser"]

    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())


class UserRoleAssignSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            ("admin", "Admin"),
            ("instructor", "Instructor"),
            ("student", "Student"),
            ("viewer", "Viewer"),
        ]
    )

    def update(self, instance, validated_data):
        if "role" in validated_data:
            instance.role = validated_data["role"]
            instance.save()
        return instance

    def create(self, validated_data):
        raise NotImplementedError("Use this serializer only for updating a user's role")


class GroupPermissionsUpdateSerializer(serializers.Serializer):
    permissions = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )

    def validate_permissions(self, value):
        permission_objects = []

        for permission_name in value:
            if "." not in permission_name:
                raise serializers.ValidationError(
                    "Each permission must be in the format '<app_label>.<codename>'."
                )

            app_label, codename = permission_name.split(".", 1)
            try:
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename,
                )
            except Permission.DoesNotExist:
                raise serializers.ValidationError(
                    f"Permission '{permission_name}' does not exist."
                )

            permission_objects.append(permission)

        self._validated_permissions = permission_objects
        return value

    def save(self, **kwargs):
        group = self.context.get("group")
        if group is None:
            raise serializers.ValidationError("Group context is required.")

        group.permissions.set(self._validated_permissions)
        return group


class UserPermissionUpdateSerializer(serializers.Serializer):
    permissions = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )

    def validate_permissions(self, value):
        permission_objects = []

        for permission_name in value:
            if "." not in permission_name:
                raise serializers.ValidationError(
                    "Each permission must be in the format '<app_label>.<codename>'."
                )

            app_label, codename = permission_name.split(".", 1)
            try:
                permission = Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename,
                )
            except Permission.DoesNotExist:
                raise serializers.ValidationError(
                    f"Permission '{permission_name}' does not exist."
                )

            permission_objects.append(permission)

        self._validated_permissions = permission_objects
        return value

    def save(self, **kwargs):
        user = self.context.get("user")
        if user is None:
            raise serializers.ValidationError("User context is required.")

        user.user_permissions.set(self._validated_permissions)
        return user


class UserGroupAssignSerializer(serializers.Serializer):
    groups = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )

    def validate_groups(self, value):
        groups = list(Group.objects.filter(name__in=value))
        if len(groups) != len(set(value)):
            raise serializers.ValidationError("One or more groups do not exist.")

        self._validated_groups = groups
        return value

    def save(self, **kwargs):
        user = self.context.get("user")
        if user is None:
            raise serializers.ValidationError("User context is required.")

        user.groups.set(self._validated_groups)
        return user


class GroupSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["id", "name", "permissions"]

    def get_permissions(self, obj):
        return sorted(
            f"{permission.content_type.app_label}.{permission.codename}"
            for permission in obj.permissions.select_related("content_type")
        )


class PermissionSerializer(serializers.ModelSerializer):
    permission = serializers.SerializerMethodField()

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "permission"]

    def get_permission(self, obj):
        return f"{obj.content_type.app_label}.{obj.codename}"
