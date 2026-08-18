import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import DeleteModal from "../components/ui/DeleteModal";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  CircleCheckBig,
  Type,
  Video,
  Image as ImageIcon,
  File as FileIcon,
  Clock,
  RefreshCw,
  ShieldCheck,
  Unlink2,
} from "lucide-react";

import StatusModal from "../components/ui/StatusModal";
import { LessonModal } from "./course-builder/LessonModal";
import { AssessmentModal } from "./course-builder/AssessmentModal";
import { CoursePreviewModal } from "./course-builder/CoursePreviewModal";
import { FinalAssessmentSettingsModal } from "./course-builder/FinalAssessmentSettingsModal";
import { AssessmentLibraryPickerModal } from "./course-builder/AssessmentLibraryPickerModal";

import {
  fetchCourseDetails,
  updateCourse,
  publishCourse,
  publishCourseChanges,
  createModule,
  updateModule,
  deleteModule,
  createSection,
  updateSection,
  deleteSection,
  createContent,
  updateContent,
  deleteContent,
  unpublishCourse
} from "../../features/courses/courseSlice";
import { createLocalAssessmentTemplate, cloneAssessmentIntoLocalTemplate, getLocalAssessmentTemplates, updateLocalAssessmentTemplate, type AssessmentLibraryItem, type LocalAssessmentTemplate } from "../../features/assessments/assessmentLibraryAdapter";
import {
  ContentItem,
  QuizQuestion
} from "../../features/courses/types";
import { addQuestion, updateQuestion, createAssessment, attachAssessment, detachAssessment, deleteQuestionAction } from "../../features/assessments/assessmentSlice";
import assessmentAPI from "../../features/assessments/assessmentAPI";
import type { AssessmentCreateData } from "../../features/assessments/types";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";

