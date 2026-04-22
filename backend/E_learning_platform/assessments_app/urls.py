from django.urls import path
from .views import *

urlpatterns = [
    path('<int:assessment_id>/questions/', GetAssessmentQuestionsAPIView.as_view()),
    path('create/', CreateAssessmentAPIView.as_view()),
    path('questions/create/', CreateQuestionAPIView.as_view()),
    path('<int:assessment_id>/start/', StartAssessmentAPIView.as_view()),
]