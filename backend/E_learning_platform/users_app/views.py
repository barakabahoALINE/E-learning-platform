# Create your views here.
from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.http import HttpResponse
from django.core.mail import send_mail
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json



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
