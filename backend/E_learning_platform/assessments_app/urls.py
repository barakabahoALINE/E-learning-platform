from django.urls import path
from .views import *

urlpatterns = [
    path('list/', ListAssessmentsAPIView.as_view(), name="list-assessments"),
    path('create/', CreateAssessmentAPIView.as_view(), name="create-assessment"),
    path('<int:assessment_id>/update/', UpdateAssessmentAPIView.as_view(), name="update-assessment"),
    path('<int:assessment_id>/delete/', DeleteAssessmentAPIView.as_view(), name="delete-assessment"),
    path('<int:assessment_id>/attach/', AttachAssessmentAPIView.as_view(), name="attach-assessment"),
    path('<int:assessment_id>/detach/', DetachAssessmentAPIView.as_view(), name="detach-assessment"),
    path('<int:assessment_id>/', RetrieveAssessmentAPIView.as_view(), name="retrieve-assessment"),
    path('<int:assessment_id>/questions/', GetAssessmentQuestionsAPIView.as_view(), name="assessment-questions"),
    path('questions/create/', CreateQuestionAPIView.as_view(), name="create-question"),
    path('questions/<int:question_id>/update/', UpdateQuestionAPIView.as_view(), name="update-question"),
    path('questions/<int:question_id>/delete/', DeleteQuestionAPIView.as_view(), name="delete-question"),
    path('<int:assessment_id>/start/', StartAssessmentAPIView.as_view(), name="start-assessment"),
    path("<int:assessment_id>/start-attempt/",StartAttemptAPIView.as_view(), name="start-attempt"),
    path("lock-attempt/<int:attempt_id>/", LockAttemptAPIView.as_view()),
    path("attempt-details/<int:attempt_id>/",AttemptDetailAPIView.as_view(), name="attempt-details"),
    path("admin/unlock-attempt/<int:attempt_id>/",AdminUnlockAttemptAPIView.as_view()),
    path('attempts/save-answer/',SaveAnswerAPIView.as_view(),name="save-answer"),  
    path('attempts/<int:attempt_id>/submit/',SubmitAttemptAPIView.as_view(),name="submit-attempt"),  
    path('attempts/tab-switch/', TabSwitchEventAPIView.as_view(), name="tab-switch-event"),
    path('attempts/<int:attempt_id>/result/',ResultAPIView.as_view(),name="result"),  
    path('attempts/<int:attempt_id>/answers-review/',AttemptAnswersReviewAPIView.as_view(), name="answers-review"),
]