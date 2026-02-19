from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.http import urlsafe_base64_decode,urlsafe_base64_encode
from .tokens import email_verification_token
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from .serializers import SignupSerializer, LoginSerializer, LogoutSerializer, GoogleLoginSerializer
from django.contrib.auth.tokens import PasswordResetTokenGenerator 
from django.utils.encoding import force_bytes, force_str
from django.http import HttpResponse
from django.core.mail import send_mail
from rest_framework.decorators import api_view
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

User = get_user_model()

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
                "user": {
                    "email": user.email,
                    "full_name": user.full_name,
                    "institution": user.institution,
                }
            },
            status=status.HTTP_201_CREATED
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

class GoogleLoginView(APIView):

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)

        if serializer.is_valid():
            return Response({
                "success": "True",
                "message": "Google login successful",
                "data": serializer.validated_data
            }, status=status.HTTP_200_OK)

        return Response({
            "success": "False",
            "message": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


# logout view

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
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

    reset_link = f"http://localhost:3000/reset-password/{uid}/{token}/"

    send_mail(
        subject="Reset Your Password",
        message=f"Click to this link to reset your password:\n{reset_link}",
        from_email=None,
        recipient_list=[email],
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
