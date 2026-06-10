from django.shortcuts import render
from google.oauth2 import id_token
from google.auth.transport import requests
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.http import urlsafe_base64_decode,urlsafe_base64_encode
from .tokens import email_verification_token
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from .serializers import (
    AddUserSerializer,
    CreatePasswordSerializer,
    GroupPermissionsUpdateSerializer,
    GroupSerializer,
    LoginSerializer,
    LogoutSerializer,
    PermissionSerializer,
    ProfilePictureSerializer,
    SignupSerializer,
    UpdateNameSerializer,
    UserGroupAssignSerializer,
    UserListSerializer,
    UserPermissionUpdateSerializer,
    UserProfileSerializer,
    UserRoleAssignSerializer,
    UserUpdateSerializer,
)
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.http import HttpResponse, JsonResponse
from django.core.mail import send_mail
from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt
from .permissions import CanAssignRoles, CanModifyPermissions, CanViewUsers, CanChangeUsers, CanDeleteUsers, CanViewRoles, CanViewPermissions,CanAddUsers
import json
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from .services.rbac import DEFAULT_ROLES

User = get_user_model()

class StructuredResponseMixin:
    def handle_exception(self, exc):
        response = super().handle_exception(exc)
        if response is None:
            return response

        if response.status_code >= status.HTTP_400_BAD_REQUEST:
            message = None
            if isinstance(response.data, dict):
                if "detail" in response.data and len(response.data) == 1:
                    message = force_str(response.data["detail"])
                else:
                    first_value = next(iter(response.data.values()), None)
                    if isinstance(first_value, list):
                        message = str(first_value[0]) if first_value else "Validation failed."
                    elif isinstance(first_value, dict):
                        nested = next(iter(first_value.values()), None)
                        message = str(nested[0]) if isinstance(nested, list) and nested else str(nested)
                    else:
                        message = str(first_value)
            else:
                message = str(response.data)

            if not message:
                message = "Validation failed."

            response.data = {
                "status": "failed",
                "message": message,
                "data": None,
            }

        return response


class SignupView(generics.CreateAPIView):
    serializer_class = SignupSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "status": "success",
                "message": "User created successfully",
                "data": {
                    "email": user.email,
                    "full_name": user.full_name,
                    "institution": user.institution,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AddUserApiView(StructuredResponseMixin, generics.CreateAPIView):
    serializer_class = AddUserSerializer
    permission_classes = [IsAuthenticated, CanAddUsers]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "status": "success",
                "message": "User created successfully.",
                "data": UserListSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CreatePasswordApiView(StructuredResponseMixin, APIView):
    permission_classes = []

    def post(self, request):
        serializer = CreatePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "status": "success",
                "message": "Password set successfully.",
                "data": {
                    "id": user.id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                },
            },
            status=status.HTTP_200_OK,
        )

class VerifyEmailView(APIView):

    def get(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            if email_verification_token.check_token(user, token):
                user.is_verified = True
                user.save()
                return Response({
                    "status": "success",
                    "message": "Email verified successfully"}, status=200)

            return Response({
                "status": "error",
                "message": "Invalid or expired token"}, status=400)

        except Exception:
            return Response({"status": "error", "message": "Invalid verification link"}, status=400)# Create your views here.

# login view

class LoginView(APIView):

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response({
                "success": "True",
                "message": "Login successful",
                "data": serializer.validated_data
            }, status=status.HTTP_200_OK)

        return Response({
            "success": "False",
            "message": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

# google login view

class GoogleLoginAPIView(APIView):

    permission_classes = []

    def post(self, request):

        token = request.data.get("token")

        if not token:
            return Response({
                "success": False,
                "message": "Google token is required"
            }, status=400)

        try:
            # VERIFY TOKEN
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get("email")
            full_name = idinfo.get("name", "Google User")

            if not email:
                return Response({
                    "success": False,
                    "message": "Email not found in Google account"
                }, status=400)

            # CREATE OR GET USER
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name": full_name,
                    "institution": "Google User",
                    "role": "student",
                    "is_verified": True,
                }
            )

            # GENERATE JWT
            refresh = RefreshToken.for_user(user)

            return Response({
                "success": True,
                "message": "Google login successful",
                "data": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": user.role,
                        "Permissions": user.get_all_permissions()
                    }
                }
            })

        except ValueError:
            return Response({
                "success": False,
                "message": "Invalid Google token"
            }, status=400)
        
