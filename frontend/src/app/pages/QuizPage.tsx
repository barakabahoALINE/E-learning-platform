import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Trophy,
  AlertCircle,
} from 'lucide-react';
import { mockQuiz } from '../data/mock-data';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

export const QuizPage: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { courses, completeLesson } = useApp();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const quiz = mockQuiz;
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  // Find course and all lessons
  const course = courses.find(c => c.id === courseId);
  let allLessons: any[] = [];
  let currentLessonIndex = -1;
  
  if (course) {
    course.syllabus.forEach(section => {
      section.lessons.forEach(lesson => {
        allLessons.push(lesson);
        if (lesson.id === lessonId) {
          currentLessonIndex = allLessons.length - 1;
        }
      });
    });
  }

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answerIndex });
    setShowExplanation(false);
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowExplanation(false);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowExplanation(false);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: quiz.questions.length,
      percentage: Math.round((correct / quiz.questions.length) * 100),
    };
  };

  const isAnswerCorrect = () => {
    return selectedAnswers[currentQuestion] === question.correctAnswer;
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score.percentage >= 70;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-12 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {passed ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <AlertCircle className="w-10 h-10 text-orange-600" />
              )}
            </div>

            <h2 className="text-3xl mb-4">
              {passed ? 'Congratulations! 🎉' : 'Keep Practicing! 💪'}
            </h2>

            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">{score.percentage}%</div>
              <p className="text-gray-600">
                You got {score.correct} out of {score.total} questions correct
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-medium mb-3">Your Results</h3>
              <div className="space-y-2">
                {quiz.questions.map((q, index) => {
                  const isCorrect = selectedAnswers[index] === q.correctAnswer;
                  return (
                    <div key={q.id} className="flex items-center justify-between text-sm">
                      <span>Question {index + 1}</span>
                      {isCorrect ? (
                        <Badge className="bg-green-600">Correct</Badge>
                      ) : (
                        <Badge variant="destructive">Incorrect</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentQuestion(0);
                  setSelectedAnswers({});
                  setShowResults(false);
                  setShowExplanation(false);
                }}
              >
                Retake Quiz
              </Button>
              {passed && (
                <Button onClick={() => {
                  // Mark quiz lesson as complete
                  completeLesson(courseId!, lessonId!);
                  toast.success('Quiz completed!');
                  
                  // Navigate to next lesson or certificate
                  if (currentLessonIndex < allLessons.length - 1) {
                    const nextLesson = allLessons[currentLessonIndex + 1];
                    navigate(`/lesson/${courseId}/${nextLesson.id}`);
                  } else {
                    navigate(`/certificate/${courseId}`);
                  }
                }}>
                  Continue Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/lesson/${courseId}/${lessonId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to lesson
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>{quiz.title}</CardTitle>
              <Badge variant="secondary">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardHeader>
        </Card>

        <Card className="shadow-xl">
          <CardContent className="p-8">
            <h3 className="text-xl mb-6">{question.question}</h3>

            <RadioGroup
              value={selectedAnswers[currentQuestion]?.toString()}
              onValueChange={(value) => handleSelectAnswer(parseInt(value))}
              className="space-y-3"
            >
              {question.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestion] === index;
                const isCorrect = index === question.correctAnswer;
                const showCorrectAnswer = showExplanation && isCorrect;
                const showIncorrectAnswer = showExplanation && isSelected && !isCorrect;

                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all ${
                      showCorrectAnswer
                        ? 'border-green-600 bg-green-50'
                        : showIncorrectAnswer
                        ? 'border-red-600 bg-red-50'
                        : isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem
                      value={index.toString()}
                      id={`option-${index}`}
                      disabled={showExplanation}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <span>{option}</span>
                      {showCorrectAnswer && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {showIncorrectAnswer && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>

            {showExplanation && (
              <div
                className={`mt-6 p-4 rounded-lg ${
                  isAnswerCorrect() ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {isAnswerCorrect() ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium mb-1">
                      {isAnswerCorrect() ? 'Correct!' : 'Not quite right'}
                    </p>
                    <p className="text-sm text-gray-700">{question.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-3">
                {!showExplanation ? (
                  <Button
                    onClick={handleCheckAnswer}
                    disabled={selectedAnswers[currentQuestion] === undefined}
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    {currentQuestion < quiz.questions.length - 1 ? (
                      <>
                        Next Question
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        View Results
                        <Trophy className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};