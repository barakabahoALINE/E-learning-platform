from django.urls import path
from .views import SignupView
from .views import VerifyEmailView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path("verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify-email"),
]