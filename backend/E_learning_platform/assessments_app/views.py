from django.shortcuts import render
# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.timezone import now
from rest_framework import status
from .models import Attempt, StudentAnswer, Question
from .models import *
from .serializers import *
from datetime import timedelta

 ### START ATTEMPT
### 1.POST /api/attempts/start/
###=============================

class StartAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        assessment_id = request.data.get("assessment_id")

        try:
            assessment = Assessment.objects.get(id=assessment_id)
        except Assessment.DoesNotExist:
            return Response({
                "success": False,
                "message": "Assessment not found"
            }, status=404)

        # BARA attempts zakoze
        attempt_count = Attempt.objects.filter(
            student=request.user,
            assessment=assessment
        ).count()

        # REMA attempt nshya
        attempt = Attempt.objects.create(
            student=request.user,
            assessment=assessment,
            attempt_number=attempt_count + 1
        )

        return Response({
            "success": True,
            "data": {
                "attempt_id": attempt.id,
                "attempt_number": attempt.attempt_number,
                "assessment_id": assessment.id,
                "assessment_title": assessment.title,
            }
        }, status=201)
        
###2.http://127.0.0.1:8000/api/attempts/save-answer/
###========================

class SaveAnswerAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        attempt_id = request.data.get("attempt_id")
        question_id = request.data.get("question_id")
        selected_choices = request.data.get("selected_choices", [])
        text_answer = request.data.get("text_answer")

        # ----------------------------
        # 1. VALIDATE ATTEMPT & QUESTION
        # ----------------------------
        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)

        try:
            question = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({
                "success": False,
                "message": "Question not found"
            }, status=404)

        # ----------------------------
        # 2. DELETE OLD ANSWERS
        # ----------------------------
        StudentAnswer.objects.filter(
            attempt=attempt,
            question=question
        ).delete()

        # ----------------------------
        # 3. HANDLE MCQ / MULTI
        # ----------------------------
        if selected_choices:

           valid_choices = question.choices.filter(id__in=selected_choices)

            # 🔥 validation (important)
           if valid_choices.count() != len(selected_choices):
             return Response({
               "success": False,
               "message": "Invalid choice selected"
            }, status=400)


           for choice in valid_choices:
             StudentAnswer.objects.create(
             attempt=attempt,
             question=question,
             selected_choice=choice
           )
        # ----------------------------
        # 4. HANDLE OPEN QUESTION
        # ----------------------------
        elif text_answer:
            StudentAnswer.objects.create(
                attempt=attempt,
                question=question,
                text_answer=text_answer
            )

        else:
            return Response({
                "success": False,
                "message": "No answer provided"
            }, status=400)

        # ----------------------------
        # 5. SUCCESS RESPONSE
        # ----------------------------
        return Response({
            "success": True,
            "message": "Answer saved successfully"
        }, status=200)

### =========================
###3. EVALUATE ATTEMPT (OPTIONAL CHECK)
### POST /api/attempts/<attempt_id>/evaluate/
### =========================

class EvaluateAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)

        answers = StudentAnswer.objects.filter(attempt=attempt)

        correct = 0
        total = attempt.assessment.questions.count()

        for ans in answers:
            q = ans.question
            is_correct = False

            # MCQ
            if q.question_type == "MCQ":
                if ans.selected_choice and ans.selected_choice.is_correct:
                    is_correct = True

            # MCQ MULTI
            elif q.question_type == "MCQ_MULTI":
                correct_ids = set(q.choice_set.filter(is_correct=True).values_list("id", flat=True))
                selected_ids = set(
                    StudentAnswer.objects.filter(attempt=attempt, question=q)
                    .values_list("selected_choice_id", flat=True)
                )
                if correct_ids == selected_ids:
                    is_correct = True

            # OPEN
            elif q.question_type == "OPEN":
                if ans.text_answer and q.correct_text_answer:
                    if ans.text_answer.strip().lower() == q.correct_text_answer.strip().lower():
                        is_correct = True

            ans.is_correct = is_correct
            ans.save()

            if is_correct:
                correct += 1

        percentage = (correct / total) * 100 if total > 0 else 0

        return Response({
            "success": True,
            "data": {
                "correct": correct,
                "total": total,
                "percentage": round(percentage, 2)
            }
        })
    

### 4..http://127.0.0.1:8000/api/assessments/submit/
####=========================

class SubmitAttemptAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):

        try:
            attempt = Attempt.objects.get(id=attempt_id, student=request.user)
        except Attempt.DoesNotExist:
            return Response({"success": False, "message": "Not found"}, status=404)

        if attempt.percentage:
            return Response({"success": False, "message": "Already submitted"}, status=400)

        answers = StudentAnswer.objects.filter(attempt=attempt)

        correct = 0
        total = attempt.assessment.questions.count()

        for ans in answers:
            q = ans.question
            is_correct = False

            if q.question_type == "MCQ":
                if ans.selected_choice and ans.selected_choice.is_correct:
                    is_correct = True

            elif q.question_type == "MCQ_MULTI":
                correct_ids = set(
                    q.choice_set.filter(is_correct=True)
                    .values_list("id", flat=True)
                )
                selected_ids = set(
                    StudentAnswer.objects.filter(attempt=attempt, question=q)
                    .values_list("selected_choice_id", flat=True)
                )
                if correct_ids == selected_ids:
                    is_correct = True

            elif q.question_type == "OPEN":
                if ans.text_answer and q.correct_text_answer:
                    if ans.text_answer.strip().lower() == q.correct_text_answer.strip().lower():
                        is_correct = True

            ans.is_correct = is_correct
            ans.save()

            if is_correct:
                correct += 1

        percentage = (correct / total) * 100 if total > 0 else 0
        passed = percentage >= attempt.assessment.pass_mark

        attempt.score = correct
        attempt.percentage = percentage
        attempt.passed = passed
        attempt.save()

        return Response({
            "success": True,
            "message": "Submitted successfully",
            "data": {
                "score": correct,
                "percentage": round(percentage, 2),
                "passed": passed
            }
        })
        
### 5./api/attempts/<attempt_id>/calculate/
###==========================

class CalculateResultAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, attempt_id):

        attempt = Attempt.objects.get(id=attempt_id, student=request.user)

        answers = StudentAnswer.objects.filter(attempt=attempt)

        correct = answers.filter(is_correct=True).count()
        total = attempt.assessment.questions.count()

        percentage = (correct / total) * 100 if total > 0 else 0

        attempt.score = correct
        attempt.percentage = percentage
        attempt.passed = percentage >= attempt.assessment.pass_mark
        attempt.save()

        return Response({
            "success": True,
            "data": {
                "score": correct,
                "percentage": round(percentage, 2)
            }
        })

###6./api/attempts/<attempt_id>/result/
class ResultAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):

        attempt = Attempt.objects.get(id=attempt_id, student=request.user)

        return Response({
            "success": True,
            "data": {
                "score": attempt.score,
                "percentage": attempt.percentage,
                "passed": attempt.passed,
                "attempt_number": attempt.attempt_number
            }
        })
        

### 7.GET/api/attempts/<attempt_id>/answers_review/
###==========================

class AttemptAnswersReviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, attempt_id):

        # =========================
        # 1. GET ATTEMPT
        # =========================
        try:
            attempt = Attempt.objects.get(
                id=attempt_id,
                student=request.user
            )
        except Attempt.DoesNotExist:
            return Response({
                "success": False,
                "message": "Attempt not found"
            }, status=404)

        # =========================
        # 2. GET QUESTIONS
        # =========================
        questions = attempt.assessment.questions.all()

        response_data = []

        # =========================
        # 3. LOOP QUESTIONS
        # =========================
        for question in questions:

            answers = StudentAnswer.objects.filter(
                attempt=attempt,
                question=question
            )

            choices = []
            if question.question_type in ["MCQ", "MCQ_MULTI"]:
                choices = list(question.choices.values("id", "text"))

            selected_choice = None
            selected_choices = []
            text_answer = None
            is_correct = None

            # =========================
            # MCQ
            # =========================
            if question.question_type == "MCQ":
                ans = answers.first()

                if ans and ans.selected_choice:
                    selected_choice = ans.selected_choice.id

                    # correctness check
                    is_correct = ans.selected_choice.is_correct

            # =========================
            # MULTI MCQ
            # =========================
            elif question.question_type == "MCQ_MULTI":
                selected_choices = list(
                    answers.values_list("selected_choice_id", flat=True)
                )

                # optional: later you compute full correctness here

            # =========================
            # OPEN QUESTION
            # =========================
            elif question.question_type == "OPEN":
                ans = answers.first()
                if ans:
                    text_answer = ans.text_answer

            # =========================
            # RESPONSE BUILD
            # =========================
            response_data.append({
                "question_id": question.id,
                "question_text": question.text,
                "question_type": question.question_type,
                "choices": choices,
                "selected_choice": selected_choice,
                "selected_choices": selected_choices,
                "text_answer": text_answer,
                "is_correct": is_correct,
                "correct_answer": (
                  question.choices.filter(is_correct=True).first().id
                  if question.question_type == "MCQ"
                  else question.correct_text_answer
                ),
            })

        return Response({
            "success": True,
            "attempt_id": attempt.id,
            "data": response_data
        })