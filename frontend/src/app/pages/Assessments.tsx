import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "../../hooks/reduxHooks";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Edit2,
  FileQuestion,
  Info,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  UsersRound,
} from "lucide-react";
import { AssessmentModal } from "./course-builder/AssessmentModal";
import { AssessmentsAttachmentModal } from "./AssessmentsAttachmentModal";
import DeleteModal from "../components/ui/DeleteModal";
import {
  AssessmentLibraryItem,
  listAssessmentLibrary,
} from "../../features/assessments/assessmentLibraryAdapter";
import {
  addQuestion,
  createAssessment,
  deleteAssessmentAction,
  deleteQuestionAction,
  attachAssessment,
  detachAssessment,
  updateQuestion,
  updateAssessmentSettings,
} from "../../features/assessments/assessmentSlice";
import assessmentAPI from "../../features/assessments/assessmentAPI";
import type { AssessmentType } from "../../features/assessments/types";
import type { QuizQuestion } from "../../features/courses/types";

interface TrainingOption {
  id: number | string;
  title: string;
  survey_name?: string;
  description?: string;
}

interface TrainingUserOption {
  id: number;
  full_name: string;
  email: string;
  is_assigned: boolean;
}

interface CreateTemplateForm {
  title: string;
  assessment_type: AssessmentType;
  pass_mark: string;
  max_attempts: string;
  duration: string;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: string;
  training?: string;
  require_access_code?: boolean;
  access_code?: string;
}

const emptyForm = (type: AssessmentType, trainingId?: number | string): CreateTemplateForm => ({
  title:
    type === "FINAL"
      ? "Final Assessment"
      : type === "TRAINING"
        ? "New Training Assessment"
        : "New Quiz",
  assessment_type: type,
  pass_mark: type === "FINAL" || type === "TRAINING" ? "60" : "70",
  max_attempts: "3",
  duration: type === "FINAL" || type === "TRAINING" ? "60" : "30",
  tab_switch_enabled: false,
  tab_switch_limit: "0",
  training: type === "TRAINING" ? String(trainingId ?? "") : undefined,
  require_access_code: type === "TRAINING",
  access_code: "",
});