export function CourseBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const course = useAppSelector((state) => state.courses.currentCourse);
  const isLoading = useAppSelector((state) => state.courses.isLoading);

  const [expandedModules, setExpandedModules] = useState<Set<string | number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string | number>>(new Set());
  const [expandedContentItems, setExpandedContentItems] = useState<Set<string | number>>(new Set());
  const [pendingModuleQuizzes, setPendingModuleQuizzes] = useState<Record<string | number, LocalAssessmentTemplate>>({});
  const [pendingFinalAssessment, setPendingFinalAssessment] = useState<LocalAssessmentTemplate | null>(null);
  const [hasLocalUnpublishedChanges, setHasLocalUnpublishedChanges] = useState(false);

  const makeLocalQuestionId = () => `local-question-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Keep a ref mirror so async callbacks can read & restore the expanded state
  // even after a fetchCourseDetails re-fetch resets the component.
  const expandedModulesRef = useRef<Set<string | number>>(new Set());
  const expandedSectionsRef = useRef<Set<string | number>>(new Set());

  // Helper: dispatch fetchCourseDetails while preserving expanded state
  const refetchCourse = async (courseId: string | number) => {
    // Snapshot current expansion before the async call
    const savedModules = new Set(expandedModulesRef.current);
    const savedSections = new Set(expandedSectionsRef.current);
    await dispatch(fetchCourseDetails(courseId));
    // Re-apply after the store update triggers a re-render
    setExpandedModules(savedModules);
    setExpandedSections(savedSections);
  };

  const [showContentItemModal, setShowContentItemModal] = useState(false);
  const [editingContentItem, setEditingContentItem] = useState<{
    moduleId: string | number;
    sectionId: string | number;
    contentItem: ContentItem | null;
  } | null>(null);

  const [showAssessmentModal, setShowAssessmentModal] = useState<{
    type: 'module' | 'final';
    moduleId?: string | number;
    assessmentId?: string | number;
    question?: QuizQuestion;
  } | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string, payload: any } | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ type: 'final' | 'module', questionId: any, moduleId?: string | number } | null>(null);
  const [showFinalAssessmentSettings, setShowFinalAssessmentSettings] = useState<'create' | 'edit' | null>(null);
  const [showAssessmentLibraryPicker, setShowAssessmentLibraryPicker] = useState<{
    type: 'module' | 'final';
    moduleId?: string | number;
  } | null>(null);
  const hasInitializedExpansion = useRef(false);

  useEffect(() => {
    if (id && id !== "temp-id") {
      dispatch(fetchCourseDetails(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (course && course.modules && course.modules.length > 0 && !hasInitializedExpansion.current) {
      setExpandedModules(new Set([course.modules[0].id]));
      hasInitializedExpansion.current = true;
    }
  }, [course]);

  if (!course && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Course not found</h2>
        <button onClick={() => navigate("/admin/courses")} className="text-indigo-600 hover:underline">Back to Courses</button>
      </div>
    );
  }

  const toggleModule = (moduleId: string | number) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    expandedModulesRef.current = next;
    setExpandedModules(next);
  };

  const toggleSection = (sectionId: string | number) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    expandedSectionsRef.current = next;
    setExpandedSections(next);
  };

  const toggleContentItem = (itemId: string | number) => {
    const next = new Set(expandedContentItems);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setExpandedContentItems(next);
  };

  const handleAddModule = async () => {
    try {
      const nextOrder = (course.modules?.length || 0) > 0 ? Math.max(...(course.modules || []).map(m => m.order)) + 1 : 1;
      const res = await dispatch(createModule({
        courseId: course.id,
        data: { title: "New Module", order: nextOrder, sections: [], has_unpublished_changes: true }
      })).unwrap();
      const next = new Set(expandedModules);
      next.add(res.data.id);
      expandedModulesRef.current = next;
      setExpandedModules(next);
      toast.success("Module created successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create module");
    }
  };

  const handleUpdateModuleTitle = async (moduleId: string | number, title: string) => {
    const module = course.modules?.find(m => m.id === moduleId);
    if (module) {
      try {
        await dispatch(updateModule({ courseId: course.id, moduleId, data: { title, order: module.order } })).unwrap();
        toast.success("Module title updated");
      } catch (e: any) {
        toast.error(e?.message || "Failed to update module");
      }
    }
  };

  const handleDeleteModule = (moduleId: string | number) => {
    setDeleteTarget({ type: 'module', payload: { moduleId } });
  };

  const createModuleQuiz = async (moduleId: string | number) => {
    const module = course.modules?.find(m => m.id === moduleId);
    if (!module) return;

    try {
      // Create a backend assessment attached to this module
      const payload: AssessmentCreateData = {
        course: course.id,
        module: moduleId,
        title: `Quiz: ${module.title}`,
        is_final: false,
        assessment_type: "QUIZ",
        pass_mark: 60,
        max_attempts: 3,
        duration: 30,
      };

      const response = await dispatch(createAssessment(payload)).unwrap();
      const created = response?.data || response;

      const template = createLocalAssessmentTemplate({
        title: created.title || `Quiz: ${module.title}`,
        assessment_type: "QUIZ",
        pass_mark: created.pass_mark ?? 60,
        max_attempts: created.max_attempts ?? 3,
        duration: created.duration ?? 30,
      }, String(created.id));

      setPendingModuleQuizzes((prev) => ({
        ...prev,
        [moduleId]: template,
      }));
      setShowAssessmentModal({ type: 'module', moduleId, assessmentId: template.id });
      toast.success("Quiz created on backend and ready to edit.");
      setShowAssessmentLibraryPicker(null);
    } catch (e: any) {
      toast.error(e?.message || e || "Failed to create quiz template");
    }
  };

  const ensureFinalAssessmentTemplate = (forceCreate = false): LocalAssessmentTemplate | null => {
    if (pendingFinalAssessment && !forceCreate) return pendingFinalAssessment;
    if (!course.final_assessment) return null;

    const item: AssessmentLibraryItem = {
      id: course.final_assessment.id,
      title: course.final_assessment.title || "Final Assessment",
      assessment_type: course.final_assessment.assessment_type || "FINAL",
      pass_mark: course.final_assessment.pass_mark,
      max_attempts: course.final_assessment.max_attempts,
      duration: course.final_assessment.duration,
      tab_switch_enabled: course.final_assessment.tab_switch_enabled,
      tab_switch_limit: course.final_assessment.tab_switch_limit,
      descriptions: course.final_assessment.descriptions,
      instructions: course.final_assessment.instructions,
      questions: course.final_assessment.questions || [],
      source: "course",
      courseId: course.id,
      courseTitle: course.title,
    };

    const template = cloneAssessmentIntoLocalTemplate(item);
    setPendingFinalAssessment(template);
    return template;
  };

  const ensureModuleQuizTemplate = (moduleId: string | number): LocalAssessmentTemplate | null => {
    const existing = pendingModuleQuizzes[moduleId];
    if (existing) return existing;

    const module = course.modules?.find((m) => m.id === moduleId);
    if (!module?.quiz) return null;

    const item: AssessmentLibraryItem = {
      id: module.quiz.id,
      title: module.quiz.title || `Quiz: ${module.title}`,
      assessment_type: module.quiz.assessment_type || "QUIZ",
      pass_mark: module.quiz.pass_mark,
      max_attempts: module.quiz.max_attempts,
      duration: module.quiz.duration,
      descriptions: module.quiz.descriptions,
      instructions: module.quiz.instructions,
      questions: module.quiz.questions || [],
      source: "course",
      courseId: course.id,
      courseTitle: course.title,
      moduleId: module.id,
      moduleTitle: module.title,
    };

    const template = cloneAssessmentIntoLocalTemplate(item);
    setPendingModuleQuizzes((prev) => ({
      ...prev,
      [moduleId]: template,
    }));
    return template;
  };

  const toggleModuleQuiz = async (moduleId: string | number) => {
    const module = course.modules?.find(m => m.id === moduleId);
    const isEnabled = Boolean(pendingModuleQuizzes[moduleId] || module?.quiz);

    if (isEnabled && module?.quiz) {
      try {
        await dispatch(detachAssessment({
          assessmentId: module.quiz.id,
          payload: { module_id: moduleId },
        })).unwrap();
        setPendingModuleQuizzes((prev) => {
          const next = { ...prev };
          delete next[moduleId];
          return next;
        });
        await dispatch(fetchCourseDetails(course.id));
        toast.success("Module quiz detached.");
      } catch (e: any) {
        toast.error(e?.message || "Failed to detach module quiz");
      }
      return;
    }

    setShowAssessmentLibraryPicker({ type: 'module', moduleId });
  };

  const handleUseAssessmentFromLibrary = async (item: AssessmentLibraryItem) => {
    if (!showAssessmentLibraryPicker) return;

    try {
      if (showAssessmentLibraryPicker.type === 'module' && showAssessmentLibraryPicker.moduleId !== undefined) {
        await dispatch(attachAssessment({
          assessmentId: item.id,
          payload: { module_id: showAssessmentLibraryPicker.moduleId },
        })).unwrap();
        await dispatch(fetchCourseDetails(course.id));
        setPendingModuleQuizzes((prev) => {
          const next = { ...prev };
          delete next[showAssessmentLibraryPicker.moduleId!];
          return next;
        });
        toast.success("Quiz attached to this module");
      } else {
        await dispatch(attachAssessment({
          assessmentId: item.id,
          payload: { course_id: course.id },
        })).unwrap();
        await dispatch(fetchCourseDetails(course.id));
        setPendingFinalAssessment(null);
        toast.success("Final assessment attached to this course");
      }

      setShowAssessmentLibraryPicker(null);
    } catch (e: any) {
      toast.error(e?.message || e || "Failed to copy assessment");
    }
  };

  const handleAddSection = async (moduleId: string | number) => {
    const module = course.modules?.find(m => m.id === moduleId);
    if (module) {
      const nextOrder = module.sections.length > 0 ? Math.max(...module.sections.map(s => s.order)) + 1 : 1;
      try {
        await dispatch(createSection({
          moduleId,
          data: { title: "New Section", order: nextOrder, contents: [], has_unpublished_changes: true }
        })).unwrap();
        toast.success("Section added successfully");
      } catch (e: any) {
        toast.error(e?.message || "Failed to add section");
      }
    }
  };

  const handleUpdateSectionTitle = async (moduleId: string | number, sectionId: string | number, title: string) => {
    const module = course.modules?.find(m => m.id === moduleId);
    const section = module?.sections.find(s => s.id === sectionId);
    if (section) {
      try {
        await dispatch(updateSection({ courseId: course.id, moduleId, sectionId, data: { title, order: section.order } })).unwrap();
        toast.success("Section title updated");
      } catch (e: any) {
        toast.error(e?.message || "Failed to update section");
      }
    }
  };

  const handleDeleteSection = (moduleId: string | number, sectionId: string | number) => {
    setDeleteTarget({ type: 'section', payload: { moduleId, sectionId } });
  };

  const openContentItemModal = (moduleId: string | number, sectionId: string | number, contentItem: ContentItem | null = null) => {
    setEditingContentItem({ moduleId, sectionId, contentItem });
    setShowContentItemModal(true);
  };

  const saveContentItem = async (data: any) => {
    if (!editingContentItem) return;
    const { moduleId, sectionId, contentItem } = editingContentItem;

    const module = course.modules?.find(m => m.id === moduleId);
    const section = module?.sections.find(s => s.id === sectionId);
    const nextOrder = section ? (section.contents.length > 0 ? Math.max(...section.contents.map(c => c.order)) + 1 : 1) : 1;

    const contentData: any = {
      title: data.title,
      order: contentItem?.order || nextOrder,
      content_type: 'text',
      text_content: JSON.stringify(data.blocks),
      has_unpublished_changes: true
    };

    try {
      if (contentItem) {
        await dispatch(updateContent({
          courseId: course.id,
          moduleId,
          sectionId,
          contentId: contentItem.id,
          data: contentData
        })).unwrap();
        toast.success("Content updated successfully");
      } else {
        await dispatch(createContent({
          courseId: course.id,
          moduleId,
          sectionId,
          data: contentData
        })).unwrap();
        toast.success("Content added successfully");
      }
      refetchCourse(course.id);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save content");
    }

    setShowContentItemModal(false);
    setEditingContentItem(null);
  };

  const handleDeleteContentItem = (moduleId: string | number, sectionId: string | number, contentItemId: string | number) => {
    setDeleteTarget({ type: 'content', payload: { moduleId, sectionId, contentItemId } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { type, payload } = deleteTarget;
      if (type === 'module') {
        await dispatch(deleteModule({ courseId: course.id, moduleId: payload.moduleId })).unwrap();
        toast.success("Module deleted successfully");
      } else if (type === 'section') {
        await dispatch(deleteSection({ courseId: course.id, moduleId: payload.moduleId, sectionId: payload.sectionId })).unwrap();
        toast.success("Section deleted successfully");
      } else if (type === 'content') {
        await dispatch(deleteContent({ courseId: course.id, moduleId: payload.moduleId, sectionId: payload.sectionId, contentId: payload.contentItemId })).unwrap();
        toast.success("Content item deleted successfully");
      }
      refetchCourse(course.id);
    } catch (e: any) {
      toast.error(e?.message || `Failed to delete ${deleteTarget.type}`);
    }
    setDeleteTarget(null);
  };

  const saveAssessment = async (data: QuizQuestion) => {
    if (!course) return;

    try {
      let templateId: string | number | undefined = showAssessmentModal?.assessmentId;

      if (!templateId) {
        if (showAssessmentModal?.type === "final") {
          const template = createLocalAssessmentTemplate({
            title: "Final Assessment",
            assessment_type: "FINAL",
            pass_mark: 60,
            max_attempts: 3,
            duration: 60,
          });
          templateId = template.id;
          setPendingFinalAssessment(template);
        } else {
          const moduleId = showAssessmentModal?.moduleId;
          const module = course.modules?.find(m => m.id === moduleId);
          const template = createLocalAssessmentTemplate({
            title: `Quiz: ${module?.title || "New Quiz"}`,
            assessment_type: "QUIZ",
            pass_mark: 60,
            max_attempts: 3,
            duration: 30,
          });
          templateId = template.id;
          if (moduleId) {
            setPendingModuleQuizzes((prev) => ({
              ...prev,
              [moduleId]: template,
            }));
          }
        }
        setShowAssessmentModal((prev) => prev ? { ...prev, assessmentId: templateId } : prev);
      }

      if (templateId) {
        const questionId = data.id || makeLocalQuestionId();
        let existingTemplate: AssessmentLibraryItem | LocalAssessmentTemplate | null = getLocalAssessmentTemplates().find((item) => String(item.id) === String(templateId)) || null;

        if (!existingTemplate) {
          if (showAssessmentModal?.type === 'final') {
            const template = ensureFinalAssessmentTemplate(true);
            if (template) {
              templateId = template.id;
              existingTemplate = template;
              setShowAssessmentModal((prev) => prev ? { ...prev, assessmentId: templateId } : prev);
            }
          } else if (showAssessmentModal?.moduleId) {
            const template = ensureModuleQuizTemplate(showAssessmentModal.moduleId);
            if (template) {
              templateId = template.id;
              existingTemplate = template;
              setShowAssessmentModal((prev) => prev ? { ...prev, assessmentId: templateId } : prev);
            }
          }
        }

        const existingQuestions = existingTemplate?.questions || [];
        const nextQuestion = {
          ...data,
          id: questionId,
          question_text: data.question || data.question_text,
          question_type: (data.question_type || "single") as any,
          marks: data.marks || 1,
          options: data.question_type === "matching" ? [] : data.options || data.choices?.map((opt: any) => opt.text) || [],
          choices: data.question_type === "matching" ? [] : data.choices || data.options?.map((opt: any) => ({ text: String(opt.text || ""), is_correct: Boolean(opt.is_correct) })) || [],
          matching_pairs: data.question_type === "matching" ? data.matching_pairs || [] : undefined,
          correctAnswer: data.question_type === "matching" ? -1 : data.choices ? data.choices.findIndex((choice: any) => choice.is_correct) : data.options ? data.options.findIndex((opt: any) => opt.isCorrect) : -1,
        };

        const nextQuestions = existingQuestions.some((item) => String(item.id) === String(questionId))
          ? existingQuestions.map((item) => (String(item.id) === String(questionId) ? nextQuestion : item))
          : [...existingQuestions, nextQuestion];

        // If the template id is a backend id (not a local- prefix), persist the question to backend
        if (templateId && !String(templateId).startsWith("local-")) {
          const payload: any = {
            assessment: templateId,
            question_text: nextQuestion.question_text,
            question_type: nextQuestion.question_type === "multiple" ? "multiple" : nextQuestion.question_type === "matching" ? "matching" : "single",
            marks: nextQuestion.marks || 1,
          };

          if (nextQuestion.question_type === "matching") {
            payload.matching_pairs = nextQuestion.matching_pairs || [];
          } else {
            payload.choices = (nextQuestion.choices && nextQuestion.choices.length > 0)
              ? nextQuestion.choices.map((choice: any) => ({ text: String(choice.text || ""), is_correct: Boolean(choice.is_correct) }))
              : (nextQuestion.options || []).map((option: any, index: number) => ({ text: String(option || ""), is_correct: index === nextQuestion.correctAnswer }));
          }

          try {
            const isExistingQuestion = !String(questionId).startsWith("local-")
              && existingQuestions.some((item) => String(item.id) === String(questionId));
            const response = isExistingQuestion
              ? await dispatch(updateQuestion({ questionId, data: payload })).unwrap()
              : await dispatch(addQuestion(payload)).unwrap();

            if (isExistingQuestion && course.is_published) {
              setHasLocalUnpublishedChanges(true);
            }

            await refetchCourse(course.id);
            if (showAssessmentModal?.type === 'final') {
              setPendingFinalAssessment(null);
            } else if (showAssessmentModal?.moduleId) {
              setPendingModuleQuizzes((prev) => {
                const next = { ...prev };
                delete next[showAssessmentModal.moduleId!];
                return next;
              });
            }
          } catch (err: any) {
            toast.error(err?.message || 'Failed to save question');
            return;
          }
        } else {
          const updatedTemplate = updateLocalAssessmentTemplate(String(templateId), { questions: nextQuestions });

          if (showAssessmentModal?.type === 'final') {
            setPendingFinalAssessment(updatedTemplate as LocalAssessmentTemplate);
          } else if (showAssessmentModal?.moduleId) {
            setPendingModuleQuizzes((prev) => ({
              ...prev,
              [showAssessmentModal.moduleId!]: updatedTemplate as LocalAssessmentTemplate,
            }));
          }
        }
      }

      toast.success("Question saved successfully.");
    } catch (err: any) {
      console.error("Assessment Error:", err);
      toast.error(typeof err === 'string' ? err : 'Failed to save question');
    }
    setShowAssessmentModal(null);
  };

  /**
   * Called from FinalAssessmentSettingsModal when creating the final assessment for the first time.
   * Creates the assessment with the chosen settings, then opens the question editor.
   */
  const handleCreateFinalAssessmentWithSettings = async (settings: { duration: number; max_attempts: number; pass_mark: number; tab_switch_enabled?: boolean; tab_switch_limit?: number }) => {
    try {
      // Create final assessment as a backend record attached to this course
      const payload: AssessmentCreateData = {
        course: course.id,
        module: null,
        title: "Final Assessment",
        is_final: true,
        assessment_type: "FINAL",
        pass_mark: settings.pass_mark,
        max_attempts: settings.max_attempts,
        duration: settings.duration,
        tab_switch_enabled: settings.tab_switch_enabled,
        tab_switch_limit: settings.tab_switch_limit,
      };

      const response = await dispatch(createAssessment(payload)).unwrap();
      const created = response?.data || response;

      const template = createLocalAssessmentTemplate({
        title: created.title || "Final Assessment",
        assessment_type: "FINAL",
        pass_mark: created.pass_mark ?? settings.pass_mark,
        max_attempts: created.max_attempts ?? settings.max_attempts,
        duration: created.duration ?? settings.duration,
        tab_switch_enabled: created.tab_switch_enabled ?? settings.tab_switch_enabled,
        tab_switch_limit: created.tab_switch_limit ?? settings.tab_switch_limit,
      }, String(created.id));

      setPendingFinalAssessment(template);
      toast.success("Final assessment created on backend and ready to edit!");
      setShowAssessmentModal({ type: 'final', assessmentId: template.id });
    } catch (e: any) {
      toast.error(e?.message || e || "Failed to create final assessment");
      throw e;
    } finally {
      setShowFinalAssessmentSettings(null);
    }
  };

  /**
   * Called from FinalAssessmentSettingsModal when editing an existing final assessment's settings.
   */
  const handleUpdateFinalAssessmentSettings = async (settings: { duration: number; max_attempts: number; pass_mark: number; tab_switch_enabled?: boolean; tab_switch_limit?: number }) => {
    if (pendingFinalAssessment) {
      const updatedTemplate = updateLocalAssessmentTemplate(String(pendingFinalAssessment.id), {
        pass_mark: settings.pass_mark,
        max_attempts: settings.max_attempts,
        duration: settings.duration,
        tab_switch_enabled: settings.tab_switch_enabled,
        tab_switch_limit: settings.tab_switch_limit,
      });
      setPendingFinalAssessment(updatedTemplate as LocalAssessmentTemplate);
      toast.success("Assessment settings updated!");
      setShowFinalAssessmentSettings(null);
      return;
    }

    const template = ensureFinalAssessmentTemplate();
    if (!template) return;

    const updatedTemplate = updateLocalAssessmentTemplate(String(template.id), {
      pass_mark: settings.pass_mark,
      max_attempts: settings.max_attempts,
      duration: settings.duration,
      tab_switch_enabled: settings.tab_switch_enabled,
      tab_switch_limit: settings.tab_switch_limit,
    });
    setPendingFinalAssessment(updatedTemplate as LocalAssessmentTemplate);
    toast.success("Assessment settings updated!");
    setShowFinalAssessmentSettings(null);
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    try {
      await dispatch(unpublishCourse(course.id)).unwrap();
      toast.success("Course unpublished successfully");
      dispatch(fetchCourseDetails(course.id));
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Failed to unpublish course');
    } finally {
      setIsUnpublishing(false);
      setShowUnpublishModal(false);
    }
  };

  const deleteQuestion = (type: 'final' | 'module', questionId: any, moduleId?: string | number) => {
    setDeleteQuestionTarget({ type, questionId, moduleId });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionTarget) return;
    const { type, questionId, moduleId } = deleteQuestionTarget;
    try {
      const localFinalQuestionExists = pendingFinalAssessment?.questions.some((q) => String(q.id) === String(questionId));
      const localModuleTemplate = moduleId ? pendingModuleQuizzes[moduleId] : undefined;
      const localModuleQuestionExists = localModuleTemplate?.questions.some((q) => String(q.id) === String(questionId));

      if (!String(questionId).startsWith('local-')) {
        await dispatch(deleteQuestionAction(questionId)).unwrap();
        setHasLocalUnpublishedChanges(true);
        await refetchCourse(course.id);

        if (type === 'final') {
          setPendingFinalAssessment(null);
        } else if (moduleId) {
          setPendingModuleQuizzes((prev) => {
            const next = { ...prev };
            delete next[moduleId];
            return next;
          });
        }

        toast.success('Question deleted successfully');
        setDeleteQuestionTarget(null);
        return;
      }

      if (localFinalQuestionExists && type === 'final') {
        setPendingFinalAssessment((prev) => prev ? {
          ...prev,
          questions: prev.questions.filter((q) => String(q.id) !== String(questionId)),
        } : prev);
        toast.success('Question deleted successfully');
      } else if (localModuleQuestionExists && type === 'module' && moduleId) {
        setPendingModuleQuizzes((prev) => {
          const next = { ...prev };
          const template = next[moduleId];
          if (template) {
            next[moduleId] = {
              ...template,
              questions: template.questions.filter((q) => String(q.id) !== String(questionId)),
            };
          }
          return next;
        });
        toast.success('Question deleted successfully');
      } else if (type === 'final' && course.final_assessment?.questions.some((q) => String(q.id) === String(questionId))) {
        const template = ensureFinalAssessmentTemplate(true);
        if (template) {
          setPendingFinalAssessment((prev) => prev ? {
            ...prev,
            questions: prev.questions.filter((q) => String(q.id) !== String(questionId)),
          } : prev);
          toast.success('Question deleted successfully');
        } else {
          toast.error('Failed to delete question');
        }
      } else if (type === 'module' && moduleId) {
        const module = course.modules?.find(m => m.id === moduleId);
        if (module?.quiz?.questions.some((q) => String(q.id) === String(questionId))) {
          const template = ensureModuleQuizTemplate(moduleId);
          if (template) {
            setPendingModuleQuizzes((prev) => ({
              ...prev,
              [moduleId]: {
                ...template,
                questions: template.questions.filter((q) => String(q.id) !== String(questionId)),
              },
            }));
            toast.success('Question deleted successfully');
          } else {
            toast.error('Failed to delete question');
          }
        } else {
          toast.error('Failed to delete question');
        }
      } else {
        toast.error('Failed to delete question');
      }
    } catch (err: any) {
      toast.error('Failed to delete question');
    }
    setDeleteQuestionTarget(null);
  };

  const handlePublish = () => {
    const finalAssessmentQuestionCount = pendingFinalAssessment?.questions.length ?? course.final_assessment?.questions?.length ?? 0;
    if (!course.modules || course.modules.length === 0) {
      setStatus({ type: 'error', message: 'Add at least one module before publishing.' });
      return;
    }
    if (finalAssessmentQuestionCount === 0) {
      setStatus({ type: 'error', message: 'Final Assessment is required.' });
      return;
    }

    if (course.is_published) {
      dispatch(publishCourseChanges(course.id)).then((res) => {
        if (res.meta.requestStatus === 'fulfilled') {
          setHasLocalUnpublishedChanges(false);
          setStatus({ type: 'success', message: 'Course changes published successfully!' });
          dispatch(fetchCourseDetails(course.id));
        }
      });
    } else {
      dispatch(publishCourse(course.id)).then((res) => {
        if (res.meta.requestStatus === 'fulfilled') {
          setStatus({ type: 'success', message: 'Course published successfully!' });
          dispatch(fetchCourseDetails(course.id));
        }
      });
    }
  };

  const finalAssessmentQuestionCount = pendingFinalAssessment?.questions.length ?? course.final_assessment?.questions?.length ?? 0;
  const activeFinalAssessment = pendingFinalAssessment || course.final_assessment || null;
  const canPublish = (course.modules?.length || 0) > 0 && finalAssessmentQuestionCount > 0;

  return (
    <div className="max-w-[1200px] mx-auto pb-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <button
          onClick={() => navigate("/admin/courses")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Courses</span>
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 flex flex-wrap items-center gap-2">
              <span>{course.title}</span>
              {course.is_published ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Draft
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              Build and manage your course content
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Eye className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-medium">Preview</span>
            </button>

            {course.is_published && (
              <button
                disabled={isUnpublishing}
                onClick={() => setShowUnpublishModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUnpublishing ? (
                  <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
                <span>Unpublish</span>
              </button>
            )}

            <button
              onClick={handlePublish}
              disabled={!canPublish}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold shadow-lg cursor-pointer ${canPublish
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {course.is_published
                ? (course.has_unpublished_changes || hasLocalUnpublishedChanges ? "Update Live Course" : "Published")
                : "Publish Course"}
            </button>
          </div>
        </div>
      </div>

      {course.is_published && (course.has_unpublished_changes || hasLocalUnpublishedChanges) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex gap-3 items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                You have unpublished draft changes
              </h3>
              <p className="text-xs text-amber-800">
                You've made modifications to modules, sections, or content items. Click "Publish Changes" to apply these draft changes to live students.
              </p>
            </div>
          </div>
        </div>
      )}

      {!course.is_published && !canPublish && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2 duration-300">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-900 mb-1">
                Complete these requirements to publish:
              </h3>
              <ul className="text-xs text-yellow-800 space-y-1">
                {(!course.modules || course.modules.length === 0) && <li>• Add at least one module</li>}
                {finalAssessmentQuestionCount === 0 && (
                  <li>• Create final assessment with at least one question</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Main Builder Area */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Curriculum</h2>
          <button
            onClick={handleAddModule}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-semibold cursor-pointer border border-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>

        {!course.modules || course.modules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 italic">No modules added yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {course.modules.map((module, mIndex) => {
              const moduleQuizTemplate = pendingModuleQuizzes[module.id];
              return (
                <div key={module.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${module.pending_delete ? 'opacity-65 border-red-200 bg-red-50/5' : ''}`}>
                  <div className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                    >
                      {expandedModules.has(module.id) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${module.pending_delete ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className={`flex-1 flex items-center gap-2 ${module.pending_delete ? 'line-through text-gray-400' : ''}`}>
                        <EditableTitle
                          initialTitle={module.title}
                          onSave={(val) => handleUpdateModuleTitle(module.id, val)}
                          prefix={`Module ${mIndex + 1}:`}
                        />
                        {module.pending_delete ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                            Pending Delete
                          </span>
                        ) : course.is_published && module.has_unpublished_changes ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                            Modified
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Quiz</span>
                        <button
                          onClick={() => toggleModuleQuiz(module.id)}
                          disabled={!!module.pending_delete}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all cursor-pointer ${(moduleQuizTemplate || module.quiz) ? "bg-blue-600" : "bg-gray-200"} ${module.pending_delete ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${(moduleQuizTemplate || module.quiz) ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      <button
                        onClick={() => handleAddSection(module.id)}
                        disabled={!!module.pending_delete}
                        className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg disabled:opacity-30 disabled:hover:text-gray-400"
                        title="Add Section"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        disabled={!!module.pending_delete}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg disabled:opacity-30 disabled:hover:text-gray-400"
                        title="Delete Module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {expandedModules.has(module.id) && (
                    <div className="p-4 bg-white space-y-4 border-t border-gray-50">
                      {module.sections.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 italic text-sm border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                          No sections in this module yet. Click the "+" icon to add a section.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {module.sections.map((section, sIndex) => (
                            <div key={section.id} className={`border border-gray-100 rounded-lg overflow-hidden transition-all duration-300 ${section.pending_delete ? 'opacity-65 border-red-200 bg-red-50/5' : ''}`}>
                              <div className="p-3 bg-gray-50/50 flex items-center gap-3">
                                <div className={`flex items-center flex-1 w-full gap-2 ${section.pending_delete ? 'line-through text-gray-400' : ''}`}>
                                  <EditableTitle
                                    initialTitle={section.title}
                                    onSave={(val) => handleUpdateSectionTitle(module.id, section.id, val)}
                                    prefix={`Section ${sIndex + 1}:`}
                                  />
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openContentItemModal(module.id, section.id)}
                                    disabled={!!module.pending_delete || !!section.pending_delete}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                    title="Add Content"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSection(module.id, section.id)}
                                    disabled={!!module.pending_delete || !!section.pending_delete}
                                    className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-400"
                                    title="Delete Section"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(moduleQuizTemplate || module.quiz) && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                  <CircleCheckBig className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-sm font-bold ${module.quiz?.pending_delete ? 'line-through text-gray-400' : 'text-gray-900'}`}>Module Quiz</h4>
                                  </div>
                                  <p className="text-[10px] text-gray-500">Assess students' understanding of this module</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setShowAssessmentModal({ type: 'module', moduleId: module.id, assessmentId: moduleQuizTemplate?.id })}
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-bold transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Add Question
                              </button>
                            </div>

                            {(!(moduleQuizTemplate || module.quiz) || (moduleQuizTemplate || module.quiz).questions.length === 0) ? (
                              <div className="text-center py-6 bg-white/50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-xs text-gray-400 italic">No questions added to this quiz yet.</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {(moduleQuizTemplate || module.quiz).questions.map((q, qIdx) => (
                                  <div key={q.id || qIdx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 group">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex-shrink-0">{qIdx + 1}</span>
                                      <span className="text-xs text-gray-700 truncate">{q.question_text || q.question}</span>
                                    </div>
                                    <div className="flex items-center gap-1 transition-all">
                                      <button
                                        onClick={() => setShowAssessmentModal({ type: 'module', moduleId: module.id, assessmentId: moduleQuizTemplate?.id, question: q })}
                                        className="p-1.5 text-gray-400 hover:text-blue-500"
                                        title="Edit Question"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => deleteQuestion('module', q.id, module.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500"
                                        title="Delete Question"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Final Assessment */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Final Assessment
              <span className="ml-2 text-sm font-normal text-red-600">
                (Required to publish)
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeFinalAssessment?.questions?.length || 0} question{(activeFinalAssessment?.questions?.length || 0) !== 1 ? "s" : ""} added
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Show settings badges if final assessment exists */}
            {activeFinalAssessment && (
              <div className="flex items-center gap-1.5 mr-1">
                {activeFinalAssessment.duration != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <Clock className="w-3 h-3" />
                    {activeFinalAssessment.duration}m
                  </span>
                )}
                {activeFinalAssessment.max_attempts != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <RefreshCw className="w-3 h-3" />
                    {activeFinalAssessment.max_attempts}x
                  </span>
                )}
                {activeFinalAssessment.tab_switch_enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                    <ShieldCheck className="w-3 h-3 text-orange-500" />
                    {activeFinalAssessment.tab_switch_limit ?? 0}
                  </span>
                )}
                <button
                  onClick={() => setShowFinalAssessmentSettings('edit')}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                  title="Edit Assessment Settings"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {activeFinalAssessment && (
              <button
                onClick={async () => {
                  const finalAssessmentToDetach = pendingFinalAssessment || course.final_assessment;
                  if (!finalAssessmentToDetach) return;

                  try {
                    await dispatch(detachAssessment({
                      assessmentId: finalAssessmentToDetach.id,
                      payload: { course_id: course.id },
                    })).unwrap();
                    setPendingFinalAssessment(null);
                    await dispatch(fetchCourseDetails(course.id));
                    toast.success("Final assessment detached from this course.");
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to detach final assessment");
                  }
                }}
                className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Detach final assessment"
                aria-label="Detach final assessment"
              >
                <Unlink2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (!activeFinalAssessment) {
                  // No assessment record exists yet — create one first
                  setShowFinalAssessmentSettings('create');
                } else {
                  // Assessment record already exists, even if it has no questions yet
                  setShowAssessmentModal({ type: 'final', assessmentId: activeFinalAssessment.id });
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {activeFinalAssessment ? "Add Question" : "Create Assessment"}
            </button>
            {!activeFinalAssessment && (
              <button
                onClick={() => setShowAssessmentLibraryPicker({ type: 'final' })}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <CircleCheckBig className="w-5 h-5" />
                Use Existing
              </button>
            )}
          </div>
        </div>

        {(!activeFinalAssessment || (activeFinalAssessment?.questions?.length || 0) === 0) ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">
              No assessment questions yet
            </p>
            <p className="text-sm text-gray-500">
              Create a final assessment to complete your course
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeFinalAssessment?.questions?.map((q, idx) => (
              <div key={q.id || idx} className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-amber-100 transition-all">
                <span className="text-sm text-gray-700 truncate pr-4">{idx + 1}. {q.question_text || q.question}</span>
                <div className="flex items-center gap-1 transition-all">
                  <button
                    onClick={() => setShowAssessmentModal({ type: 'final', assessmentId: activeFinalAssessment?.id, question: q })}
                    className="p-1.5 text-gray-400 hover:text-blue-500"
                    title="Edit Question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteQuestion('final', q.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showContentItemModal && (
        <LessonModal
          lesson={editingContentItem?.contentItem ? {
            id: editingContentItem.contentItem.id as any,
            title: editingContentItem.contentItem.title,
            order: editingContentItem.contentItem.order,
            course: course.id as any,
            blocks: (() => {
              const item = editingContentItem.contentItem as any;
              if (item.contents?.length > 0) return item.contents.map((b: any) => ({ id: b.id, type: b.type, content: b.content, link: b.link }));

              const text = item.text_content;
              if (text && (text.startsWith('[') || text.startsWith('{'))) {
                try {
                  const parsed = JSON.parse(text);
                  return Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) { }
              }

              return [{
                id: 'main',
                type: item.content_type || 'text',
                content: text || item.video_url || item.file || ''
              }];
            })()
          } : null}
          courseId={course.id as any}
          totalLessons={0}
          onClose={() => { setShowContentItemModal(false); setEditingContentItem(null); }}
          onSave={saveContentItem}
        />
      )}

      {showAssessmentLibraryPicker && (
        <AssessmentLibraryPickerModal
          type={showAssessmentLibraryPicker.type === 'module' ? "QUIZ" : "FINAL"}
          onClose={() => setShowAssessmentLibraryPicker(null)}
          onCreateNew={() => {
            if (showAssessmentLibraryPicker.type === 'module' && showAssessmentLibraryPicker.moduleId) {
              createModuleQuiz(showAssessmentLibraryPicker.moduleId);
            } else {
              setShowAssessmentLibraryPicker(null);
              setShowFinalAssessmentSettings('create');
            }
          }}
          onUseExisting={handleUseAssessmentFromLibrary}
        />
      )}

      {showAssessmentModal && (
        <AssessmentModal
          onClose={() => setShowAssessmentModal(null)}
          onSave={saveAssessment}
          initialQuestion={showAssessmentModal.question}
        />
      )}

      {showFinalAssessmentSettings === 'create' && (
        <FinalAssessmentSettingsModal
          isCreating
          onClose={() => setShowFinalAssessmentSettings(null)}
          onConfirm={handleCreateFinalAssessmentWithSettings}
        />
      )}

      {showFinalAssessmentSettings === 'edit' && (
        <FinalAssessmentSettingsModal
          initialValues={{
            duration: activeFinalAssessment?.duration,
            max_attempts: activeFinalAssessment?.max_attempts,
            pass_mark: activeFinalAssessment?.pass_mark,
            tab_switch_enabled: pendingFinalAssessment?.tab_switch_enabled,
            tab_switch_limit: pendingFinalAssessment?.tab_switch_limit,
          }}
          onClose={() => setShowFinalAssessmentSettings(null)}
          onConfirm={handleUpdateFinalAssessmentSettings}
        />
      )}

      {showPreviewModal && <CoursePreviewModal course={course} onClose={() => setShowPreviewModal(false)} />}

      {status && <StatusModal isOpen={!!status} type={status.type} title={status.type === "success" ? "Done" : "Error"} description={status.message} onClose={() => setStatus(null)} />}

      <DeleteModal
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.type}`}
        description={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <DeleteModal
        isOpen={!!deleteQuestionTarget}
        title="Delete Question"
        description="Are you sure you want to delete this question? This action cannot be undone."
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setDeleteQuestionTarget(null)}
      />

      {showUnpublishModal && (
        <DeleteModal
          isOpen={showUnpublishModal}
          title="Unpublish Course?"
          description="This course will no longer be visible to students in the catalog. Enrolled students may still be able to see it depending on your settings."
          onConfirm={handleUnpublish}
          onCancel={() => setShowUnpublishModal(false)}
          confirmText="Unpublish"
        />
      )}
    </div>
  );
}

function EditableTitle({
  initialTitle,
  onSave,
  prefix,
  className
}: {
  initialTitle: string;
  onSave: (val: string) => void;
  prefix?: string;
  className?: string;
}) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  return (
    <div className="flex items-center flex-1 w-full">
      {prefix && <span className="font-semibold pr-1 whitespace-nowrap">{prefix}</span>}
      <input
        type="text"
        value={title}
        onChange={handleChange}
        onBlur={() => { if (title !== initialTitle) onSave(title); }}
        className={className || "w-full flex-1 bg-transparent border border-transparent rounded-md focus:border-blue-500 focus:ring-[1px] focus:ring-blue-500 font-semibold text-gray-800 px-1 py-1 outline-none"}
      />
    </div>
  );
}
