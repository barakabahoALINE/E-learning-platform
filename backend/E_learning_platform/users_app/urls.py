from django.urls import path
from django.contrib.auth import views as auth_views
from .views import  SignupView, VerifyEmailView, LoginView, LogoutView, GoogleLoginView,reset_password,forgot_password
from django.urls import path
from .views import (
    UserListView,
    UserUpdateView,
    UserDeleteView
)
urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path("verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify-email"),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/<uidb64>/<token>/', reset_password, name='reset-password'),
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/<int:id>/update/", UserUpdateView.as_view(), name="user-update"),
    path("users/<int:id>/delete/", UserDeleteView.as_view(), name="user-delete"),

]