export function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState<AssessmentType>("QUIZ");
  const [items, setItems] = useState<AssessmentLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [createForm, setCreateForm] = useState<CreateTemplateForm | null>(null);
  const [questionTarget, setQuestionTarget] =
    useState<AssessmentLibraryItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{
    item: AssessmentLibraryItem;
    question: QuizQuestion;
  } | null>(null);
  const [attachmentTarget, setAttachmentTarget] = useState<AssessmentLibraryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssessmentLibraryItem | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<AssessmentLibraryItem | null>(null);
  const [trainingOptions, setTrainingOptions] = useState<TrainingOption[]>([]);
  const [trainingOptionsLoading, setTrainingOptionsLoading] = useState(false);
  const [showCreateTraining, setShowCreateTraining] = useState(false);
  const [newTrainingTitle, setNewTrainingTitle] = useState("");
  const [isCreatingTraining, setIsCreatingTraining] = useState(false);
  const [expandedTrainingAssessmentId, setExpandedTrainingAssessmentId] = useState<string | number | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<AssessmentLibraryItem | null>(null);
  const [trainingUsers, setTrainingUsers] = useState<TrainingUserOption[]>([]);
  const [selectedTrainingUserIds, setSelectedTrainingUserIds] = useState<number[]>([]);
  const [isLoadingTrainingUsers, setIsLoadingTrainingUsers] = useState(false);
  const [isSavingTrainingUsers, setIsSavingTrainingUsers] = useState(false);
  const dispatch = useAppDispatch();

  const loadTrainingOptions = async () => {
    setTrainingOptionsLoading(true);
    try {
      const trainings = await assessmentAPI.listTrainings();
      setTrainingOptions(Array.isArray(trainings) ? trainings : []);
    } catch (error: any) {
      setTrainingOptions([]);
      toast.error(error?.message || "Unable to load training programs");
    } finally {
      setTrainingOptionsLoading(false);
    }
  };

  const handleCreateTraining = async () => {
    const title = newTrainingTitle.trim();
    if (!title) {
      toast.error("Training program name is required");
      return;
    }

    try {
      setIsCreatingTraining(true);
      const response = await assessmentAPI.createTraining({ title });
      const training = response?.data ?? response;
      if (!training?.id) throw new Error(response?.error || "Unable to create training program");

      setTrainingOptions((current) => [training, ...current]);
      setCreateForm((current) => current?.assessment_type === "TRAINING"
        ? { ...current, training: String(training.id) }
        : current
      );
      setNewTrainingTitle("");
      setShowCreateTraining(false);
      toast.success("Training program created and selected");
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Unable to create training program");
    } finally {
      setIsCreatingTraining(false);
    }
  };

  const handleTrainingPublishChange = async (item: AssessmentLibraryItem, isPublished: boolean) => {
    try {
      await assessmentAPI.setTrainingAssessmentPublished(item.id, isPublished);
      setItems((current) => current.map((entry) =>
        String(entry.id) === String(item.id) ? { ...entry, is_published: isPublished } : entry
      ));
      const assignedCount = item.training_user_count ?? 0;
      toast.success(isPublished
        ? assignedCount > 0
          ? `Published for ${assignedCount} assigned Training User${assignedCount === 1 ? "" : "s"}`
          : "Published, but no Training Users are assigned yet"
        : "Training assessment moved to draft");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Unable to change publication status");
    }
  };

  const openTrainingAssignments = async (item: AssessmentLibraryItem) => {
    setAssignmentTarget(item);
    setIsLoadingTrainingUsers(true);
    try {
      const users = await assessmentAPI.getTrainingAssessmentUsers(item.id);
      setTrainingUsers(users);
      setSelectedTrainingUserIds(users.filter((user: TrainingUserOption) => user.is_assigned).map((user: TrainingUserOption) => user.id));
    } catch (error: any) {
      setAssignmentTarget(null);
      toast.error(error?.response?.data?.error || error?.message || "Unable to load Training Users");
    } finally {
      setIsLoadingTrainingUsers(false);
    }
  };

  const saveTrainingAssignments = async () => {
    if (!assignmentTarget) return;
    try {
      setIsSavingTrainingUsers(true);
      await assessmentAPI.setTrainingAssessmentUsers(assignmentTarget.id, selectedTrainingUserIds);
      setItems((current) => current.map((entry) =>
        String(entry.id) === String(assignmentTarget.id)
          ? { ...entry, training_user_count: selectedTrainingUserIds.length }
          : entry
      ));
      toast.success("Training User assignments saved");
      setAssignmentTarget(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || "Unable to save Training User assignments");
    } finally {
      setIsSavingTrainingUsers(false);
    }
  };

  const loadLibrary = async () => {
    try {
      setIsLoading(true);
      const libraryItems = await listAssessmentLibrary();
      setItems(libraryItems);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load assessments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
    loadTrainingOptions();
  }, []);

  useEffect(() => {
    if (activeTab === "TRAINING" && trainingOptions.length > 0 && !createForm?.training) {
      setCreateForm((current) => current && current.assessment_type === "TRAINING"
        ? { ...current, training: String(trainingOptions[0].id), require_access_code: true }
        : current
      );
    }
  }, [activeTab, trainingOptions, createForm]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => item.assessment_type === activeTab)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [item.title, item.courseTitle, item.moduleTitle]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedQuery),
          );
      });
  }, [activeTab, items, query]);

  const handleCreateAssessment = async () => {
    if (!createForm?.title.trim()) {
      toast.error("Title is required");
      return;
    }

    const isFinalAssessment = createForm.assessment_type === "FINAL";
    const isTrainingAssessment = createForm.assessment_type === "TRAINING";
    const selectedTraining = trainingOptions.find((training) => String(training.id) === String(createForm.training));
    if (isTrainingAssessment && !selectedTraining) {
      toast.error("Select or create a training program before creating this assessment.");
      return;
    }

    try {
      const payload: any = {
        course: null,
        module: null,
        title: createForm.title.trim(),
        is_final: isFinalAssessment,
        assessment_type: createForm.assessment_type,
        pass_mark: Number(createForm.pass_mark) || 60,
        max_attempts: Number(createForm.max_attempts) || 3,
        duration: Number(createForm.duration) || 30,
        tab_switch_enabled:
          isFinalAssessment && Boolean(createForm.tab_switch_enabled),
        tab_switch_limit: isFinalAssessment
          ? Number(createForm.tab_switch_limit) || 0
          : 0,
      };

      if (isTrainingAssessment) {
        if (!selectedTraining) return;
        payload.training = Number(selectedTraining.id) || selectedTraining.id;
        payload.require_access_code = Boolean(createForm.require_access_code);
        if (payload.require_access_code) {
          const accessCodeValue = String(createForm.access_code || "").trim();
          if (!accessCodeValue) {
            toast.error("Enter an access code before creating a training assessment.");
            return;
          }
          payload.access_code = accessCodeValue;
        }
      }

      const response = await dispatch(createAssessment(payload)).unwrap();
      if (response?.success && response.data) {
        setCreateForm(null);
        await loadLibrary();
        toast.success("Assessment created successfully");
      } else {
        throw new Error(response?.error || "Failed to create assessment");
      }
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Failed to create assessment");
    }
  };

  const handleSaveQuestion = async (question: QuizQuestion) => {
    if (!questionTarget || questionTarget.source !== "course") return;

    try {
      const payload: any = {
        assessment: questionTarget.id,
        question_text: question.question_text || question.question,
        question_type:
          question.question_type === "multiple"
            ? "multiple"
            : question.question_type === "matching"
              ? "matching"
              : "single",
        marks: question.marks || 1,
      };

      if (question.question_type === "matching") {
        payload.matching_pairs = question.matching_pairs || [];
      } else {
        payload.choices =
          question.choices && question.choices.length > 0
            ? question.choices.map((choice) => ({
                text: String(choice.text || ""),
                is_correct: Boolean(choice.is_correct),
              }))
            : (question.options || []).map((option, index) => ({
                text: String(option || ""),
                is_correct: index === question.correctAnswer,
              }));
      }

      const isUpdate = Boolean(question.id);
      if (isUpdate) {
        await dispatch(
          updateQuestion({ questionId: question.id, data: payload }),
        ).unwrap();
      } else {
        await dispatch(addQuestion(payload)).unwrap();
      }

      await loadLibrary();

      setQuestionTarget(null);
      setEditingQuestion(null);
      toast.success("Question saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save question");
    }
  };

  const openQuestionEditor = (
    item: AssessmentLibraryItem,
    question?: QuizQuestion,
  ) => {
    setQuestionTarget(item);
    setEditingQuestion(question || null);
  };

  const handleEditAssessment = (item: AssessmentLibraryItem) => {
    // Open the assessment settings modal (reuse create form) for editing
    setEditingAssessment(item);
    setCreateForm({
      title:
        item.title ||
        (item.assessment_type === "FINAL" ? "Final Assessment" : "New Quiz"),
      assessment_type: item.assessment_type,
      pass_mark: String(
        item.pass_mark ?? (item.assessment_type === "FINAL" ? 60 : 70),
      ),
      max_attempts: String(item.max_attempts ?? 3),
      duration: String(
        item.duration ?? (item.assessment_type === "FINAL" ? 60 : 30),
      ),
      tab_switch_enabled: Boolean(item.tab_switch_enabled),
      tab_switch_limit: String(item.tab_switch_limit ?? 0),
      training: item.assessment_type === "TRAINING" ? String(item.training ?? trainingOptions[0]?.id ?? "") : undefined,
      require_access_code: Boolean(item.require_access_code),
      access_code: "",
    });
  };

  const handleUpdateAssessment = async () => {
    if (!editingAssessment || !createForm) return;
    const title = createForm.title.trim();

    if (!title) {
      toast.error("Title is required");
      return;
    }
    const selectedTraining = trainingOptions.find((training) => String(training.id) === String(createForm.training));
    if (createForm.assessment_type === "TRAINING" && !selectedTraining) {
      toast.error("Select or create a training program before updating this assessment.");
      return;
    }

    try {
      const payload: any = {
        title: createForm.title.trim(),
        duration: Number(createForm.duration) || 0,
        max_attempts: Number(createForm.max_attempts) || 0,
        pass_mark: Number(createForm.pass_mark) || 0,
        tab_switch_enabled:
          createForm.assessment_type === "FINAL"
            ? Boolean(createForm.tab_switch_enabled)
            : false,
        tab_switch_limit:
          createForm.assessment_type === "FINAL"
            ? Number(createForm.tab_switch_limit) || 0
            : 0,
      };

      if (createForm.assessment_type === 'TRAINING') {
        if (!selectedTraining) return;
        payload.training = Number(selectedTraining.id) || selectedTraining.id;
        payload.require_access_code = Boolean(createForm.require_access_code);
        if (payload.require_access_code) {
          const accessCodeValue = String(createForm.access_code || "").trim();
          if (!accessCodeValue) {
            toast.error("Enter an access code before updating the training assessment.");
            return;
          }
          payload.access_code = accessCodeValue;
        }
      }

      await dispatch(updateAssessmentSettings({ assessmentId: editingAssessment.id, data: payload })).unwrap();
      await loadLibrary();
      toast.success("Assessment updated successfully");
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Failed to update assessment");
    } finally {
      setEditingAssessment(null);
      setCreateForm(null);
    }
  };

  const handleOpenAttachmentModal = (item: AssessmentLibraryItem) => {
    if (item.source !== "course") {
      toast.error(
        "Only backend course assessments can be attached or detached.",
      );
      return;
    }
    setAttachmentTarget(item);
  };

  const handleDeleteAssessment = (item: AssessmentLibraryItem) => {
    if (item.source !== "course") return;
    setDeleteTarget(item);
  };

  const confirmDeleteAssessment = async () => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteAssessmentAction(deleteTarget.id)).unwrap();
      setItems((prev) =>
        prev.filter(
          (existing) =>
            !(
              existing.source === "course" &&
              String(existing.id) === String(deleteTarget.id)
            ),
        ),
      );
      toast.success("Assessment deleted successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete assessment");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleAttachment = async (item: AssessmentLibraryItem) => {
    handleOpenAttachmentModal(item);
  };

  const handleAttachAssessment = async (payload: {
    module_ids?: Array<number | string>;
    course_ids?: Array<number | string>;
  }) => {
    if (!attachmentTarget) return;

    try {
      await dispatch(
        attachAssessment({ assessmentId: attachmentTarget.id, payload }),
      ).unwrap();
      await loadLibrary();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDetachAttachment = async (payload: {
    module_id?: number | string;
    course_id?: number | string;
  }) => {
    if (!attachmentTarget) return;

    try {
      await dispatch(
        detachAssessment({ assessmentId: attachmentTarget.id, payload }),
      ).unwrap();
      await loadLibrary();
    } catch (error: any) {
      throw error;
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return;

    const { item, question } = deleteQuestionTarget;
    if (item.source !== "course") {
      setDeleteQuestionTarget(null);
      return;
    }

    try {
      await dispatch(deleteQuestionAction(question.id)).unwrap();
      await loadLibrary();
      toast.success("Question deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete question");
    } finally {
      setDeleteQuestionTarget(null);
    }
  };

  const label =
    activeTab === "QUIZ"
      ? "Quiz"
      : activeTab === "TRAINING"
        ? "Training Assessment"
        : "Final Assessment";

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
              <p className="text-sm text-gray-500">Quizzes, final assessments, and trainings</p>
            </div>
          </div>
          <div className="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
            <button
              onClick={() => setActiveTab("QUIZ")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "QUIZ"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Quizzes
            </button>
            <button
              onClick={() => setActiveTab("FINAL")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                activeTab === "FINAL"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Final Assessments
            </button>
            <button
              onClick={() => setActiveTab("TRAINING")}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === "TRAINING" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              Trainings
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
            onClick={() => setCreateForm(emptyForm(activeTab, trainingOptions[0]?.id))}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {label}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-sm text-gray-500">
          Loading assessments...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">
            No {label.toLowerCase()}s found
          </p>
        </div>
      ) : (
        activeTab === "TRAINING" ? (
          <div className="divide-y divide-gray-200 border-y border-gray-200 bg-white">
            {filteredItems.map((item) => (
              <div key={`${item.source}-${item.id}`} className="border-b border-gray-100">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {(item.questions || []).length} question{(item.questions || []).length === 1 ? "" : "s"}
                    {item.duration != null ? ` · ${item.duration} min` : ""}
                    {` · ${item.training_user_count ?? 0} assigned`}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean(item.is_published)}
                      onChange={(event) => handleTrainingPublishChange(item, event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                      aria-label={`${item.is_published ? "Unpublish" : "Publish"} ${item.title}`}
                    />
                    <span className={item.is_published ? "text-green-700" : "text-gray-500"}>
                      {item.is_published ? "Published" : "Draft"}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setExpandedTrainingAssessmentId((current) => String(current) === String(item.id) ? null : item.id)}
                    className="rounded-md border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Questions ({(item.questions || []).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => openTrainingAssignments(item)}
                    className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-700"
                    title="Assign Training Users"
                    aria-label={`Assign Training Users to ${item.title}`}
                  >
                    <UsersRound className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditAssessment(item)}
                    className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 hover:text-blue-700"
                    title="Edit assessment"
                    aria-label={`Edit ${item.title}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAssessment(item)}
                    className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50"
                    title="Delete assessment"
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </div>
                {String(expandedTrainingAssessmentId) === String(item.id) && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="divide-y divide-gray-200">
                    {(item.questions || []).map((question, index) => (
                      <div key={question.id || index} className="flex items-center justify-between gap-3 py-2 text-xs text-gray-700">
                        <span className="min-w-0 truncate">{index + 1}. {question.question_text || question.question}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => openQuestionEditor(item, question)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-700" title="Edit question" aria-label="Edit question">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => setDeleteQuestionTarget({ item, question })} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-red-700" title="Delete question" aria-label="Delete question">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => openQuestionEditor(item)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800">
                    <Plus className="h-3.5 w-3.5" /> Add question
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={`${item.source}-${item.id}`}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900 truncate">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditAssessment(item)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit assessment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAttachment(item)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={
                      item.assessment_type === "QUIZ"
                        ? item.moduleId
                          ? "Manage module attachments"
                          : "Attach to modules"
                        : item.courseId
                          ? "Manage course attachments"
                          : "Attach to courses"
                    }
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAssessment(item)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[11px] px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                  {(item.questions || []).length} question
                  {(item.questions || []).length === 1 ? "" : "s"}
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
                {item.tab_switch_enabled && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200">
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
                    {item.tab_switch_limit ?? 0}
                  </span>
                )}
              </div>

              {item.questions.length > 0 && (
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
                  {item.questions.map((question, index) => (
                    <div
                      key={question.id || index}
                      className="flex items-center justify-between gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                    >
                      <span className="min-w-0 truncate">
                        {index + 1}.{" "}
                        {question.question_text || question.question}
                      </span>
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
                          onClick={() =>
                            setDeleteQuestionTarget({ item, question })
                          }
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {item.source === "course" && (
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
        )
      )}

      {attachmentTarget && (
        <AssessmentsAttachmentModal
          item={attachmentTarget}
          onClose={() => setAttachmentTarget(null)}
          onAttach={handleAttachAssessment}
          onDetach={handleDetachAttachment}
        />
      )}
      {assignmentTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/40 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="training-users-title" className="w-full max-w-lg overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 id="training-users-title" className="text-base font-semibold text-gray-900">Assign Training Users</h2>
                <p className="mt-1 text-xs text-gray-500">{assignmentTarget.title}</p>
              </div>
              <button type="button" onClick={() => setAssignmentTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto px-5 py-3">
              {isLoadingTrainingUsers ? (
                <p className="py-8 text-center text-sm text-gray-500">Loading Training Users...</p>
              ) : trainingUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No Training Users found in your institution.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {trainingUsers.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTrainingUserIds.includes(user.id)}
                        onChange={(event) => setSelectedTrainingUserIds((ids) => event.target.checked ? [...ids, user.id] : ids.filter((id) => id !== user.id))}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900">{user.full_name}</span>
                        <span className="block truncate text-xs text-gray-500">{user.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button type="button" onClick={() => setAssignmentTarget(null)} className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">Cancel</button>
              <button type="button" onClick={saveTrainingAssignments} disabled={isLoadingTrainingUsers || isSavingTrainingUsers} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {isSavingTrainingUsers ? "Saving..." : "Save assignments"}
              </button>
            </div>
          </section>
        </div>
      )}
      {createForm && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-[560px] max-h-[calc(100vh-2rem)] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {editingAssessment ? `Edit ${createForm.assessment_type === "QUIZ" ? "Quiz" : createForm.assessment_type === "TRAINING" ? "Training Assessment" : "Assessment"}` : `Create ${createForm.assessment_type === "QUIZ" ? "Quiz" : createForm.assessment_type === "TRAINING" ? "Training Assessment" : "Final Assessment"}`}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set the rules for how students will take this assessment
                </p>
              </div>
              <div className="flex items-center gap-4">
                {createForm.assessment_type === "FINAL" && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-sm">Tab switch</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm({
                          ...createForm,
                          tab_switch_enabled: !createForm.tab_switch_enabled,
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${createForm.tab_switch_enabled ? "bg-blue-600" : "bg-gray-200"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${createForm.tab_switch_enabled ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </label>
                )}
                <button
                  onClick={() => {
                    setCreateForm(null);
                    setEditingAssessment(null);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-15rem)]">
              {createForm.assessment_type === "TRAINING" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Training program</label>
                  <select
                    value={createForm.training ?? ""}
                    onChange={(event) => setCreateForm({ ...createForm, training: event.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a training</option>
                    {trainingOptions.map((training) => (
                      <option key={String(training.id)} value={String(training.id)}>
                        {training.title}
                      </option>
                    ))}
                  </select>
                  {trainingOptionsLoading ? (
                    <p className="mt-2 text-xs text-gray-500">Loading training programs...</p>
                  ) : trainingOptions.length === 0 ? (
                    <p className="mt-2 text-xs text-amber-700">No training programs exist yet. Create one below to continue.</p>
                  ) : null}
                  {showCreateTraining ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        value={newTrainingTitle}
                        onChange={(event) => setNewTrainingTitle(event.target.value)}
                        className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Training program name"
                        aria-label="Training program name"
                      />
                      <button
                        type="button"
                        onClick={handleCreateTraining}
                        disabled={isCreatingTraining || !newTrainingTitle.trim()}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isCreatingTraining ? "Creating..." : "Create training"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateTraining(false)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCreateTraining(true)}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" /> Create training program
                    </button>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title
                </label>
                <input
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm({ ...createForm, title: event.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Final Assessment"
                />
              </div>

              {createForm.assessment_type === "TRAINING" && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
                    <span>Require access code</span>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, require_access_code: !Boolean(createForm.require_access_code) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${Boolean(createForm.require_access_code) ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${Boolean(createForm.require_access_code) ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </label>

                  {Boolean(createForm.require_access_code) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Access code</label>
                      <input
                        value={createForm.access_code || ""}
                        onChange={(event) => setCreateForm({ ...createForm, access_code: event.target.value })}
                        maxLength={8}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter access code (up to 8 characters)"
                      />
                    </div>
                  )}
                </div>
              )}

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
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      pass_mark: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 60"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Minimum percentage score required to pass.
                </p>
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
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      max_attempts: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 3"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Number of times a student can attempt this assessment.
                </p>
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
                  onChange={(event) =>
                    setCreateForm({
                      ...createForm,
                      duration: event.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 60"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Time limit students have to complete the assessment.
                </p>
              </div>

              {createForm.assessment_type === "FINAL" &&
                createForm.tab_switch_enabled && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      <ShieldCheck className="w-4 h-4 text-orange-500" />
                      tabswitch
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={createForm.tab_switch_limit}
                      onChange={(event) =>
                        setCreateForm({
                          ...createForm,
                          tab_switch_limit: event.target.value,
                        })
                      }
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 3"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Maximum number of allowed tab switches during the
                      assessment.
                    </p>
                  </div>
                )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  <Clock className="w-3 h-3" /> {createForm.duration} min
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <RefreshCw className="w-3 h-3" /> {createForm.max_attempts}{" "}
                  attempt{createForm.max_attempts !== "1" ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                  <Info className="w-3 h-3" /> Pass: {createForm.pass_mark}%
                </span>
                {createForm.assessment_type === "FINAL" &&
                  createForm.tab_switch_enabled && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-orange-500 border border-gray-200">
                      <ShieldCheck className="w-3 h-3 text-orange-500" />{" "}
                      {Number(createForm.tab_switch_limit || 0)} switch
                      {Number(createForm.tab_switch_limit || 0) === 1
                        ? ""
                        : "es"}
                    </span>
                  )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setCreateForm(null);
                  setEditingAssessment(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {editingAssessment ? (
                <button
                  onClick={handleUpdateAssessment}
                  disabled={createForm.assessment_type === "TRAINING" && !trainingOptions.some((training) => String(training.id) === String(createForm.training))}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update
                </button>
              ) : (
                <button
                  onClick={handleCreateAssessment}
                  disabled={createForm.assessment_type === "TRAINING" && !trainingOptions.some((training) => String(training.id) === String(createForm.training))}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              )}
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
          onSave={handleSaveQuestion}
          initialQuestion={editingQuestion || undefined}
        />
      )}

      <DeleteModal
        isOpen={deleteQuestionTarget !== null}
        title="Delete Question"
        description="Are you sure you want to delete this question from the assessment? This action cannot be undone."
        onConfirm={handleDeleteQuestion}
        onCancel={() => setDeleteQuestionTarget(null)}
      />
      <DeleteModal
        isOpen={deleteTarget !== null}
        title={`Delete Assessment`}
        description={`Are you sure you want to delete this assessment? This action cannot be undone.`}
        onConfirm={confirmDeleteAssessment}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
