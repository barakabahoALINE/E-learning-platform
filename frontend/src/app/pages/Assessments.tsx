import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Edit2,
  FileQuestion,
  Info,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { AssessmentModal } from "./course-builder/AssessmentModal";
import DeleteModal from "../components/ui/DeleteModal";
import {
  AssessmentLibraryItem,
  createLocalAssessmentTemplate,
  deleteLocalAssessmentTemplate,
  listAssessmentLibrary,
  updateLocalAssessmentTemplate,
} from "../../features/assessments/assessmentLibraryAdapter";
import type { AssessmentType } from "../../features/assessments/types";
import type { QuizQuestion } from "../../features/courses/types";

interface CreateTemplateForm {
  title: string;
  assessment_type: AssessmentType;
  pass_mark: string;
  max_attempts: string;
  duration: string;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: string;
}

const makeLocalQuestionId = () => `local-question-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const emptyForm = (type: AssessmentType): CreateTemplateForm => ({
  title: type === "FINAL" ? "Final Assessment" : "New Quiz",
  assessment_type: type,
  pass_mark: type === "FINAL" ? "60" : "70",
  max_attempts: "3",
  duration: type === "FINAL" ? "60" : "30",
  tab_switch_enabled: false,
  tab_switch_limit: "0",
});

export function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState<AssessmentType>("QUIZ");
  const [items, setItems] = useState<AssessmentLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [createForm, setCreateForm] = useState<CreateTemplateForm | null>(null);
  const [questionTarget, setQuestionTarget] = useState<AssessmentLibraryItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{
    item: AssessmentLibraryItem;
    question: QuizQuestion;
  } | null>(null);

  const loadLibrary = async () => {
    try {
      setIsLoading(true);
      setItems(await listAssessmentLibrary());
    } catch (error: any) {
      toast.error(error?.message || "Failed to load assessments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => item.assessment_type === activeTab)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [item.title, item.courseTitle, item.moduleTitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [activeTab, items, query]);

  const handleCreateTemplate = () => {
    if (!createForm?.title.trim()) {
      toast.error("Title is required");
      return;
    }

    createLocalAssessmentTemplate({
      title: createForm.title,
      assessment_type: createForm.assessment_type,
      pass_mark: Number(createForm.pass_mark) || 60,
      max_attempts: Number(createForm.max_attempts) || 3,
      duration: Number(createForm.duration) || 30,
      tab_switch_enabled: Boolean(createForm.tab_switch_enabled),
      tab_switch_limit: Number(createForm.tab_switch_limit) || 0,
    });

    setCreateForm(null);
    loadLibrary();
    toast.success("Assessment template created");
  };

  const handleDeleteLocalTemplate = (item: AssessmentLibraryItem) => {
    deleteLocalAssessmentTemplate(String(item.id));
    loadLibrary();
    toast.success("Assessment template deleted");
  };

  const handleSaveLocalQuestion = (question: QuizQuestion) => {
    if (!questionTarget || questionTarget.source !== "local") return;

    const nextQuestion = {
      ...question,
      id: question.id || makeLocalQuestionId(),
    };
    const existingQuestions = questionTarget.questions || [];
    const nextQuestions = existingQuestions.some((item) => String(item.id) === String(nextQuestion.id))
      ? existingQuestions.map((item) => (String(item.id) === String(nextQuestion.id) ? nextQuestion : item))
      : [...existingQuestions, nextQuestion];

    updateLocalAssessmentTemplate(String(questionTarget.id), { questions: nextQuestions });
    setQuestionTarget(null);
    setEditingQuestion(null);
    loadLibrary();
    toast.success("Question saved");
  };

  const openQuestionEditor = (item: AssessmentLibraryItem, question?: QuizQuestion) => {
    if (item.source !== "local") return;
    setQuestionTarget(item);
    setEditingQuestion(question || null);
  };

  const handleDeleteLocalQuestion = () => {
    if (!deleteQuestionTarget || deleteQuestionTarget.item.source !== "local") return;

    const { item, question } = deleteQuestionTarget;
    const nextQuestions = (item.questions || []).filter((candidate) => String(candidate.id) !== String(question.id));

    updateLocalAssessmentTemplate(String(item.id), { questions: nextQuestions });
    setDeleteQuestionTarget(null);
    loadLibrary();
    toast.success("Question deleted");
  };

  const label = activeTab === "QUIZ" ? "Quiz" : "Final Assessment";

  return (
    <div className="max-w-[1200px] mx-auto pb-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileQuestion className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
              <p className="text-sm text-gray-500">Quizzes and final assessments</p>
            </div>
          </div>
          <div className="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
            <button
              onClick={() => setActiveTab("QUIZ")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "QUIZ" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Quizzes
            </button>
            <button
              onClick={() => setActiveTab("FINAL")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "FINAL" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Final Assessments
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}s`}
              className="w-full sm:w-72 pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setCreateForm(emptyForm(activeTab))}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {label}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-gray-500">Loading assessments...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No {label.toLowerCase()}s found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={`${item.source}-${item.id}`} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">{item.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.source === "local"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-gray-50 text-gray-600 border-gray-100"
                      }`}>
                      {item.source === "local" ? "Template" : "Course"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {item.source === "local"
                      ? "Local template"
                      : [item.courseTitle, item.moduleTitle].filter(Boolean).join(" / ")}
                  </p>
                </div>
                {item.source === "local" && (
                  <button
                    onClick={() => handleDeleteLocalTemplate(item)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[11px] px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                  {(item.questions || []).length} question{(item.questions || []).length === 1 ? "" : "s"}
                </span>
                {item.duration != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-gray-100">
                    <Clock className="w-3 h-3" />
                    {item.duration}m
                  </span>
                )}
                {item.max_attempts != null && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-gray-100">
                    <RefreshCw className="w-3 h-3" />
                    {item.max_attempts}x
                  </span>
                )}
              </div>

              {item.questions.length > 0 && (
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
                  {item.questions.map((question, index) => (
                    <div key={question.id || index} className="flex items-center justify-between gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                      <span className="min-w-0 truncate">
                        {index + 1}. {question.question_text || question.question}
                      </span>
                      {item.source === "local" && (
                        <span className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openQuestionEditor(item, question)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteQuestionTarget({ item, question })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {item.source === "local" && (
                <button
                  onClick={() => openQuestionEditor(item)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {createForm && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Create {createForm.assessment_type === "QUIZ" ? "Quiz" : "Final Assessment"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set the rules for how students will take this assessment
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-sm">Tab switch</span>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, tab_switch_enabled: !createForm.tab_switch_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${createForm.tab_switch_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${createForm.tab_switch_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </label>
                <button
                  onClick={() => setCreateForm(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  value={createForm.title}
                  onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Final Assessment"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Info className="w-4 h-4 text-blue-500" />
                  Pass Mark (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={createForm.pass_mark}
                  onChange={(event) => setCreateForm({ ...createForm, pass_mark: event.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 60"
                />
                <p className="text-[11px] text-gray-400 mt-1">Minimum percentage score required to pass.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-500" />
                  Maximum Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  value={createForm.max_attempts}
                  onChange={(event) => setCreateForm({ ...createForm, max_attempts: event.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3"
                />
                <p className="text-[11px] text-gray-400 mt-1">Number of times a student can attempt this assessment.</p>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={createForm.duration}
                  onChange={(event) => setCreateForm({ ...createForm, duration: event.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 60"
                />
                <p className="text-[11px] text-gray-400 mt-1">Time limit students have to complete the assessment.</p>
              </div>

              {createForm.tab_switch_enabled && (
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    tabswitch
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={createForm.tab_switch_limit}
                    onChange={(event) => setCreateForm({ ...createForm, tab_switch_limit: event.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 3"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Maximum number of allowed tab switches during the assessment.</p>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <Clock className="w-3 h-3" /> {createForm.duration} min
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <RefreshCw className="w-3 h-3" /> {createForm.max_attempts} attempt{createForm.max_attempts !== "1" ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                  <Info className="w-3 h-3" /> Pass: {createForm.pass_mark}%
                </span>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setCreateForm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {questionTarget && (
        <AssessmentModal
          onClose={() => {
            setQuestionTarget(null);
            setEditingQuestion(null);
          }}
          onSave={handleSaveLocalQuestion}
          initialQuestion={editingQuestion || undefined}
        />
      )}

      <DeleteModal
        isOpen={deleteQuestionTarget !== null}
        title="Delete Question"
        description="Are you sure you want to delete this question from the assessment template?"
        onConfirm={handleDeleteLocalQuestion}
        onCancel={() => setDeleteQuestionTarget(null)}
      />
    </div>
  );
}
