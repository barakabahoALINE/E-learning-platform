from django.urls import path
from .views import  SignupView, VerifyEmailView, LoginView, LogoutView, GoogleLoginView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path("verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify-email"),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
]
