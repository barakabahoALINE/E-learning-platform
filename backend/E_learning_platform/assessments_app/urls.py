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
    # =====================
    # 1. SAVE ANSWER
    # =====================
    path('attempts/save-answer/', SaveAnswerAPIView.as_view(), name="save-answer"),

    # =====================
    # 2. SUBMIT ATTEMPT
    # =====================
    path('attempts/<int:attempt_id>/submit/', SubmitAttemptAPIView.as_view(), name="submit-attempt"),
  # =====================
    # 3. CALCULATE SCORE (optional)
    # =====================
    path('attempts/<int:attempt_id>/calculate/', CalculateResultAPIView.as_view(), name="calculate-score"),

    # =====================
    # 4. RESULT (SUMMARY SCORE)
    # =====================
    path('attempts/<int:attempt_id>/result/', ResultAPIView.as_view(), name="result"),
    # =====================
    # 5. ANSWERS REVIEW (DETAILED)
    # =====================
    path('attempts/<int:attempt_id>/answers-review/', AttemptAnswersReviewAPIView.as_view(), name="answers-review"),

]