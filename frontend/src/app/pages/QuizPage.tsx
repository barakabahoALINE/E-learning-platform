import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCourseDetails } from '../../features/courses/courseSlice';
import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { cn } from '../components/ui/utils';
import { markContentComplete, completeFinalAssessment } from '../../features/progress/progressSlice';

export const QuizPage: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const isFinalAssessment = lessonId === 'final';
  const numericCourseId = Number(courseId);
  const numericLessonId = isFinalAssessment ? null : Number(lessonId);
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  React.useEffect(() => {
    if (numericCourseId && (!course || course.id !== numericCourseId)) {
      dispatch(fetchCourseDetails(numericCourseId));
    }
  }, [numericCourseId, course, dispatch]);

  const currentLesson = course?.lessons?.find(l => l.id === numericLessonId);
  const quizContent = currentLesson?.contents?.find(c => c.content_type === 'quiz');
  
  // Format the quiz data from the database JSON or final assessment
  const quizData = React.useMemo(() => {
    if (isFinalAssessment) {
      return course?.final_assessment || null;
    }
    
    if (!quizContent?.quiz) return null;
    try {
      return typeof quizContent.quiz === 'string' ? JSON.parse(quizContent.quiz) : quizContent.quiz;
    } catch (e) {
      console.error("Failed to parse quiz JSON", e);
      return null;
    }
  }, [isFinalAssessment, course, quizContent]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!course || (!isFinalAssessment && !currentLesson) || !quizData || !quizData.questions) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{isFinalAssessment ? 'Final Assessment Not Found' : 'Quiz Not Found'}</h2>
        <p className="text-gray-400 mb-6">
          {isFinalAssessment 
            ? "We couldn't find the final assessment for this course." 
            : "We couldn't find the quiz for this lesson."}
        </p>
        <Button onClick={() => navigate(isFinalAssessment ? `/course/${courseId}` : `/lesson/${courseId}/${lessonId}`)}>
          {isFinalAssessment ? 'Back to Course' : 'Back to Lesson'}
        </Button>
      </div>
    );
  }

  const questions = quizData.questions;
  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  // Find all lessons in flat array for navigation
  const allLessons = course.lessons || [];
  const currentLessonIndex = allLessons.findIndex(l => l.id === numericLessonId);

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answerIndex });
    setShowExplanation(false);
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
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
    questions.forEach((q: any, index: number) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  const isAnswerCorrect = () => {
    return selectedAnswers[currentQuestion] === question.correctAnswer;
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score.percentage >= 80;

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl bg-gray-800 border-gray-700 text-white">
          <CardContent className="p-8 lg:p-12 text-center">
            <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              passed ? 'bg-green-500/20' : 'bg-orange-500/20'
            }`}>
              {passed ? (
                <Trophy className="w-10 h-10 text-green-500" />
              ) : (
                <AlertCircle className="w-10 h-10 text-orange-500" />
              )}
            </div>

            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              {passed ? 'Congratulations! 🎉' : 'Keep Practicing! 💪'}
            </h2>

            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">{score.percentage}%</div>
              <p className="text-gray-500 font-bold">
                You got {score.correct} out of {score.total} questions correct
              </p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6 mb-8">
              <h3 className="font-medium mb-3 text-gray-200">Your Results</h3>
              <div className="space-y-3">
                {questions.map((q: any, index: number) => {
                  const isCorrect = selectedAnswers[index] === q.correctAnswer;
                  return (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">Question {index + 1}</span>
                      {isCorrect ? (
                        <Badge className="bg-green-600 border-none">Correct</Badge>
                      ) : (
                        <Badge variant="destructive" className="border-none">Incorrect</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
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
                <Button onClick={async () => {
                  try {
                    // Mark lesson quiz as complete if it's not the final assessment
                    if (!isFinalAssessment && quizContent?.id) {
                      const completedKey = `completed_contents_${numericCourseId}`;
                      const saved = localStorage.getItem(completedKey);
                      let completedIds: number[] = [];
                      try {
                        completedIds = saved ? JSON.parse(saved) : [];
                      } catch (e) {}
                      
                      if (!completedIds.includes(quizContent.id)) {
                        const newState = [...completedIds, quizContent.id];
                        localStorage.setItem(completedKey, JSON.stringify(newState));
                      }
                      
                      await dispatch(markContentComplete({
                        courseId: numericCourseId,
                        lessonId: numericLessonId!,
                        contentId: quizContent.id
                      })).unwrap();
                    }
                    
                    toast.success(isFinalAssessment ? 'Congratulations on completing the course! 🎉' : 'Lesson quiz passed! Course content updated.');
                    
                    if (isFinalAssessment) {
                      await dispatch(completeFinalAssessment(numericCourseId)).unwrap();
                      navigate(`/certificate/${courseId}`);
                    } else if (quizContent?.id && currentLessonIndex < allLessons.length - 1) {
                      const nextLesson = allLessons[currentLessonIndex + 1];
                      navigate(`/lesson/${courseId}/${nextLesson.id}`);
                    } else if (course?.final_assessment?.questions?.length > 0) {
                      navigate(`/quiz/${courseId}/final`);
                    } else {
                      // No more content and no final assessment - back to course
                      navigate(`/course/${courseId}`);
                    }
                  } catch (error: any) {
                    console.error("Failed to update progress", error);
                    toast.error(error?.message || "Successfully passed, but failed to sync progress.");
                    if (isFinalAssessment) navigate(`/certificate/${courseId}`);
                    else navigate(`/course/${courseId}`);
                  }
                }} className="h-11 px-8">
                  {isFinalAssessment ? 'Claim Your Certificate' : 'Continue Learning'}
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
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Link to={`/lesson/${courseId}/${lessonId}`}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text- hover:bg-gray-700">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to course 
            </Button>
          </Link>
        </div>

        <Card className="mb-6 bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-between mb-">
              <CardTitle className="text-xl">
                {isFinalAssessment ? `Final Exam: ${course.title}` : `Quiz: ${currentLesson?.title || 'Lesson Quiz'}`}
              </CardTitle>
              <Badge variant="secondary" className="bg-gray-700 text-gray-200 border-none pb-1">
                Question {currentQuestion + 1} of {questions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-2 bg-gray-700 mb-2" />
          </CardHeader>
        </Card>

        <Card className="shadow-xl bg-gray-800 border-gray-700 text-white">
          <CardContent className="p-6 lg:p-8">
            <h3 className="text-xl font-medium mb-8">{question.question}</h3>

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
                    className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      showCorrectAnswer
                        ? 'border-green-500 bg-green-500/10'
                        : showIncorrectAnswer
                        ? 'border-red-500 bg-red-500/10'
                        : isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-700/30 hover:border-gray-600'
                    }`}
                    onClick={() => !showExplanation && handleSelectAnswer(index)}
                  >
                    <RadioGroupItem
                      value={index.toString()}
                      id={`option-${index}`}
                      disabled={showExplanation}
                      className={cn(
                        "h-4 w-4 border- transition-all duration-200 mt-0.5",
                        isSelected && !showExplanation ? "border-blue-500 text-blue-500" : "border-gray-400 text-gray-400",
                        showCorrectAnswer ? "border-green-500 text-green-500" : "",
                        showIncorrectAnswer ? "border-red-500 text-red-500" : ""
                      )}
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
                className={`mt-8 p-5 rounded-xl ${
                  isAnswerCorrect() ? 'bg-green-500/10 border border-green-500/20' : 'bg-orange-500/10 border border-orange-500/20'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {isAnswerCorrect() ? (
                    <CheckCircle className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-orange-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-bold text-md mb-1 ${isAnswerCorrect() ? 'text-green-500' : 'text-orange-500'}`}>
                      {isAnswerCorrect() ? 'Correct!' : 'Not quite right'}
                    </p>
                    <p className="text-gray-300 leading-relaxed">{question.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-700">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-3">
                {!showExplanation ? (
                  <Button
                    onClick={handleCheckAnswer}
                    disabled={selectedAnswers[currentQuestion] === undefined}
                    className="h-11 px-8"
                  >
                    Check Answer
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="h-11 px-8">
                    {currentQuestion < questions.length - 1 ? (
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