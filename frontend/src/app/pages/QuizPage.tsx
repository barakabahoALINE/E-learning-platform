import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CheckSquare, ClipboardCheck, Loader2, ShieldCheck, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCourseDetails } from '../../features/courses/courseSlice';
import { fetchCourseModulesProgress, fetchCourseProgress } from '../../features/progress/progressSlice';
import assessmentAPI from '../../features/assessments/assessmentAPI';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';

type AnswerMap = Record<number, Array<number | string>>;

const getQuestionText = (question: any) => question?.question_text || question?.question || '';

const getQuizTitle = (moduleIndex: number, moduleTitle: string, quizTitle?: string) => {
  const suffix = quizTitle && !/quiz/i.test(quizTitle) ? `${quizTitle} Quiz` : quizTitle || 'Quiz';
  return `Module ${moduleIndex + 1}: ${moduleTitle} Quiz`.replace(/\s+/g, ' ').trim();
};

export const QuizPage: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const numericCourseId = Number(courseId);
  const numericModuleId = Number(moduleId);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<AnswerMap>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [acceptedInstructions, setAcceptedInstructions] = useState(false);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [isAttemptLoading, setIsAttemptLoading] = useState(false);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (numericCourseId && (!course || Number(course.id) !== numericCourseId)) {
      dispatch(fetchCourseDetails(numericCourseId));
    }
    if (numericCourseId) dispatch(fetchCourseProgress(numericCourseId));
  }, [numericCourseId, course?.id, dispatch]);

  const currentModule = useMemo(() => {
    return course?.modules?.find(m => Number(m.id) === numericModuleId);
  }, [course, numericModuleId]);

  const moduleIndex = useMemo(() => {
    return course?.modules?.findIndex(m => Number(m.id) === numericModuleId) ?? 0;
  }, [course, numericModuleId]);

  const quizData = currentModule?.quiz || null;
  const questions = quizData?.questions || [];
  const question = questions[currentQuestion];
  const passMark = Number(quizData?.pass_mark ?? 70);
  const progressValue = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0;
  const quizTitle = currentModule ? getQuizTitle(moduleIndex, currentModule.title, quizData?.title) : 'Module Quiz';

  const normalizeChoices = (item: any) => item?.choices?.length
    ? item.choices.map((choice: any, index: number) => ({
      id: Number(choice.id ?? index),
      text: choice.text ?? choice.option_text ?? choice.label ?? String(choice),
    }))
    : (item?.options || []).map((option: string, index: number) => ({ id: index, text: option }));

  const saveCurrentAnswer = async () => {
    if (!attemptId || !question) return;
    const selected = selectedAnswers[currentQuestion] || [];
    if (selected.length === 0) return;

    await assessmentAPI.saveAnswer({
      attempt_id: attemptId,
      question_id: question.id,
      selected_choices: selected,
    });
  };

  const startQuiz = async () => {
    if (!quizData?.id) return;

    setIsAttemptLoading(true);
    setLockedMessage(null);
    try {
      await assessmentAPI.startAssessment(quizData.id);
      const attemptResponse = await assessmentAPI.startAttempt(quizData.id);
      const attempt = attemptResponse.data;
      setAttemptId(Number(attempt.id));
      setHasStarted(true);
      toast.success(attemptResponse.message || 'Quiz attempt started.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Unable to start quiz.';
      setLockedMessage(message);
      toast.error(message);
    } finally {
      setIsAttemptLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!attemptId) return;

    setIsAttemptLoading(true);
    try {
      await saveCurrentAnswer();
      const submitResponse = await assessmentAPI.submitAttempt(attemptId);
      const resultData = submitResponse.data;
      setResult({
        ...resultData,
        pass_mark: resultData.pass_mark ?? passMark,
      });
      dispatch(fetchCourseProgress(numericCourseId));
      dispatch(fetchCourseModulesProgress(numericCourseId));
      dispatch(fetchCourseDetails(numericCourseId));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit quiz.';
      setLockedMessage(message);
      toast.error(message);
    } finally {
      setIsAttemptLoading(false);
    }
  };

  const goNext = async () => {
    try {
      await saveCurrentAnswer();
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        await submitQuiz();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save answer.');
    }
  };

  const handleSingleSelect = (choiceId: number) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: [choiceId] }));
  };

  const handleMultipleSelect = (choiceId: number, checked: boolean) => {
    setSelectedAnswers(prev => {
      const existing = prev[currentQuestion] || [];
      return {
        ...prev,
        [currentQuestion]: checked
          ? [...existing, choiceId]
          : existing.filter(id => Number(id) !== Number(choiceId)),
      };
    });
  };

  if (isLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground dark:text-gray-400 font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quizData || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background dark:bg-gray-950 text-foreground dark:text-white p-6">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-6" />
        <h2 className="text-3xl font-bold mb-3">Quiz Not Found</h2>
        <p className="text-muted-foreground dark:text-gray-400 mb-8 text-center max-w-md">
          This module does not have a published quiz yet.
        </p>
        <Button size="lg" onClick={() => navigate(`/course/${courseId}`)}>Back to Course Overview</Button>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-5xl mx-auto py-8">
          <div className="mb-6">
            <Link to={`/learning/${courseId}/${numericModuleId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to module
              </Button>
            </Link>
          </div>
          <Card className="w-full max-w-4xl bg-card border-border rounded-2xl overflow-hidden shadow-xl">
            <CardContent className="p-8 md:p-10 space-y-8">
              <div className="flex items-start gap-5">
                <div className="rounded-lg bg-primary/10 p-3">
                  <ClipboardCheck className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl">{quizTitle}</h1>
                  <p className="text-muted-foreground leading-relaxed max-w-2xl">
                    Review the instructions before you begin. Answers are saved to your active backend attempt.
                  </p>
                </div>
              </div>

              {lockedMessage && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {lockedMessage}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Questions</p>
                  <p className="mt-1 text-xl font-semibold">{questions.length}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Passing Score</p>
                  <p className="mt-1 text-xl font-semibold">{passMark}%</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Estimated Time</p>
                  <p className="mt-1 text-xl font-semibold">{Math.max(5, questions.length * 2)} min</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/60 p-4">
                  <p className="text-xs uppercase text-muted-foreground">Attempts</p>
                  <p className="mt-1 text-xl font-semibold">Retake allowed</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="flex items-center font-medium">
                    <BookOpen className="mr-2 h-5 w-5 text-primary" />
                    Navigation instructions
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>Answer each question before moving forward.</li>
                    <li>You may move backward and update answers before submission.</li>
                    <li>Your result is calculated by the backend attempt service.</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="flex items-center font-medium">
                    <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
                    Attempt state
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    If an attempt is locked or the module is not complete, the backend will block the attempt and show the reason here.
                  </p>
                </div>
              </div>

              <label className="mt-8 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4 text-sm text-foreground">
                <Checkbox checked={acceptedInstructions} onCheckedChange={(checked) => setAcceptedInstructions(Boolean(checked))} className="mt-1" />
                <span>I understand the instructions and I am ready to begin.</span>
              </label>

              <div className="mt-6 flex justify-end">
                <Button disabled={!acceptedInstructions || isAttemptLoading} onClick={startQuiz} className="bg-primary hover:bg-primary/90">
                  {isAttemptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start Quiz
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (result) {
    const passed = Boolean(result.is_passed);
    const percentage = Math.round(Number(result.percentage || 0));

    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl bg-card border-border text-foreground rounded-[2rem] overflow-hidden">
          <CardContent className="p-10 text-center space-y-8">
            <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center ${passed ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
              {passed ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tight">{passed ? 'Quiz Passed' : 'Keep Learning'}</h2>
              <p className="text-muted-foreground mt-2">{passed ? "Great work. Your module progress was synced." : "Review the module and try again."}</p>
            </div>
            <div className="text-7xl font-black text-primary">{percentage}%</div>
            <p className="text-sm text-muted-foreground">Passing score: {result.pass_mark ?? passMark}%</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!passed && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAttemptId(null);
                    setResult(null);
                    setSelectedAnswers({});
                    setCurrentQuestion(0);
                    setHasStarted(false);
                  }}
                >
                  Retake Quiz
                </Button>
              )}
              <Button onClick={() => {
                const currentIndex = course.modules.findIndex(m => Number(m.id) === numericModuleId);
                const next = course.modules[currentIndex + 1];
                if (next) navigate(`/learning/${courseId}/${next.id}`);
                else if (course.final_assessment && passed) navigate(`/learning/${courseId}/final-assessment`);
                else navigate(`/course/${courseId}`);
              }} disabled={!passed}>
                Continue Learning
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const choices = normalizeChoices(question);
  const selected = selectedAnswers[currentQuestion] || [];
  const isMultiple = question?.question_type === 'multiple';

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950 flex flex-col font-sans">
      <div className="min-h-screen bg-background text-foreground p-4 transition-colors">
        <div className="max-w-5xl mx-auto py-8">
          <div className="mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to module
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <CardTitle>{quizTitle}</CardTitle>
                </div>
                <Badge variant="secondary">Question {currentQuestion + 1} of {questions.length}</Badge>
              </div>
              <Progress value={progressValue} className="h-2" />
            </CardHeader>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h3 className="text-xl mb-6">{getQuestionText(question)}</h3>

              {isMultiple ? (
                <div className="space-y-3">
                  {choices.map((choice: any) => {
                    const checked = selected.some(id => Number(id) === Number(choice.id));
                    return (
                      <label key={choice.id} className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${checked ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card hover:border-primary/40 hover:bg-accent/60'}`}>
                        <Checkbox checked={checked} onCheckedChange={(value) => handleMultipleSelect(choice.id, Boolean(value))} />
                        <span className="flex-1">{choice.text}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup value={selected[0]?.toString()} onValueChange={value => handleSingleSelect(Number(value))} className="space-y-3">
                  {choices.map((choice: any) => {
                    const isSelected = Number(selected[0]) === Number(choice.id);
                    return (
                      <div key={choice.id} onClick={() => handleSingleSelect(choice.id)} className={`flex items-center justify-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card hover:border-primary/40 hover:bg-accent/60'}`}>
                        <RadioGroupItem value={choice.id.toString()} id={`option-${choice.id}`} className="mt-1" />
                        <Label htmlFor={`option-${choice.id}`} className="flex-1 cursor-pointer">{choice.text}</Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}

              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button variant="outline" onClick={() => setCurrentQuestion(currentQuestion - 1)} disabled={currentQuestion === 0 || isAttemptLoading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <Button onClick={goNext} disabled={selected.length === 0 || isAttemptLoading}>
                  {isAttemptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentQuestion < questions.length - 1 ? 'Save and Next' : 'Submit Quiz'}
                  {currentQuestion < questions.length - 1 ? <ArrowRight className="ml-2 h-4 w-4" /> : <CheckSquare className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
