from django.urls import path
from .views import *

# in assessments_app/urls.py
from .views import EvaluateAttemptAPIView, SubmitAttemptAPIView
from django.http import JsonResponse
from .views import StartAttemptAPIView  # ongeraho mu imports

def test_api(request):
    return JsonResponse({"message": "API working"})

urlpatterns = [
    path('test/', test_api),
   
# =====================
    # 1. SAVE ANSWER
    # =====================
    path('attempts/save-answer/', SaveAnswerAPIView.as_view(), name="save-answer"),

    # =====================
    # 2. SUBMIT ATTEMPT
    # =====================
    path('attempts/<int:attempt_id>/submit/', SubmitAttemptAPIView.as_view(), name="submit-attempt"),
    path('attempts/<int:attempt_id>/evaluate/', EvaluateAttemptAPIView.as_view(), name="evaluate"),
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
    path('attempts/start/', StartAttemptAPIView.as_view(), name="start-attempt"),]