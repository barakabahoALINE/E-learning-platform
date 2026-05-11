import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle, Clock, Loader2, Save, ShieldAlert, Target, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { fetchCourseDetails } from '../../features/courses/courseSlice';
import { fetchCourseProgress } from '../../features/progress/progressSlice';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import assessmentAPI from '../../features/assessments/assessmentAPI';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';

type AssessmentChoice = {
    id: number;
    text: string;
    isCorrect: boolean;
};

const getQuestionText = (question: any) => question?.question_text || question?.question || '';

const getChoices = (question: any): AssessmentChoice[] => {
    if (question?.choices?.length) {
        return question.choices.map((choice: any, index: number) => ({
            id: Number(choice.id ?? index),
            text: choice.text ?? choice.option_text ?? choice.label ?? String(choice),
            isCorrect: Boolean(choice.is_correct),
        }));
    }

    return (question?.options || []).map((option: string, index: number) => ({
        id: index,
        text: option,
        isCorrect: index === question.correctAnswer,
    }));
};

export const FinalAssessmentPage: React.FC = () => {
    const { courseId } = useParams();
    const numericCourseId = Number(courseId);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
    const { courseProgress } = useAppSelector((state) => state.progress);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
    const [showInstructions, setShowInstructions] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [backendResult, setBackendResult] = useState<any | null>(null);
    const [isAttemptLoading, setIsAttemptLoading] = useState(false);
    const [lockedMessage, setLockedMessage] = useState<string | null>(null);

    const sessionKey = `final-assessment-session-${courseId}`;
    const progress = numericCourseId ? courseProgress[numericCourseId] : undefined;
    const assessment = course?.final_assessment;
    const questions = assessment?.questions || [];
    const question = questions[currentQuestion];
    const answeredCount = Object.keys(selectedAnswers).length;
    const examDurationMinutes = Number(assessment?.duration || 30);
    const passMark = Number(assessment?.pass_mark || 60);

    useEffect(() => {
        if (!numericCourseId) return;

        if (!course || Number(course.id) !== numericCourseId) {
            dispatch(fetchCourseDetails(numericCourseId));
        }
        dispatch(fetchCourseProgress(numericCourseId));
    }, [course?.id, dispatch, numericCourseId]);

    useEffect(() => {
        if (!assessment || !courseId || showInstructions) return;

        const storedSession = localStorage.getItem(sessionKey);
        if (storedSession) {
            try {
                const parsed = JSON.parse(storedSession);
                setStartTime(new Date(parsed.startTime));
                setEndTime(parsed.endTime ? new Date(parsed.endTime) : null);
                setCurrentQuestion(parsed.currentQuestion || 0);
                setSelectedAnswers(parsed.selectedAnswers || {});
                setTabSwitches(parsed.tabSwitches || 0);
                setLastSavedAt(new Date());
                toast.info('Assessment session restored.');
                return;
            } catch {
                localStorage.removeItem(sessionKey);
            }
        }

        const now = new Date();
        setStartTime(now);
        setEndTime(new Date(now.getTime() + examDurationMinutes * 60 * 1000));
    }, [assessment, courseId, sessionKey, showInstructions]);

    const calculateScore = () => {
        const correct = questions.filter((item: any, index: number) => {
            const correctChoice = getChoices(item).find((choice) => choice.isCorrect);
            return selectedAnswers[index] === correctChoice?.id;
        }).length;

        return {
            correct,
            total: questions.length,
            percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0,
        };
    };

    const submitAssessment = async () => {
        setShowResults(true);
        const score = calculateScore();

        if (!attemptId) return;

        setIsAttemptLoading(true);
        try {
            await saveAnswer(currentQuestion);
            const response = await assessmentAPI.submitAttempt(attemptId);
            setBackendResult({
                ...response.data,
                pass_mark: response.data?.pass_mark ?? passMark,
            });
            localStorage.removeItem(sessionKey);
            dispatch(fetchCourseProgress(numericCourseId));
            toast.success('Final assessment submitted.');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Final assessment submission failed.';
            setLockedMessage(message);
            toast.error(message);
        } finally {
            setIsAttemptLoading(false);
        }
    };

    useEffect(() => {
        if (!startTime || !endTime || showResults || showInstructions) return;

        localStorage.setItem(sessionKey, JSON.stringify({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            currentQuestion,
            selectedAnswers,
            tabSwitches,
        }));
        setLastSavedAt(new Date());
    }, [currentQuestion, endTime, selectedAnswers, sessionKey, showInstructions, showResults, startTime, tabSwitches]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!showResults && !showInstructions) {
                event.preventDefault();
                event.returnValue = 'Leaving may interrupt your assessment session.';
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden && !showResults && !showInstructions) {
                setTabSwitches((count) => count + 1);
                toast.warning('Tab switch detected. Repeated switches may be reviewed for assessment integrity.');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showInstructions, showResults]);

    const startAssessment = async () => {
        if (!assessment?.id) return;

        setIsAttemptLoading(true);
        setLockedMessage(null);
        try {
            const response = await assessmentAPI.startAttempt(assessment.id);
            setAttemptId(Number(response.data.id));
            setShowInstructions(false);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Unable to start final assessment.';
            setLockedMessage(message);
            toast.error(message);
        } finally {
            setIsAttemptLoading(false);
        }
    };

    const saveAnswer = async (questionIndex = currentQuestion) => {
        if (!attemptId) return;
        const targetQuestion = questions[questionIndex];
        const answer = selectedAnswers[questionIndex];
        if (!targetQuestion || answer === undefined) return;

        await assessmentAPI.saveAnswer({
            attempt_id: attemptId,
            question_id: targetQuestion.id,
            selected_choices: [answer],
        });
        setLastSavedAt(new Date());
    };

    if (isLoading || !course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950">
                <div className="text-center text-muted-foreground dark:text-gray-400">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    Loading final assessment...
                </div>
            </div>
        );
    }

    if (!assessment || questions.length === 0) {
        return (
            <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-6 text-foreground dark:text-white">
                <Card className="w-full max-w-2xl bg-card dark:bg-gray-900 border-border dark:border-white/5 rounded-[2rem]">
                    <CardContent className="p-10 text-center">
                        <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-5" />
                        <h2 className="text-2xl font-bold mb-3">Final Assessment not found</h2>
                        <p className="text-muted-foreground dark:text-gray-400 mb-8">The final assessment for this course has not been published yet.</p>
                        <Link to={`/course/${courseId}`}>
                            <Button>Back to course</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (showInstructions) {
        return (
            <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-6">
                <div className='max-w-5xl mx-auto py-8'>
                    <div className="mb-6">
                        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to course
                        </Button>
                    </div>
                    <Card className="w-full max-w-3xl bg-card dark:bg-gray-900 border-border dark:border-white/5 text-foreground dark:text-white rounded-[2rem] overflow-hidden shadow-3xl">
                        <CardContent className="p-8 md:p-12 space-y-8">
                            <div className="flex items-start gap-5">
                                <div className="w-12 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div className="space-y-2">
                                    {/* <p className="text-xs font-black uppercase tracking-widest text-primary">Final Assessment</p> */}
                                    <h1 className="text-xl font-black tracking-tight">{assessment.title || course.title}</h1>
                                    <p className="text-muted-foreground dark:text-gray-400 leading-relaxed">
                                        This is the final checkpoint for the course. Start when you are ready; the timer begins once you open the first question.
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                                <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-gray-500 font-bold">Questions</p>
                                    <p className="text-2xl font-black mt-1">{questions.length}</p>
                                </div>
                                <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-gray-500 font-bold">Duration</p>
                                    <p className="text-2xl font-black mt-1">{examDurationMinutes}m</p>
                                </div>
                                <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-gray-500 font-bold">Pass Mark</p>
                                    <p className="text-2xl font-black mt-1">{passMark}%</p>
                                </div>
                                <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-gray-500 font-bold">Course</p>
                                    <p className="text-2xl font-black mt-1">{Math.round(progress?.completion_percentage || 0)}%</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                                <div className="flex items-start gap-3">
                                    <BookOpenCheck className="h-5 w-5 text-amber-300 mt-0.5" />
                                    <p className='text-muted-foreground dark:text-gray-400 font-bold'>Leaving or repeatedly switching tabs may be recorded for review.</p>
                                </div>
                            </div>
                            {lockedMessage && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                                    {lockedMessage}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <Button
                                    size="lg"
                                    className="bg-primary hover:bg-primary/90"
                                    onClick={startAssessment}
                                    disabled={isAttemptLoading}
                                >
                                    {isAttemptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Start Final Assessment
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (showResults) {
        const score = backendResult
            ? {
                correct: backendResult.score,
                total: backendResult.total_marks || questions.length,
                percentage: Math.round(Number(backendResult.percentage || 0)),
            }
            : calculateScore();
        const passed = backendResult ? Boolean(backendResult.is_passed) : score.percentage >= passMark;

        return (
            <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-6">
                <Card className="w-full max-w-3xl bg-card dark:bg-gray-900 border-border dark:border-white/5 text-foreground dark:text-white rounded-[2rem] shadow-3xl">
                    <CardContent className="p-8 md:p-12 text-center space-y-8">
                        <div className={`w-24 h-24 rounded-3xl mx-auto flex items-center justify-center ${passed ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {passed ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                        </div>
                        <div>
                            <h2 className="text-4xl font-black tracking-tight">{passed ? 'Final Assessment Passed' : 'Assessment Review Required'}</h2>
                            <p className="text-muted-foreground dark:text-gray-400 mt-2">You answered {score.correct} out of {score.total} questions correctly.</p>
                        </div>
                        <div className="text-7xl font-black text-primary">{score.percentage}%</div>
                        <div className="grid gap-3 sm:grid-cols-3 text-left">
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                <p className="text-sm text-muted-foreground dark:text-gray-500">Integrity events</p>
                                <p className="text-xl font-semibold">{tabSwitches}</p>
                            </div>
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                <p className="text-sm text-muted-foreground dark:text-gray-500">Submission</p>
                                <p className="text-xl font-semibold">Manual</p>
                            </div>
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                <p className="text-sm text-muted-foreground dark:text-gray-500">Result</p>
                                <p className="text-xl font-semibold">{passed ? 'Pass' : 'Retake'}</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!passed && (
                                <Button
                                    variant="outline"
                                    className="h-12 rounded-xl border-border dark:border-white/10 text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-white/5"
                                    onClick={() => {
                                        localStorage.removeItem(sessionKey);
                                        setCurrentQuestion(0);
                                        setSelectedAnswers({});
                                        setShowResults(false);
                                        setShowInstructions(true);
                                        setTabSwitches(0);
                                    }}
                                >
                                    Retake Assessment
                                </Button>
                            )}
                            {passed && (
                                <Button className="h-12 rounded-xl" onClick={() => navigate(`/certificate/${courseId}`)}>
                                    Claim Certificate
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const choices = getChoices(question);
    const selectedChoice = selectedAnswers[currentQuestion];
    const progressValue = (answeredCount / questions.length) * 100;

    return (
        <div className="min-h-screen bg-background dark:bg-gray-950 text-foreground dark:text-white">
            <div className="border-b border-border dark:border-white/5 bg-card/90 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-primary/15 p-3 text-primary">
                                <Target className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold">Final Assessment</h1>
                                <p className="text-sm text-muted-foreground dark:text-gray-400">{course.title}</p>
                            </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] px-4 py-2">
                                <p className="text-xs text-muted-foreground dark:text-gray-500">Estimated Time</p>
                                <p className="flex items-center font-semibold">
                                    <Clock className="mr-2 h-4 w-4 text-primary" />
                                    {examDurationMinutes} min
                                </p>
                            </div>
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] px-4 py-2">
                                <p className="text-xs text-muted-foreground dark:text-gray-500">Start Time</p>
                                <p className="font-semibold">{startTime?.toLocaleTimeString() || '--'}</p>
                            </div>
                            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] px-4 py-2">
                                <p className="text-xs text-muted-foreground dark:text-gray-500">Saved Until</p>
                                <p className="font-semibold">Manual submit</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_280px]">
                <main className="space-y-6">
                    <Card className="bg-card dark:bg-gray-900 border-border dark:border-white/5 text-foreground dark:text-white rounded-2xl">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Question {currentQuestion + 1} of {questions.length}</CardTitle>
                                <Badge className="bg-primary/10 text-primary border-primary/20">
                                    {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saving enabled'}
                                </Badge>
                            </div>
                            <Progress value={progressValue} className="h-2 bg-muted dark:bg-white/5" />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl bg-muted/60 dark:bg-white/[0.03] border border-border dark:border-white/10 p-5 text-lg font-medium">
                                {getQuestionText(question)}
                            </div>

                            <RadioGroup
                                value={selectedChoice?.toString()}
                                onValueChange={(value) => setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: Number(value) })}
                                className="space-y-3"
                            >
                                {choices.map((option, index) => (
                                    <div
                                        key={option.id}
                                        className={`flex items-center space-x-3 p-4 border rounded-xl transition-colors ${selectedChoice === option.id ? 'border-primary bg-primary/10' : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.02] hover:bg-accent dark:hover:bg-white/[0.05]'
                                            }`}
                                    >
                                        <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                                        <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer text-base">
                                            <span className="mr-3 text-muted-foreground dark:text-gray-500 font-bold">{String.fromCharCode(65 + index)}</span>
                                            {option.text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>

                            <div className="flex items-center justify-between pt-6 border-t border-border dark:border-white/5">
                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentQuestion(currentQuestion - 1)}
                                    disabled={currentQuestion === 0}
                                    className="rounded-xl border-border dark:border-white/10 text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-white/5"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Previous
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="rounded-xl border-border dark:border-white/10 text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => saveAnswer()}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save
                                    </Button>
                                    {currentQuestion < questions.length - 1 ? (
                                        <Button className="rounded-xl" onClick={async () => {
                                            try {
                                                await saveAnswer();
                                                setCurrentQuestion(currentQuestion + 1);
                                            } catch (error: any) {
                                                toast.error(error.response?.data?.message || 'Failed to save answer.');
                                            }
                                        }}>
                                            Next
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button className="rounded-xl" onClick={() => submitAssessment()} disabled={answeredCount < questions.length || isAttemptLoading}>
                                            {isAttemptLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Submit Assessment
                                            <CheckCircle className="ml-2 h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </main>

                <aside className="space-y-4">
                    <Card className="bg-card dark:bg-gray-900 border-border dark:border-white/5 text-foreground dark:text-white rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-base">Question Navigator</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-5 gap-2">
                                {questions.map((item: any, index: number) => (
                                    <button
                                        key={item.id ?? index}
                                        onClick={() => setCurrentQuestion(index)}
                                        className={`h-10 rounded-lg border text-sm font-medium ${currentQuestion === index
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : selectedAnswers[index] !== undefined
                                                ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300'
                                                : 'border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] text-muted-foreground dark:text-gray-400'
                                            }`}
                                    >
                                        {index + 1}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">{answeredCount} of {questions.length} answers saved.</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card dark:bg-gray-900 border-border dark:border-white/5 text-foreground dark:text-white rounded-2xl">
                        <CardContent className="p-5">
                            <h3 className="flex items-center font-medium">
                                <ShieldAlert className="mr-2 h-5 w-5 text-amber-400" />
                                Session integrity
                            </h3>
                            <p className="mt-3 text-sm text-muted-foreground dark:text-gray-400">
                                Refreshing, leaving, or repeatedly switching tabs may be recorded for review.
                            </p>
                            <div className="mt-4 rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-3 text-sm">
                                Tab switches detected: <span className="font-semibold">{tabSwitches}</span>
                            </div>
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
};
