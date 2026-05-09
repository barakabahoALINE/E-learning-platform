from django.contrib import admin
from django.urls import path, include
from users_app.views import home

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users_app.urls')),
    path('api/', include('courses_app.urls')),
    path('api/', include('enrollments_app.urls')),
    path('api/progress/', include('progress_app.urls')),
    path('api/assessments/', include('assessments_app.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



