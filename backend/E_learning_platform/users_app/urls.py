from django.contrib.auth import views as auth_views
from django.urls import path
from django.urls import path
from .views import reset_password


from .views import forgot_password, reset_password

urlpatterns = [
    path('forgot-password/', forgot_password, name='forgot-password'),
    # path('reset-password/<uid>/<token>/', reset_password, name='reset-password' ),

    path('reset-password/<uidb64>/<token>/', reset_password, name='reset-password'),
]



