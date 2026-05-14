from django.urls import path
from .views import *

urlpatterns = [
    path('<int:assessment_id>/questions/', GetAssessmentQuestionsAPIView.as_view(), name="assessment-questions"),
    path('create/', CreateAssessmentAPIView.as_view(), name="create-assessment"),
    path('questions/create/', CreateQuestionAPIView.as_view(), name="create-question"),
    path('<int:assessment_id>/start/', StartAssessmentAPIView.as_view(), name="start-assessment"),
    path("<int:assessment_id>/start-attempt/",StartAttemptAPIView.as_view(), name="start-attempt"),
    path("lock-attempt/<int:attempt_id>/", LockAttemptAPIView.as_view()),
    path("attempt-details/<int:attempt_id>/",AttemptDetailAPIView.as_view(), name="attempt-details"),
    path("admin/unlock-attempt/<int:attempt_id>/",AdminUnlockAttemptAPIView.as_view()),
    path('attempts/save-answer/',SaveAnswerAPIView.as_view(),name="save-answer"),  
    path('attempts/<int:attempt_id>/submit/',SubmitAttemptAPIView.as_view(),name="submit-attempt"),
    path('attempts/<int:attempt_id>/calculate/',CalculateResultAPIView.as_view(),name="calculate-score"),  
    path('attempts/<int:attempt_id>/result/',ResultAPIView.as_view(),name="result"),  
    path('attempts/<int:attempt_id>/answers-review/',AttemptAnswersReviewAPIView.as_view(), name="answers-review"),
]