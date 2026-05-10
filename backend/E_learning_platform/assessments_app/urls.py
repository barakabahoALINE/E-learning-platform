from django.urls import path
from .views import *

urlpatterns = [
    path('<int:assessment_id>/questions/', GetAssessmentQuestionsAPIView.as_view(), name="assessment-questions"),
    path('create/', CreateAssessmentAPIView.as_view(), name="create-assessment"),
    path('questions/create/', CreateQuestionAPIView.as_view(), name="create-question"),
    path('<int:assessment_id>/start/', StartAssessmentAPIView.as_view(), name="start-assessment"),
]