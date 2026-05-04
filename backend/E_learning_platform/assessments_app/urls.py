from django.urls import path
from .views import *

urlpatterns = [
    path('<int:assessment_id>/questions/', GetAssessmentQuestionsAPIView.as_view()),
    path('create/', CreateAssessmentAPIView.as_view()),
    path('questions/create/', CreateQuestionAPIView.as_view()),
    path('<int:assessment_id>/start/', StartAssessmentAPIView.as_view()),
    path("<int:assessment_id>/start-attempt/", StartAttemptAPIView.as_view()),
    path("lock-attempt/<int:attempt_id>/", LockAttemptAPIView.as_view()),
    path("attempt-details/<int:attempt_id>/", AttemptDetailAPIView.as_view()),
    path("admin/unlock-attempt/<int:attempt_id>/", AdminUnlockAttemptAPIView.as_view()),

]