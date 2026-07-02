from django.urls import path
from .views import (
    ClaimCertificateAPIView,
    SubmitCertificateFeedbackAPIView,
    CertificateListAPIView,
    CertificateDetailAPIView,
    DownloadCertificateAPIView,
    ShareCertificateAPIView,
)

urlpatterns = [
    path("claim/<int:course_id>/", ClaimCertificateAPIView.as_view(), name="certificate-claim"),
    path("feedback/<int:course_id>/", SubmitCertificateFeedbackAPIView.as_view(), name="certificate-feedback"),
    path("my-certificates/", CertificateListAPIView.as_view(), name="certificate-list"),
    path("<int:certificate_id>/", CertificateDetailAPIView.as_view(), name="certificate-detail"),
    path("<int:certificate_id>/download/", DownloadCertificateAPIView.as_view(), name="certificate-download"),
    path("<int:certificate_id>/share/", ShareCertificateAPIView.as_view(), name="certificate-share"),
]
