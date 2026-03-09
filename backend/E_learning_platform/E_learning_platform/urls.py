from django.contrib import admin
from django.urls import path, include
from users_app.views import home

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users_app.urls')),
    path('api/', include('courses_app.urls')),
    path('api/', include('enrollments_app.urls')),
    
]


