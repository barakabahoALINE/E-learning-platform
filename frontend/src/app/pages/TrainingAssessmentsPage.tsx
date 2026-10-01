import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import assessmentAPI from "../../features/assessments/assessmentAPI";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useAppSelector } from "../../hooks/reduxHooks";
import { MainLayout } from "../components/MainLayout";

interface TrainingAssessmentSummary {
  id: number;
  title: string;
  training_title: string;
  survey_name: string;
  duration: number | null;
  pass_mark: number;
  require_access_code: boolean;
  question_count: number;
}

interface TrainingQuestion {
  id: number;
  question_text: string;
  question_type: "single" | "multiple" | "matching";
  marks: number;
  choices: Array<{ id: number; text: string }>;
  matching_pairs: Array<{ left: string; right: string }>;
}

type Answer = Array<number | string> | Array<{ left: string; right: string }>;

export function TrainingAssessmentsPage() {
  const user = useAppSelector(selectCurrentUser);
  const location = useLocation();
  const [assessments, setAssessments] = useState<TrainingAssessmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<TrainingAssessmentSummary | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState<Answer>([]);
  const [result, setResult] = useState<any>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAssessments = async () => {
    try {
      setIsLoading(true);
      const assignedAssessments = await assessmentAPI.listMyTrainingAssessments();
      setAssessments(assignedAssessments);
      const requestedAssessmentId = new URLSearchParams(location.search).get("assessment");
      const requestedAssessment = assignedAssessments.find((assessment) => String(assessment.id) === requestedAssessmentId);
      setSelectedAssessment(requestedAssessment || assignedAssessments[0] || null);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || error?.message || "Unable to load training assessments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, []);

  const startAttempt = async () => {
    if (!selectedAssessment) return;
    try {
      setIsBusy(true);
      setErrorMessage("");
      const response = await assessmentAPI.startAttempt(
        selectedAssessment.id,
        undefined,
        accessCode.trim() || undefined,
      );
      setAttempt(response.data);
      setQuestions(response.data.question_snapshot || []);
      setQuestionIndex(0);
      setAnswer([]);
      toast.success(response.message || "Assessment started");
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Unable to start assessment";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const saveAnswer = async () => {
    const question = questions[questionIndex];
    if (!attempt?.id || !question) return;
    const payload: any = { attempt_id: attempt.id, question_id: question.id };
    if (question.question_type === "matching") payload.matching_pairs = answer;
    else payload.selected_choices = answer;
    await assessmentAPI.saveAnswer(payload);
  };

  const moveNext = async () => {
    try {
      setIsBusy(true);
      await saveAnswer();
      if (questionIndex < questions.length - 1) {
        setQuestionIndex((index) => index + 1);
        setAnswer([]);
      } else {
        const response = await assessmentAPI.submitAttempt(attempt.id);
        setResult(response.data);
        setAttempt(null);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Unable to save your answer");
    } finally {
      setIsBusy(false);
    }
  };

  const resetToList = () => {
    setSelectedAssessment(null);
    setAttempt(null);
    setQuestions([]);
    setResult(null);
    setAccessCode("");
    setErrorMessage("");
    loadAssessments();
  };

  const currentQuestion = questions[questionIndex];

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl py-6">
        {attempt && currentQuestion ? (
          <section className="space-y-5">
            <button onClick={resetToList} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Leave assessment
            </button>
            <div className="border-b border-gray-200 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-blue-700">{selectedAssessment?.training_title}</p>
                  <h1 className="mt-1 text-xl font-bold text-gray-900">{selectedAssessment?.title}</h1>
                </div>
                <span className="text-sm text-gray-600">Question {questionIndex + 1} of {questions.length}</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded bg-gray-100">
                <div className="h-full bg-blue-600 transition-all" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            <div className="py-3">
              <h2 className="text-lg font-semibold text-gray-900">{currentQuestion.question_text}</h2>
              <p className="mt-1 text-xs text-gray-500">{currentQuestion.marks} mark{currentQuestion.marks === 1 ? "" : "s"}</p>
              {currentQuestion.question_type === "matching" ? (
                <div className="mt-5 divide-y divide-gray-200 border-y border-gray-200">
                  {currentQuestion.matching_pairs.map((pair) => {
                    const selectedPairs = answer as Array<{ left: string; right: string }>;
                    const selectedValue = selectedPairs.find((entry) => entry.left === pair.left)?.right || "";
                    return (
                      <label key={pair.left} className="grid gap-3 py-3 sm:grid-cols-2 sm:items-center">
                        <span className="text-sm text-gray-800">{pair.left}</span>
                        <select
                          value={selectedValue}
                          onChange={(event) => {
                            const nextPairs = currentQuestion.matching_pairs.map((entry) => ({
                              left: entry.left,
                              right: entry.left === pair.left ? event.target.value : (selectedPairs.find((value) => value.left === entry.left)?.right || ""),
                            }));
                            setAnswer(nextPairs);
                          }}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Select a match</option>
                          {currentQuestion.matching_pairs.map((entry) => <option key={entry.right} value={entry.right}>{entry.right}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5 divide-y divide-gray-200 border-y border-gray-200">
                  {currentQuestion.choices.map((choice) => {
                    const selected = (answer as Array<number | string>).some((id) => String(id) === String(choice.id));
                    return (
                      <label key={choice.id} className="flex cursor-pointer items-center gap-3 py-3 text-sm text-gray-800">
                        <input
                          type={currentQuestion.question_type === "multiple" ? "checkbox" : "radio"}
                          name={`training-question-${currentQuestion.id}`}
                          checked={selected}
                          onChange={(event) => {
                            if (currentQuestion.question_type === "multiple") {
                              const existing = answer as Array<number | string>;
                              setAnswer(event.target.checked ? [...existing, choice.id] : existing.filter((id) => String(id) !== String(choice.id)));
                            } else {
                              setAnswer([choice.id]);
                            }
                          }}
                          className="h-4 w-4 accent-blue-600"
                        />
                        {choice.text}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-200 pt-4">
              <button onClick={moveNext} disabled={isBusy} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {isBusy ? "Saving..." : questionIndex === questions.length - 1 ? "Submit assessment" : "Next question"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : result ? (
          <section className="mx-auto max-w-xl py-14 text-center">
            {result.is_passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /> : <AlertCircle className="mx-auto h-12 w-12 text-amber-600" />}
            <h1 className="mt-4 text-2xl font-bold text-gray-900">{result.is_passed ? "Assessment passed" : "Assessment submitted"}</h1>
            <p className="mt-2 text-4xl font-bold text-blue-700">{Math.round(Number(result.percentage || 0))}%</p>
            <p className="mt-2 text-sm text-gray-600">Pass mark: {result.pass_mark ?? selectedAssessment?.pass_mark}%</p>
            <button onClick={resetToList} className="mt-7 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Back to my trainings</button>
          </section>
        ) : (
          <>
            <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">{location.pathname === "/dashboard" ? "Welcome" : "Training"}</p>
                <h1 className="text-lg font-bold text-gray-900">{user?.full_name || user?.email || "Training User"}</h1>
                <p className="text-sm text-gray-500">{location.pathname === "/dashboard" ? "Assessments linked to your surveys" : "My assessments"}</p>
              </div>
            {isLoading ? <p className="py-12 text-center text-sm text-gray-500">Loading assigned assessments...</p> : assessments.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpenCheck className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm font-semibold text-gray-700">No published assessments are assigned to you yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => { setSelectedAssessment(assessment); setAccessCode(""); setErrorMessage(""); }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${String(selectedAssessment?.id) === String(assessment.id) ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
                    aria-pressed={String(selectedAssessment?.id) === String(assessment.id)}
                  >
                    <span className="flex items-start gap-3">
                      <BookOpenCheck className={`mt-0.5 h-4 w-4 shrink-0 ${String(selectedAssessment?.id) === String(assessment.id) ? "text-blue-700" : "text-gray-500"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">{assessment.title}</span>
                          {String(selectedAssessment?.id) === String(assessment.id) && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">Selected</span>}
                        </span>
                        <span className="mt-1 block text-xs text-gray-600">{assessment.question_count} questions · {assessment.duration ?? "--"} minutes</span>
                        <span className="mt-1 block text-xs text-gray-500">Survey: {assessment.survey_name || assessment.training_title}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {selectedAssessment && assessments.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                {selectedAssessment.require_access_code && (
                  <label className="block text-xs font-medium text-gray-700">
                    <span className="mb-1.5 block">Access code for: {selectedAssessment.title}</span>
                    <input
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      maxLength={8}
                      placeholder="Enter the code you received"
                      autoComplete="off"
                      className="block h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                )}
                {errorMessage && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage}</p>}
                <button
                  onClick={startAttempt}
                  disabled={isBusy || (selectedAssessment.require_access_code && !accessCode.trim())}
                  className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gray-950 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBusy ? "Starting..." : "Start assessment"}
                  {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}