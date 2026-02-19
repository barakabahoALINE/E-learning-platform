from django.urls import path
from django.contrib.auth import views as auth_views
from .views import  SignupView, VerifyEmailView, LoginView, LogoutView, GoogleLoginView,reset_password,forgot_password

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path("verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify-email"),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/<uidb64>/<token>/', reset_password, name='reset-password'),
]



