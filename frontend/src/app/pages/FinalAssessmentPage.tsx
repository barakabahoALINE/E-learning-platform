import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle, Clock, Loader2, Save, ShieldAlert, Target, Trophy, X } from 'lucide-react';
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
import { Checkbox } from '../components/ui/checkbox';
import StatusModal from '../components/ui/StatusModal';

type AssessmentChoice = {
    id: number;
    text: string;
    isCorrect: boolean;
};

type MatchingPair = {
    left: string;
    right: string;
};

type MatchingOption = {
    value: string;
    palette: {
        bg: string;
        border: string;
        text: string;
    };
};

type AnswerValue = Array<number | string> | MatchingPair[];
type AnswerMap = Record<number, AnswerValue>;

const matchingPalette = [
    { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8' },
    { bg: '#DCFCE7', border: '#86EFAC', text: '#15803D' },
    { bg: '#FEF3C7', border: '#FCD34D', text: '#B45309' },
    { bg: '#EDE9FE', border: '#C4B5FD', text: '#6D28D9' },
    { bg: '#FCE7F3', border: '#F9A8D4', text: '#BE185D' },
    { bg: '#CCFBF1', border: '#5EEAD4', text: '#0F766E' },
];

const getMatchingPalette = (index: number) => matchingPalette[index % matchingPalette.length];

const shuffleArray = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

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

const isChoiceAnswer = (answer: AnswerValue): answer is Array<number | string> => {
    return Array.isArray(answer) && (answer.length === 0 || typeof answer[0] !== 'object');
};

const isMatchingAnswer = (answer: AnswerValue): answer is MatchingPair[] => {
    return Array.isArray(answer) && answer.length > 0 && typeof answer[0] === 'object';
};

const getSelectedChoiceIds = (answers: AnswerValue | undefined): Array<number | string> => {
    return answers && isChoiceAnswer(answers) ? answers : [];
};

const getSelectedMatchingPairs = (answers: AnswerValue | undefined): MatchingPair[] => {
    return answers && isMatchingAnswer(answers) ? answers : [];
};

export const FinalAssessmentPage: React.FC = () => {
    const { courseId } = useParams();
    const numericCourseId = Number(courseId);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
    const { courseProgress } = useAppSelector((state) => state.progress);

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<AnswerMap>({});
    const [matchingLeftItems, setMatchingLeftItems] = useState<string[]>([]);
    const [matchingRightItems, setMatchingRightItems] = useState<MatchingOption[]>([]);
    const [draggedMatch, setDraggedMatch] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(true);
    const [showResults, setShowResults] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [backendResult, setBackendResult] = useState<any | null>(null);
    const [isAttemptLoading, setIsAttemptLoading] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [lockedMessage, setLockedMessage] = useState<string | null>(null);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

    const sessionKey = `final-assessment-session-${courseId}`;
    const progress = numericCourseId ? courseProgress[numericCourseId] : undefined;
    const assessment = course?.final_assessment;
    const questions = assessment?.questions || [];
    const question = questions[currentQuestion];
    const answeredCount = Object.values(selectedAnswers).filter(answers => answers && answers.length > 0).length;
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

                // Normalize selectedAnswers to hold arrays
                const restored = parsed.selectedAnswers || {};
                const normalized: AnswerMap = {};
                Object.entries(restored).forEach(([key, val]) => {
                    normalized[Number(key)] = Array.isArray(val) ? val : [val as number | string];
                });
                setSelectedAnswers(normalized);

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

    useEffect(() => {
        if (question?.question_type !== 'matching') {
            setMatchingLeftItems([]);
            setMatchingRightItems([]);
            return;
        }

        const pairs = question.matching_pairs || [];
        setMatchingLeftItems(shuffleArray(pairs.map((pair: MatchingPair) => pair.left)));
        setMatchingRightItems(shuffleArray(pairs.map((pair: MatchingPair, index: number) => ({
            value: pair.right,
            palette: getMatchingPalette(index),
        }))));
    }, [question]);

    const calculateScore = () => {
        const correct = questions.filter((item: any, index: number) => {
            const questionChoices = getChoices(item);
            const selected = selectedAnswers[index] || [];

            if (item.question_type === 'multiple') {
                const correctIds = questionChoices.filter(c => c.isCorrect).map(c => c.id);
                const selectedChoiceIds = getSelectedChoiceIds(selected);
                if (selectedChoiceIds.length !== correctIds.length) return false;
                return correctIds.every(id => selectedChoiceIds.includes(id));
            }

            if (item.question_type === 'matching') {
                const selectedPairs = getSelectedMatchingPairs(selected);
                const correctPairs = item.matching_pairs || [];
                if (selectedPairs.length !== correctPairs.length) return false;
                return correctPairs.every((correctPair: MatchingPair, pairIndex: number) => {
                    const selectedPair = selectedPairs[pairIndex];
                    return selectedPair?.left === correctPair.left && selectedPair?.right === correctPair.right;
                });
            }

            const correctChoice = questionChoices.find((choice) => choice.isCorrect);
            const selectedChoiceIds = getSelectedChoiceIds(selected);
            return Boolean(correctChoice && selectedChoiceIds.includes(correctChoice.id));
        }).length;

        return {
            correct,
            total: questions.length,
            percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0,
        };
    };

    const submitAssessment = async () => {
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
            setShowResults(true);
            localStorage.removeItem(sessionKey);
            dispatch(fetchCourseProgress(numericCourseId));
            toast.success('Final assessment submitted.');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Final assessment submission failed.';
            if (attemptId && message.toLowerCase().includes('time expired')) {
                try {
                    const resultResponse = await assessmentAPI.fetchResult(attemptId);
                    setBackendResult({
                        ...resultResponse.data,
                        pass_mark: resultResponse.data?.pass_mark ?? passMark,
                    });
                    setShowResults(true);
                } catch (resultError: any) {
                    const resultMessage = resultError.response?.data?.message || 'Unable to fetch assessment result.';
                    setLockedMessage(resultMessage);
                    toast.error(resultMessage);
                }
            } else {
                setLockedMessage(message);
                toast.error(message);
            }
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

    // Countdown timer — ticks every second while the assessment is active
    useEffect(() => {
        if (!endTime || showInstructions || showResults) return;

        const tick = () => {
            const now = new Date();
            const diff = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
            setRemainingSeconds(diff);
            if (diff === 0) {
                toast.warning('Time is up! Submitting your assessment...');
                submitAssessment();
            }
        };

        tick(); // run immediately
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [endTime, showInstructions, showResults]);

    useEffect(() => {
        if (!assessment || !assessment.tab_switch_enabled) return;

        const showTabSwitchWarning = (count: number) => {
            const limit = Number(assessment.tab_switch_limit ?? 0);
            const remaining = Math.max(0, limit - count);
            const message = remaining === 1
                ? 'You have 1 tab switch remaining before automatic submission.'
                : `You have ${remaining} tab switches remaining before automatic submission.`;
            const style = remaining === 1
                ? {
                    backgroundColor: '#fee2e2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                }
                : {
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    color: '#78350f',
                };

            toast.warning(message, { style });
        };

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!showResults && !showInstructions) {
                event.preventDefault();
                event.returnValue = 'Leaving may interrupt your assessment session.';
            }
        };

        const handleVisibilityChange = async () => {
            if (document.hidden && !showResults && !showInstructions) {
                console.debug('visibilitychange detected, document.hidden=', document.hidden, 'attemptId=', attemptId);
                // Immediately update local counter for responsiveness
                setTabSwitches((c) => c + 1);

                if (attemptId != null) {
                    try {
                        const resp = await assessmentAPI.tabSwitchEvent(attemptId);
                        // resp may be the axios data or full response; normalize
                        const payload = resp && resp.data ? resp.data : resp;
                        const inner = payload && payload.data ? payload.data : payload;
                        const count = inner?.tab_switch_count ?? inner?.tabSwitchCount ?? null;

                        if (typeof count === 'number') setTabSwitches(count);

                        const submitted = inner?.is_submitted || inner?.isSubmitted || false;
                        if (submitted) {
                            // Attempt was auto-submitted by backend due to tab switch limit
                            try {
                                const resultResponse = await assessmentAPI.fetchResult(attemptId);
                                const resultPayload = resultResponse && resultResponse.data ? resultResponse.data : resultResponse;
                                setBackendResult({
                                    ...resultPayload,
                                    pass_mark: resultPayload?.pass_mark ?? passMark,
                                });
                                setShowResults(true);
                                localStorage.removeItem(sessionKey);
                                dispatch(fetchCourseProgress(numericCourseId));
                                toast.info('Attempt auto-submitted due to tab-switch limit.');
                            } catch (err: any) {
                                const message = err.response?.data?.message || 'Unable to fetch assessment result.';
                                setLockedMessage(message);
                                toast.error(message);
                            }
                            return;
                        }

                        showTabSwitchWarning(typeof count === 'number' ? count : tabSwitches + 1);
                    } catch (err: any) {
                        console.error('Tab switch event error', err);
                        // keep local increment; consider retrying later
                    }
                } else {
                    // No attemptId yet; we still increment locally and rely on server sync later
                    showTabSwitchWarning(tabSwitches + 1);
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showInstructions, showResults, attemptId, assessment, numericCourseId, passMark, sessionKey, dispatch, tabSwitches]);

    const startAssessment = async () => {
        if (!assessment?.id) return;

        setIsAttemptLoading(true);
        setLockedMessage(null);
        try {
            const response = await assessmentAPI.startAttempt(assessment.id);
            // response may be the axios response.data wrapper or the inner data.
            const wrapper = response?.data ? response : { data: response };
            const inner = wrapper.data?.data ? wrapper.data.data : wrapper.data;
            const newAttemptId = inner?.id ?? inner?.attempt_id ?? inner?.attemptId ?? null;
            if (newAttemptId) {
                setAttemptId(Number(newAttemptId));
                console.debug('Started attempt id:', newAttemptId);
            } else {
                console.warn('Could not determine attempt id from startAttempt response', response);
            }
            setShowInstructions(false);
        } catch (error: any) {
            const message = error.response?.data?.message || 'Unable to start final assessment.';
            setLockedMessage(message);
            toast.error(message);
        } finally {
            setIsAttemptLoading(false);
        }
    };

    const handleSingleSelect = (choiceId: number) => {
        setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: [choiceId] }));
    };

    const handleMultipleSelect = (choiceId: number, checked: boolean) => {
        setSelectedAnswers(prev => {
            const existing = getSelectedChoiceIds(prev[currentQuestion]);
            const updated = checked
                ? [...existing, choiceId]
                : existing.filter(id => Number(id) !== Number(choiceId));
            return {
                ...prev,
                [currentQuestion]: updated,
            };
        });
    };

    const handleMatchingSelect = (leftItem: string, rightValue: string) => {
        setSelectedAnswers(prev => {
            const existing = (prev[currentQuestion] as MatchingPair[]) || [];
            const basePairs = question?.matching_pairs || [];
            const updated = basePairs.map((pair: MatchingPair) => {
                const existingPair = existing.find(item => item.left === pair.left);
                return {
                    left: pair.left,
                    right: existingPair?.right || '',
                };
            });

            const previousIndex = updated.findIndex(pair => pair.right === rightValue);
            if (previousIndex !== -1) {
                updated[previousIndex] = { ...updated[previousIndex], right: '' };
            }

            const targetIndex = updated.findIndex(pair => pair.left === leftItem);
            if (targetIndex !== -1) {
                updated[targetIndex] = { ...updated[targetIndex], right: rightValue };
            }

            return {
                ...prev,
                [currentQuestion]: updated,
            };
        });
    };

    const handleDragStart = (rightValue: string, event: React.DragEvent<HTMLButtonElement>) => {
        setDraggedMatch(rightValue);
        event.dataTransfer.setData('text/plain', rightValue);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (leftItem: string, event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const value = draggedMatch || event.dataTransfer.getData('text/plain');
        if (value) {
            handleMatchingSelect(leftItem, value);
        }
        setDraggedMatch(null);
    };

    const saveAnswer = async (questionIndex = currentQuestion) => {
        if (!attemptId) return;
        const targetQuestion = questions[questionIndex];
        const selected = selectedAnswers[questionIndex] || [];
        if (!targetQuestion) return;
        if (!selected.length) return;

        const payload: any = {
            attempt_id: attemptId,
            question_id: targetQuestion.id,
        };

        if (targetQuestion.question_type === 'matching') {
            payload.matching_pairs = selected;
        } else {
            payload.selected_choices = selected;
        }

        await assessmentAPI.saveAnswer(payload);
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

                            <div className={`grid gap-3 ${assessment?.tab_switch_enabled ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
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
                                {assessment?.tab_switch_enabled && (
                                    <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                        <p className="text-xs uppercase tracking-widest text-muted-foreground dark:text-gray-500 font-bold">Tab Switch</p>
                                        <p className="text-2xl font-black mt-1">{assessment.tab_switch_limit}</p>
                                    </div>
                                )}
                            </div>

                            {assessment?.tab_switch_enabled && (
                                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
                                    <div className="flex items-start gap-3">
                                        <BookOpenCheck className="h-5 w-5 text-amber-300 mt-0.5" />
                                        <p className='text-muted-foreground dark:text-gray-400 font-bold'>Leaving or repeatedly switching tabs may be recorded for review. After {assessment.tab_switch_limit} allowed tab switches, the next switch will automatically submit your attempt.</p>
                                    </div>
                                </div>
                            )}
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
                            {assessment?.tab_switch_enabled && (
                                <div className="rounded-xl border border-border dark:border-white/10 bg-muted/60 dark:bg-white/[0.03] p-4">
                                    <p className="text-sm text-muted-foreground dark:text-gray-500">Integrity events</p>
                                    <p className="text-xl font-semibold">{tabSwitches}</p>
                                </div>
                            )}
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
                                        setAttemptId(null);
                                        setCurrentQuestion(0);
                                        setSelectedAnswers({});
                                        setShowResults(false);
                                        setShowInstructions(true);
                                        setTabSwitches(0);
                                        setLockedMessage(null);
                                    }}
                                >
                                    Retake Assessment
                                </Button>
                            )}
                            {passed && (
                                <Button className="h-12 rounded-xl" onClick={() => setShowFeedbackModal(true)}>
                                    Claim Certificate
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <StatusModal
                    isOpen={showFeedbackModal}
                    type="info"
                    title="Feedback Required"
                    description="To get and download your certificate, it is mandatory to rate and provide feedback on this course first."
                    onClose={() => setShowFeedbackModal(false)}
                    onConfirm={() => {
                        setShowFeedbackModal(false);
                        navigate(`/certificate/${courseId}`);
                    }}
                    confirmLabel="Proceed to Feedback"
                />
            </div>
        );
    }

    const choices = getChoices(question);
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
                            <div className="rounded border border-border bg-muted/70 px-4 py-2">
                                <p className="text-xs text-muted-foreground">Remaining Time</p>
                                <p className={`flex items-center font-semibold ${remainingSeconds !== null && remainingSeconds <= 60 ? 'text-red-600' : ''}`}>
                                    <Clock className={`mr-2 h-4 w-4 ${remainingSeconds !== null && remainingSeconds <= 60 ? 'text-red-600' : 'text-blue-700'}`} />
                                    {remainingSeconds !== null
                                        ? `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`
                                        : `${examDurationMinutes}:00`}
                                </p>
                            </div>
                            <div className="rounded border border-border bg-muted/70 px-4 py-2">
                                <p className="text-xs text-muted-foreground">Start Time</p>
                                <p className="font-semibold">{startTime?.toLocaleTimeString() || '--'}</p>
                            </div>
                            <div className="rounded border border-border bg-muted/70 px-4 py-2">
                                <p className="text-xs text-muted-foreground">Expected End</p>
                                <p className="font-semibold">{endTime?.toLocaleTimeString() || '--'}</p>
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

                            {question?.question_type === 'multiple' ? (
                                <div className="space-y-3">
                                    {choices.map((option, index) => {
                                        const checked = getSelectedChoiceIds(selectedAnswers[currentQuestion]).includes(option.id);
                                        return (
                                            <label
                                                key={option.id}
                                                className={`flex items-center space-x-3 p-4 border rounded-xl transition-colors cursor-pointer ${checked ? 'border-primary bg-primary/10' : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.02] hover:bg-accent dark:hover:bg-white/[0.05]'
                                                    }`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={(value) => handleMultipleSelect(option.id, Boolean(value))}
                                                />
                                                <span className="flex-1 text-base">
                                                    <span className="mr-3 text-muted-foreground dark:text-gray-500 font-bold">{String.fromCharCode(65 + index)}</span>
                                                    {option.text}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            ) : question?.question_type === 'matching' ? (
                                <div className="space-y-6">
                                    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                                        <div className="space-y-4">
                                            <div className="px-4 pb-2">
                                                <p className="text-sm font-semibold uppercase tracking-widest text-gray-900">COLUMN A</p>
                                            </div>
                                            {matchingLeftItems.map((leftItem) => {
                                                const selectedPairs = (selectedAnswers[currentQuestion] as MatchingPair[]) || [];
                                                const selectedPair = selectedPairs.find(pair => pair.left === leftItem) || { left: leftItem, right: '' };
                                                const matchedOption = matchingRightItems.find(item => item.value === selectedPair.right);

                                                return (
                                                    <div
                                                        key={leftItem}
                                                        className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-sm font-medium text-gray-800">{leftItem}</span>
                                                            <div
                                                                onDragOver={handleDragOver}
                                                                onDrop={(event) => handleDrop(leftItem, event)}
                                                                className="relative min-w-[160px] rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-500 text-center"
                                                                style={selectedPair.right && matchedOption ? {
                                                                    backgroundColor: matchedOption.palette.bg,
                                                                    borderColor: matchedOption.palette.border,
                                                                    color: matchedOption.palette.text,
                                                                } : undefined}
                                                            >
                                                              <div
                                                                className="min-h-[2.5rem] flex items-center justify-center"
                                                              >
                                                                {selectedPair.right || 'drop here'}
                                                              </div>
                                                              {selectedPair.right ? (
                                                                <button
                                                                  type="button"
                                                                  onClick={() => handleMatchingSelect(leftItem, '')}
                                                                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                  aria-label="Clear matched answer"
                                                                >
                                                                  <X className="h-4 w-4" />
                                                                </button>
                                                              ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="px-4 pb-2">
                                                <p className="text-sm font-semibold uppercase tracking-widest text-gray-900">COLUMN B</p>
                                            </div>
                                            {matchingRightItems.map((rightItem) => {
                                                const selectedPairs = (selectedAnswers[currentQuestion] as MatchingPair[]) || [];
                                                const isSelected = selectedPairs.some(pair => pair.right === rightItem.value);
                                                const paletteStyle = isSelected ? undefined : {
                                                    backgroundColor: rightItem.palette.bg,
                                                    borderColor: rightItem.palette.border,
                                                    color: rightItem.palette.text,
                                                };
                                                return (
                                                    <button
                                                        key={rightItem.value}
                                                        type="button"
                                                        draggable
                                                        onDragStart={(event) => handleDragStart(rightItem.value, event)}
                                                        className={`w-full rounded-3xl px-6 py-4 text-center text-sm font-semibold transition ${isSelected ? 'border border-gray-200 bg-white text-gray-400 opacity-70' : 'bg-sky-100 border border-sky-200 text-sky-800 hover:bg-sky-200'}`}
                                                        style={paletteStyle}
                                                        disabled={isSelected}
                                                    >
                                                        {isSelected ? '\u00A0' : rightItem.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <RadioGroup
                                    value={(selectedAnswers[currentQuestion]?.[0])?.toString() || ""}
                                    onValueChange={(value) => handleSingleSelect(Number(value))}
                                    className="space-y-3"
                                >
                                    {choices.map((option, index) => {
                                        const isSelected = selectedAnswers[currentQuestion]?.[0] === option.id;
                                        return (
                                            <div
                                                key={option.id}
                                                onClick={() => handleSingleSelect(option.id)}
                                                className={`flex items-center space-x-3 p-4 border rounded-xl transition-colors cursor-pointer ${isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card dark:border-white/10 dark:bg-white/[0.02] hover:bg-accent dark:hover:bg-white/[0.05]'
                                                    }`}
                                            >
                                                <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                                                <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer text-base">
                                                    <span className="mr-3 text-muted-foreground dark:text-gray-500 font-bold">{String.fromCharCode(65 + index)}</span>
                                                    {option.text}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </RadioGroup>
                            )}

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
                                            : (selectedAnswers[index] && selectedAnswers[index].length > 0)
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

                    {assessment.tab_switch_enabled && (
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
                    )}
                </aside>
            </div>
        </div>
    );
};
