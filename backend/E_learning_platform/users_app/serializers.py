from rest_framework import serializers, status
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password as django_validate_password
from django.contrib.auth.tokens import default_token_generator
from .tokens import email_verification_token
from django.utils.encoding import force_bytes, force_str
import re
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from django.utils import timezone
from django.db import transaction
from django.contrib.auth.models import Group, Permission
from .services.rbac import sync_user_role_group
from .models import RoleMetadata


User = get_user_model()


def get_password_validation_errors(password, user=None):
    errors = []

    try:
        django_validate_password(password, user=user)
    except DjangoValidationError as exc:
        errors.extend(exc.messages)

    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must contain at least one special character.")

    return errors


def validate_strong_password(password, user=None):
    errors = get_password_validation_errors(password, user=user)
    if errors:
        raise serializers.ValidationError({"password": errors})
    return password

def _is_custom_permission(permission: Permission) -> bool:
    return permission.content_type.app_label.endswith("_app")

def _permission_name(permission: Permission) -> str:
    return f"{permission.content_type.app_label}.{permission.codename}"

def resolve_custom_permission(permission_name: str) -> Permission:
    app_label, codename = permission_name.split(".", 1)
    permissions_qs = Permission.objects.filter(
        content_type__app_label=app_label,
        codename=codename,
    ).select_related("content_type").order_by("content_type__model", "id")

    if not permissions_qs.exists():
        raise serializers.ValidationError(
            f"Permission '{permission_name}' does not exist."
        )

    return permissions_qs.first()

def get_user_auth_payload(user):
    profile_pic_url = user.profile_picture.url if user.profile_picture else None
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "institution": user.institution,
        "role": user.role,
        "profile_picture": profile_pic_url,
        "avatar": profile_pic_url,
        "groups": list(user.groups.values_list("name", flat=True)),
        "permissions": sorted(
            permission
            for permission in user.get_all_permissions()
            if permission.split(".", 1)[0].endswith("_app") or permission.split(".", 1)[0] == "auth"
        ),
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
    }

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'institution', 'password']

    def validate_password(self, value):
        return validate_strong_password(value)

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


class AddUserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=[
            ("admin", "Admin"),
            ("instructor", "Instructor"),
            ("viewer", "Viewer"),
        ],
        default="instructor",
    )
    status = serializers.ChoiceField(
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
        ],
        default="inactive",
        required=False,
    )
    department = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "full_name", "institution", "department", "role", "status"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_role(self, value):
        if value == "student":
            raise serializers.ValidationError("Students must register through signup, not admin add.")

        request = self.context.get("request")
        if value == "admin" and request and not request.user.is_superuser:
            raise serializers.ValidationError("Only a super admin can assign the admin role.")

        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request and not request.user.is_superuser:
            attrs["institution"] = request.user.institution
            attrs["status"] = "inactive"
        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            user = User.objects.create_user(
                email=validated_data["email"],
                full_name=validated_data["full_name"],
                institution=validated_data["institution"],
                department=validated_data.get("department", ""),
                password=None,
                role=validated_data["role"],
                is_active=False,
            )

            sync_user_role_group(user)

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            set_password_link = f"http://localhost:5173/reset-password/{uid}/{token}?mode=setup"

            try:
                send_mail(
                    subject="Set your platform password",
                    message=(
                        f"Dear {user.full_name},\n\n"
                        "You have been added to the platform by an administrator.\n"
                        f"Please set your password using the link below:\n{set_password_link}\n\n"
                        "If you did not expect this message, please contact your administrator."
                    ),
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                raise serializers.ValidationError("Failed to send invite email. Please try again later.")

            return user


class CreatePasswordSerializer(serializers.Serializer):
    uidb64 = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value):
        return validate_strong_password(value)

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        try:
            uid = force_str(urlsafe_base64_decode(attrs.get("uidb64")))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uidb64": "Invalid UID."})

        if not default_token_generator.check_token(user, attrs.get("token")):
            raise serializers.ValidationError({"token": "Invalid or expired token."})

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        password = self.validated_data["password"]
        user.set_password(password)
        user.is_verified = True
        user.is_active = True  # Activate user on first password setup
        user.save()
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
                "full_name": name or email,
                "institution": "Google User",
                "role": "student",
                "is_verified": True,
                "is_active": True,
            }
        )

        if created:
            sync_user_role_group(user)
        else:
            if not user.is_verified:
                user.is_verified = True
            sync_user_role_group(user)
            user.save(update_fields=["is_verified"])

        if not user.is_active:
            raise serializers.ValidationError("Account is deactivated")

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
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "institution",
            "department",
            "role",
            "status",
            "is_verified",
            "is_superuser",
            "groups",
            "permissions",
            "last_login",
            "date_joined",
        ]

    def get_permissions(self, obj):
        return sorted(
            permission
            for permission in obj.get_all_permissions()
            if permission.split(".", 1)[0].endswith("_app") or permission.split(".", 1)[0] == "auth"
        )

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"

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

        request = self.context.get("request")
        if value == "admin" and request and not request.user.is_superuser:
            raise serializers.ValidationError("Only a super admin can assign the admin role.")

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
        return sorted(
            permission
            for permission in obj.get_all_permissions()
            if permission.split(".", 1)[0].endswith("_app") or permission.split(".", 1)[0] == "auth"
        )


class UserRoleAssignSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            ("admin", "Admin"),
            ("instructor", "Instructor"),
            ("student", "Student"),
            ("viewer", "Viewer"),
        ]
    )

    def validate_role(self, value):
        request = self.context.get("request")
        if value == "admin" and request and not request.user.is_superuser:
            raise serializers.ValidationError("Only a super admin can assign the admin role.")
        return value

    def update(self, instance, validated_data):
        if "role" in validated_data:
            instance.role = validated_data["role"]
            instance.save()
            # synchronize group membership to reflect role change
            try:
                sync_user_role_group(instance)
            except Exception:
                # best-effort: do not block role assignment on sync failures
                pass
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

            permission_objects.append(resolve_custom_permission(permission_name))

        self._validated_permissions = permission_objects
        return value

    def save(self, **kwargs):
        group = self.context.get("group")
        if group is None:
            raise serializers.ValidationError("Group context is required.")

        # Preserve permissions that do not end with _app (e.g. auth.*)
        non_custom_perms = [
            p for p in group.permissions.all()
            if not p.content_type.app_label.endswith("_app")
        ]
        
        # Merge with validated permissions
        final_permissions = list(set(self._validated_permissions + non_custom_perms))
        group.permissions.set(final_permissions)
        return group

class GroupUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=150)
    description = serializers.CharField(required=False, allow_blank=True)
    permissions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
    )

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Role name cannot be empty.")

        group = self.context.get("group")
        queryset = Group.objects.filter(name__iexact=value)
        if group is not None:
            queryset = queryset.exclude(pk=group.pk)
        if queryset.exists():
            raise serializers.ValidationError("A role with this name already exists.")
        return value

    def validate_permissions(self, value):
        permission_objects = []

        for permission_name in value:
            if "." not in permission_name:
                raise serializers.ValidationError(
                    "Each permission must be in the format '<app_label>.<codename>'."
                )

            permission_objects.append(resolve_custom_permission(permission_name))

        self._validated_permissions = permission_objects
        return value

    def save(self, **kwargs):
        group = self.context.get("group")
        if group is None:
            raise serializers.ValidationError("Group context is required.")

        if "name" in self.validated_data:
            group.name = self.validated_data["name"]
            group.save(update_fields=["name"])

        metadata, _ = RoleMetadata.objects.get_or_create(group=group)
        if "description" in self.validated_data:
            metadata.description = self.validated_data["description"]
            metadata.save(update_fields=["description", "updated_at"])

        if "permissions" in self.validated_data:
            non_custom_perms = [
                p for p in group.permissions.all()
                if not p.content_type.app_label.endswith("_app")
            ]
            final_permissions = list(set(self._validated_permissions + non_custom_perms))
            group.permissions.set(final_permissions)
            metadata.save(update_fields=["updated_at"])

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

            permission_objects.append(resolve_custom_permission(permission_name))

        self._validated_permissions = permission_objects
        return value

    def save(self, **kwargs):
        user = self.context.get("user")
        if user is None:
            raise serializers.ValidationError("User context is required.")

        # Preserve permissions that do not end with _app (e.g. auth.*)
        non_custom_perms = [
            p for p in user.user_permissions.all()
            if not p.content_type.app_label.endswith("_app")
        ]
        
        final_permissions = list(set(self._validated_permissions + non_custom_perms))
        user.user_permissions.set(final_permissions)
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
    description = serializers.SerializerMethodField()
    last_modified = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = ["id", "name", "description", "permissions", "last_modified"]

    def get_permissions(self, obj):
        return sorted(
            {
                _permission_name(permission)
                for permission in obj.permissions.select_related("content_type").all()
                if _is_custom_permission(permission)
            }
        )

    def get_description(self, obj):
        metadata = getattr(obj, "metadata", None)
        return metadata.description if metadata else ""

    def get_last_modified(self, obj):
        metadata = getattr(obj, "metadata", None)
        return metadata.updated_at.isoformat() if metadata else None

class PermissionSerializer(serializers.ModelSerializer):
    permission = serializers.SerializerMethodField()

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "permission"]

    def get_permission(self, obj):
        return f"{obj.content_type.app_label}.{obj.codename}"
