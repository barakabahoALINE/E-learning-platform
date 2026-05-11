import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2, Trophy, XCircle, Award, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCourseDetails } from '../../features/courses/courseSlice';
import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { cn } from '../components/ui/utils';
import { markContentComplete, completeFinalAssessment, fetchCourseProgress } from '../../features/progress/progressSlice';

export const QuizPage: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const isFinalAssessment = moduleId === 'final';
  const numericCourseId = Number(courseId);
  const numericModuleId = isFinalAssessment ? null : Number(moduleId);
  
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
    dispatch(fetchCourseProgress(numericCourseId));
  }, [numericCourseId, course, dispatch]);

  const currentModule = useMemo(() => {
    return course?.modules?.find(m => m.id === numericModuleId);
  }, [course, numericModuleId]);

  const quizData = useMemo(() => {
    if (isFinalAssessment) return course?.final_assessment || null;
    return currentModule?.quiz || null;
  }, [isFinalAssessment, course, currentModule]);

  if (isLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 text-amber-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold mb-3">{isFinalAssessment ? 'Assessment Not Found' : 'Quiz Not Found'}</h2>
        <p className="text-gray-400 mb-8 text-center max-w-md">
          {isFinalAssessment 
            ? "The final assessment for this course hasn't been published yet." 
            : "This module doesn't have a quiz or it's currently unavailable."}
        </p>
        <Button size="lg" className="px-8 rounded-xl h-12" onClick={() => navigate(`/course/${courseId}`)}>
          Back to Course Overview
        </Button>
      </div>
    );
  }

  const questions = quizData.questions;
  const question = questions[currentQuestion];
  const progressValue = ((currentQuestion + 1) / questions.length) * 100;

  const handleSelectAnswer = (choiceId: number) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: choiceId });
    setShowExplanation(false);
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
      const selectedChoiceId = selectedAnswers[index];
      const correctChoice = q.choices?.find((c: any) => c.is_correct);
      if (selectedChoiceId === correctChoice?.id) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score.percentage >= 80;

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-3xl bg-gray-900 border-white/5 text-white rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-10 lg:p-16 text-center space-y-8">
            <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center transition-all duration-700 animate-in zoom-in ${
              passed ? 'bg-green-500/20 text-green-500 shadow-2xl shadow-green-500/20' : 'bg-orange-500/20 text-orange-500 shadow-2xl shadow-orange-500/20'
            }`}>
              {passed ? (
                <Trophy className="w-12 h-12" />
              ) : (
                <AlertCircle className="w-12 h-12" />
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">
                {passed ? 'You Passed! 🎉' : 'Keep Learning! 💪'}
              </h2>
              <p className="text-gray-400 font-medium">
                {passed ? "Excellent work! You've mastered this module." : "Don't give up! Review the material and try again."}
              </p>
            </div>

            <div className="relative inline-block">
              <div className="text-7xl font-black text-primary mb-2 tracking-tighter">{score.percentage}%</div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${passed ? 'bg-green-500' : 'bg-orange-500'}`} 
                  style={{ width: `${score.percentage}%` }}
                />
              </div>
              <p className="text-gray-500 font-bold mt-4 tracking-widest uppercase text-xs">
                {score.correct} / {score.total} Correct Answers
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-14 px-8 rounded-2xl border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => {
                  setCurrentQuestion(0);
                  setSelectedAnswers({});
                  setShowResults(false);
                }}
              >
                Retake Quiz
              </Button>
              {passed && (
                <Button onClick={async () => {
                  try {
                    if (isFinalAssessment) {
                      await dispatch(completeFinalAssessment(numericCourseId)).unwrap();
                      navigate(`/certificate/${courseId}`);
                    } else {
                      // Navigate to next module or overview
                      const currentIndex = course.modules.findIndex(m => m.id === numericModuleId);
                      const next = course.modules[currentIndex + 1];
                      if (next) {
                        navigate(`/learning/${courseId}/${next.id}`);
                      } else if (course.final_assessment) {
                        navigate(`/learning/${courseId}/quiz/final`);
                      } else {
                        navigate(`/course/${courseId}`);
                      }
                    }
                    toast.success("Progress updated!");
                  } catch (error: any) {
                    toast.error("Failed to sync progress, but you passed!");
                    navigate(`/course/${courseId}`);
                  }
                }} className="w-full sm:w-auto h-14 px-10 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 group">
                  {isFinalAssessment ? 'Claim Certificate' : 'Continue Learning'}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSelectedChoice = selectedAnswers[currentQuestion];
  const choices = question.choices || [];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link to={`/learning/${courseId}/${numericModuleId || 'final'}`}>
              <Button variant="ghost" size="icon" className="rounded-xl text-gray-400 hover:text-white hover:bg-white/5">
                <XCircle className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">
                {isFinalAssessment ? 'Final Assessment' : 'Module Quiz'}
              </h1>
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                {course.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Badge className="bg-primary/10 text-primary border-primary/20 font-black px-3 py-1">
               Q{currentQuestion + 1} / {questions.length}
             </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500">
              <span>Overall Completion</span>
              <span className="text-primary">{Math.round(progressValue)}%</span>
            </div>
            <Progress value={progressValue} className="h-1.5 bg-white/5" />
          </div>

          {/* Question Card */}
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4">
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                {question.question_text || question.question}
              </h3>
            </div>

            <RadioGroup
              value={currentSelectedChoice?.toString()}
              onValueChange={(val) => handleSelectAnswer(Number(val))}
              className="grid grid-cols-1 gap-4"
            >
              {choices.map((choice: any, index: number) => {
                const isSelected = currentSelectedChoice === choice.id;
                return (
                  <div
                    key={choice.id}
                    onClick={() => handleSelectAnswer(choice.id)}
                    className={`group relative flex items-center p-6 rounded-[1.5rem] border-2 transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' 
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-all duration-300 mr-4 ${
                      isSelected ? 'bg-primary text-white scale-110' : 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    
                    <span className={`flex-1 text-lg font-medium transition-colors duration-300 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {choice.text}
                    </span>

                    <RadioGroupItem
                      value={choice.id.toString()}
                      id={choice.id.toString()}
                      className="sr-only"
                    />
                    
                    {isSelected && (
                      <div className="absolute right-6 animate-in zoom-in duration-300">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-12 border-t border-white/5">
            <Button
              variant="ghost"
              size="lg"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="rounded-2xl h-14 px-8 text-gray-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="mr-2 h-5 w-5" />
              Previous
            </Button>

            <Button
              size="lg"
              onClick={handleNext}
              disabled={currentSelectedChoice === undefined}
              className="rounded-2xl h-14 px-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 group"
            >
              {currentQuestion < questions.length - 1 ? (
                <>
                  Next Question
                  <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Complete Quiz
                  <Trophy className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};