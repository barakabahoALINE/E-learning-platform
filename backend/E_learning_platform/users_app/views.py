from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .tokens import email_verification_token
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from .serializers import SignupSerializer, LoginSerializer, LogoutSerializer, GoogleLoginSerializer

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