# logout view

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Auto-submit any active attempts
        from assessments_app.models import Attempt
        from assessments_app.views import _calculate_attempt_score
        
        active_attempts = Attempt.objects.filter(
            student=user,
            is_submitted=False
        )
        
        for attempt in active_attempts:
            try:
                _calculate_attempt_score(attempt, user)
            except Exception as e:
                # Log the error but continue with logout
                pass
        
        serializer = LogoutSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": "True",
                "message": "Logout successful"
            }, status=status.HTTP_200_OK)

        return Response({
            "success": "False",
            "message": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

# Create your views here.



def home(request):
    return HttpResponse("Welcome to E-learning Platform!")
# =========================
# FORGOT PASSWORD
# =========================

@api_view(['POST'])
def forgot_password(request):

    email = request.data.get('email')

    if not email:
        return Response(
            {"error": "Email is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    token_generator = PasswordResetTokenGenerator()

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = token_generator.make_token(user)

    reset_link = f"http://localhost:5173/reset-password/{uid}/{token}"

    try:
        send_mail(
            subject="Reset Your Password",
            message=f"Click to this link to reset your password:\n{reset_link}",
            from_email=None,
            recipient_list=[email],
        )
    except Exception as e:
        return Response(
            {"error": "Failed to send email. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return Response(
        {"message": "Password reset email sent"},
        status=status.HTTP_200_OK
    )


@csrf_exempt
def reset_password(request, uidb64, token):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required"}, status=400)

    try:
        data = json.loads(request.body)
        password1 = data.get("new_password")
        password2 = data.get("comfirm_new_password")
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not password1 or not password2:
        return JsonResponse({"error": "Both password fields are required"}, status=400)

    if password1 != password2:
        return JsonResponse({"error": "Passwords do not match"}, status=400)

    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return JsonResponse({"error": "Invalid UID"}, status=400)

    if not default_token_generator.check_token(user, token):
        return JsonResponse({"error": "Invalid or expired token"}, status=400)

    user.set_password(password1)
    user.save()

    return JsonResponse({"message": "Password has been reset successfully"})

class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserListSerializer
    permission_classes = [IsAuthenticated, CanViewUsers]
    
class UserUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAuthenticated, CanChangeUsers]
    lookup_field = "id"
    
class UserDeleteView(generics.DestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, CanDeleteUsers]
    lookup_field = "id"
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        username = instance.email  # cyangwa email niba ushaka
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "message": f"User '{username}' has been deleted successfully."
            },
            status=status.HTTP_200_OK
        )


class UserRoleAssignView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRoleAssignSerializer
    permission_classes = [IsAuthenticated, CanAssignRoles]
    lookup_field = "id"

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = UserListSerializer(instance)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class UserRoleUpdateView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRoleAssignSerializer
    permission_classes = [IsAuthenticated, CanAssignRoles]
    lookup_field = "id"
    lookup_url_kwarg = "user_id"

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = UserListSerializer(instance)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class UserPermissionsUpdateView(APIView):
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserPermissionUpdateSerializer(
            data=request.data,
            context={"user": user},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserListSerializer(user).data, status=status.HTTP_200_OK)


class UserGroupsUpdateView(APIView):
    permission_classes = [IsAuthenticated, CanAssignRoles]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserGroupAssignSerializer(
            data=request.data,
            context={"user": user},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(UserListSerializer(user).data, status=status.HTTP_200_OK)


class RolePermissionUpdateView(APIView):
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def patch(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "Role not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = GroupPermissionsUpdateSerializer(
            data=request.data,
            context={"group": group},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(GroupSerializer(group).data, status=status.HTTP_200_OK)


class ProfileAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "put", "head", "options"]

    def get_object(self):
        return self.request.user


class RoleListView(generics.ListAPIView):
    queryset = Group.objects.all().order_by("name")
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated, CanViewRoles]


class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.select_related("content_type").all().order_by(
        "content_type__app_label",
        "codename",
    )
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, CanViewPermissions]


class RoleCreateView(APIView):
    """Create a new role (Group). Admins with modify permission can create roles.

    Payload: { "name": "RoleName", "permissions": ["app_label.codename", ...] }
    """
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def post(self, request):
        name = request.data.get("name")
        perms = request.data.get("permissions", [])

        if not name:
            return Response({"detail": "Role name is required."}, status=400)

        # Prevent creation of core roles by non-superusers
        from .services.rbac import DEFAULT_ROLES
        if name in DEFAULT_ROLES and not request.user.is_superuser:
            return Response({"detail": "Cannot create reserved role."}, status=403)

        group, created = Group.objects.get_or_create(name=name)

        # validate and attach permissions
        if perms:
            serializer = GroupPermissionsUpdateSerializer(data={"permissions": perms}, context={"group": group})
            serializer.is_valid(raise_exception=True)
            serializer.save()

        return Response(GroupSerializer(group).data, status=201 if created else 200)


class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def get(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response({"detail": "Role not found."}, status=404)

        return Response(GroupSerializer(group).data)

    def patch(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response({"detail": "Role not found."}, status=404)

        # Only superuser can rename or modify default roles
        from .services.rbac import DEFAULT_ROLES
        if group.name in DEFAULT_ROLES and not request.user.is_superuser:
            # allow updating permissions but not renaming
            perms = request.data.get("permissions")
            if perms is None:
                return Response({"detail": "Modifying reserved role requires superuser."}, status=403)

        serializer = GroupPermissionsUpdateSerializer(data=request.data, context={"group": group})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(GroupSerializer(group).data)

    def delete(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response({"detail": "Role not found."}, status=404)

        from .services.rbac import DEFAULT_ROLES
        if group.name in DEFAULT_ROLES and not request.user.is_superuser:
            return Response({"detail": "Cannot delete reserved role."}, status=403)

        group.delete()
        return Response({"detail": "Role deleted."}, status=200)


class RoleDeleteView(APIView):
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def delete(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response({"detail": "Role not found."}, status=404)

        from .services.rbac import DEFAULT_ROLES
        if group.name in DEFAULT_ROLES and not request.user.is_superuser:
            return Response({"detail": "Cannot delete reserved role."}, status=403)

        group.delete()
        return Response({"detail": "Role deleted."}, status=200)


class RolePermissionAssignView(APIView):
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    def patch(self, request, role_id):
        try:
            group = Group.objects.get(pk=role_id)
        except Group.DoesNotExist:
            return Response({"detail": "Role not found."}, status=404)

        serializer = GroupPermissionsUpdateSerializer(data=request.data, context={"group": group})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(GroupSerializer(group).data, status=200)


class PermissionCreateView(APIView):
    """Create a new Permission entry. Admins can create non-core permissions; superusers can create any.

    Payload: { "app_label": "app_label", "codename": "codename", "name": "Human Readable" }
    """
    permission_classes = [IsAuthenticated, CanModifyPermissions]

    CORE_APPS = {"auth", "contenttypes", "sessions", "admin"}

    def post(self, request):
        app_label = request.data.get("app_label")
        codename = request.data.get("codename")
        name = request.data.get("name")

        if not all([app_label, codename, name]):
            return Response({"detail": "app_label, codename and name are required."}, status=400)

        if app_label in self.CORE_APPS and not request.user.is_superuser:
            return Response({"detail": "Only superusers can create core system permissions."}, status=403)

        try:
            content_type = ContentType.objects.get(app_label=app_label)
        except ContentType.DoesNotExist:
            return Response({"detail": f"App label '{app_label}' is not recognized."}, status=400)

        permission, created = Permission.objects.get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={"name": name},
        )

        if not created:
            return Response({"detail": "Permission already exists."}, status=200)

        return Response(PermissionSerializer(permission).data, status=201)
        
class UpdateProfilePictureAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user

        serializer = ProfilePictureSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Profile picture updated successfully",
                "data": serializer.data
            }, status=200)

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=400)
        
class UpdateNameAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user

        serializer = UpdateNameSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success",
                "message": "Name updated successfully",
                "data": serializer.data
            }, status=200)

        return Response({
            "status": "failed",
            "errors": serializer.errors
        }, status=400)
