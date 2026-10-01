import { useEffect, useState } from "react";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleDashed, Clock3, FileCheck2, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import assessmentAPI from "../../features/assessments/assessmentAPI";
import { useAppSelector } from "../../hooks/reduxHooks";
import { MainLayout } from "../components/MainLayout";

interface TrainingAssessmentSummary {
  id: number;
  title: string;
  training_title: string;
  survey_name: string;
  duration: number | null;
  question_count: number;
  status: "completed" | "in_progress" | "not_completed";
}

const statusDetails = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-700", background: "bg-emerald-50" },
  in_progress: { label: "In progress", icon: Clock3, color: "text-amber-700", background: "bg-amber-50" },
  not_completed: { label: "Not completed", icon: CircleDashed, color: "text-slate-600", background: "bg-slate-100" },
};

export function TrainingDashboardPage() {
  const user = useAppSelector(selectCurrentUser);
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<TrainingAssessmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    assessmentAPI.listMyTrainingAssessments()
      .then(setAssessments)
      .catch((error: any) => toast.error(error?.response?.data?.detail || error?.message || "Unable to load your assessments"))
      .finally(() => setIsLoading(false));
  }, []);

  const completedCount = assessments.filter((assessment) => assessment.status === "completed").length;
  const inProgressCount = assessments.filter((assessment) => assessment.status === "in_progress").length;
  const notCompletedCount = assessments.filter((assessment) => assessment.status === "not_completed").length;
  const overview = [
    { label: "Published assessments", value: assessments.length, icon: FileCheck2, color: "text-blue-700", background: "bg-blue-50" },
    { label: "Completed", value: completedCount, icon: CheckCircle2, color: "text-emerald-700", background: "bg-emerald-50" },
    { label: "In progress", value: inProgressCount, icon: Clock3, color: "text-amber-700", background: "bg-amber-50" },
    { label: "Not completed", value: notCompletedCount, icon: CircleDashed, color: "text-slate-600", background: "bg-slate-100" },
  ];

  const openAssessment = (assessmentId?: number) => {
    navigate(assessmentId ? `/training-assessments?assessment=${assessmentId}` : "/training-assessments");
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-5xl py-5 sm:py-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Welcome back</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-950">{user?.full_name || user?.email || "Training User"}</h1>
            <p className="mt-1 text-sm text-gray-600">Your assigned training assessment overview</p>
          </div>
          <button onClick={() => openAssessment()} className="inline-flex items-center justify-center gap-2 rounded-md bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
            Browse assessments <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <section aria-label="Assessment overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overview.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="min-h-28 border border-gray-200 bg-white p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${item.background} ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-bold leading-none text-gray-950">{isLoading ? <LoaderCircle className="h-5 w-5 animate-spin text-gray-400" /> : item.value}</p>
                <p className="mt-1.5 text-xs font-medium text-gray-600">{item.label}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-9">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Your assessments</h2>
              <p className="mt-0.5 text-xs text-gray-500">Select an assessment to open its instructions and access-code field.</p>
            </div>
            {assessments.length > 0 && <span className="text-xs text-gray-500">{assessments.length} published</span>}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 border-y border-gray-200 py-12 text-sm text-gray-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading assessments</div>
          ) : assessments.length === 0 ? (
            <div className="border-y border-gray-200 bg-white py-12 text-center">
              <BookOpenCheck className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-700">No published assessments are assigned to you yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200 bg-white">
              {assessments.map((assessment) => {
                const status = statusDetails[assessment.status];
                const StatusIcon = status.icon;
                return (
                  <button key={assessment.id} onClick={() => openAssessment(assessment.id)} className="flex w-full flex-col gap-3 px-4 py-4 text-left hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{assessment.title}</span>
                      <span className="mt-1 block text-xs text-gray-500">{assessment.training_title} · {assessment.question_count} questions{assessment.duration != null ? ` · ${assessment.duration} minutes` : ""}</span>
                    </span>
                    <span className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <span className="text-xs text-gray-500">{assessment.survey_name}</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.background} ${status.color}`}>
                        <StatusIcon className="h-3.5 w-3.5" />{status.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}