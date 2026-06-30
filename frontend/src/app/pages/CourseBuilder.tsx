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
} from "lucide-react";

import StatusModal from "../components/ui/StatusModal";
import { LessonModal } from "./course-builder/LessonModal";
import { AssessmentModal } from "./course-builder/AssessmentModal";
import { CoursePreviewModal } from "./course-builder/CoursePreviewModal";
import { FinalAssessmentSettingsModal } from "./course-builder/FinalAssessmentSettingsModal";

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
import { createAssessment, addQuestion, updateQuestion, deleteQuestionAction, deleteAssessmentAction, updateAssessmentSettings } from "../../features/assessments/assessmentSlice";
import {  
  ContentItem, 
  QuizQuestion 
} from "../../features/courses/types";
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
    question?: QuizQuestion;
  } | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string, payload: any } | null>(null);
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<{ type: 'final' | 'module', questionId: any, moduleId?: string | number } | null>(null);
  const [showFinalAssessmentSettings, setShowFinalAssessmentSettings] = useState<'create' | 'edit' | null>(null);
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

  const toggleModuleQuiz = async (moduleId: string | number) => {
    const module = course.modules?.find(m => m.id === moduleId);
    if (module) {
      if (!module.quiz) {
        try {
          await dispatch(createAssessment({
            course: course.id,
            module: moduleId,
            title: `Quiz: ${module.title}`,
            is_final: false,
            assessment_type: "QUIZ",
            pass_mark: 60,
            max_attempts: 3,
            duration: 30
          })).unwrap();
          toast.success("Quiz enabled successfully for this module!");
          refetchCourse(course.id);
        } catch (e: any) {
          toast.error(e || "Failed to enable quiz");
        }
      } else {
        try {
          await dispatch(deleteAssessmentAction(module.quiz.id)).unwrap();
          toast.success("Quiz disabled successfully for this module!");
          refetchCourse(course.id);
        } catch (e: any) {
          toast.error(e || "Failed to disable quiz");
        }
      }
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
      let assessmentId: string | number | undefined;

      if (showAssessmentModal?.type === "final") {
        assessmentId = course.final_assessment?.id;
        if (!assessmentId) {
          const res = await dispatch(createAssessment({
            course: course.id,
            title: "Final Assessment",
            is_final: true,
            assessment_type: "FINAL",
            pass_mark: 60,
            max_attempts: 3,
            duration: 60
          })).unwrap();
          assessmentId = res.data.id;
        }
      } else {
        const moduleId = showAssessmentModal?.moduleId;
        const module = course.modules?.find(m => m.id === moduleId);
        assessmentId = module?.quiz?.id;
        if (!assessmentId) {
          const res = await dispatch(createAssessment({
            course: course.id,
            module: moduleId,
            title: `Quiz: ${module?.title}`,
            is_final: false,
            assessment_type: "QUIZ",
            pass_mark: 60,
            max_attempts: 3,
            duration: 30
          })).unwrap();
          assessmentId = res.data.id;
        }
      }

      if (assessmentId) {
        const questionData = {
          assessment: assessmentId,
          question_text: data.question,
          question_type: (data.question_type || "single") as any, 
          marks: data.marks || 1,
          choices: data.choices || data.options.map((opt, idx) => ({
            text: opt,
            is_correct: idx === data.correctAnswer
          }))
        };

        if (data.id && typeof data.id === 'number') {
          await dispatch(updateQuestion({ questionId: data.id, data: questionData })).unwrap();
        } else {
          await dispatch(addQuestion(questionData)).unwrap();
        }
        
        dispatch(fetchCourseDetails(course.id));
        toast.success('Question saved successfully');
      }
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
  const handleCreateFinalAssessmentWithSettings = async (settings: { duration: number; max_attempts: number; pass_mark: number }) => {
    try {
      await dispatch(createAssessment({
        course: course.id,
        title: "Final Assessment",
        is_final: true,
        assessment_type: "FINAL",
        pass_mark: settings.pass_mark,
        max_attempts: settings.max_attempts,
        duration: settings.duration,
      })).unwrap();
      dispatch(fetchCourseDetails(course.id));
      toast.success("Final assessment created successfully!");
    } catch (e: any) {
      toast.error(e || "Failed to create final assessment");
      throw e;
    } finally {
      setShowFinalAssessmentSettings(null);
      // After creating, open the question editor
      setShowAssessmentModal({ type: 'final' });
    }
  };

  /**
   * Called from FinalAssessmentSettingsModal when editing an existing final assessment's settings.
   */
  const handleUpdateFinalAssessmentSettings = async (settings: { duration: number; max_attempts: number; pass_mark: number }) => {
    const assessmentId = course.final_assessment?.id;
    if (!assessmentId) return;
    try {
      await dispatch(updateAssessmentSettings({ assessmentId, data: settings })).unwrap();
      dispatch(fetchCourseDetails(course.id));
      toast.success("Assessment settings updated!");
      setShowFinalAssessmentSettings(null);
    } catch (e: any) {
      toast.error(e || "Failed to update settings");
      throw e;
    }
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
      if (typeof questionId === 'number') {
        await dispatch(deleteQuestionAction(questionId)).unwrap();
        dispatch(fetchCourseDetails(course.id));
        toast.success('Question deleted successfully');
      } else {
        if (type === 'final') {
          const newQuestions = course.final_assessment?.questions?.filter(q => q.id !== questionId) || [];
          dispatch(updateCourse({ 
            id: course.id, 
            data: { final_assessment: { ...(course.final_assessment || { id: '', title: '', questions: [] }), questions: newQuestions } } 
          }));
        } else if (moduleId) {
          const module = course.modules?.find(m => m.id === moduleId);
          if (module && module.quiz) {
            const newQuestions = module.quiz.questions.filter(q => q.id !== questionId);
            dispatch(updateModule({ 
              courseId: course.id, 
              moduleId, 
              data: { quiz: { ...module.quiz, questions: newQuestions } } 
            }));
          }
        }
      }
    } catch (err: any) {
      toast.error('Failed to delete question');
    }
    setDeleteQuestionTarget(null);
  };

  const handlePublish = () => {
    if (!course.modules || course.modules.length === 0) {
      setStatus({ type: 'error', message: 'Add at least one module before publishing.' });
      return;
    }
    if (!course.final_assessment || course.final_assessment.questions.length === 0) {
      setStatus({ type: 'error', message: 'Final Assessment is required.' });
      return;
    }

    if (course.is_published) {
      dispatch(publishCourseChanges(course.id)).then((res) => {
        if (res.meta.requestStatus === 'fulfilled') {
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

  const canPublish = (course.modules?.length || 0) > 0 && (course.final_assessment?.questions?.length || 0) > 0;

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
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl transition-all font-semibold shadow-lg cursor-pointer ${
                canPublish 
                  ? "bg-primary text-white hover:bg-primary/90" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              {course.is_published 
                ? (course.has_unpublished_changes ? "Update Live Course" : "Published") 
                : "Publish Course"}
            </button>
          </div>
        </div>
      </div>

      {course.is_published && course.has_unpublished_changes && (
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
                {(course.final_assessment?.questions?.length || 0) === 0 && (
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
            {course.modules.map((module, mIndex) => (
              <div key={module.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${module.pending_delete ? 'opacity-65 border-red-200 bg-red-50/5' : ''}`}>
                {/* Module Header */}
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
                          className={module.pending_delete ? 'line-through text-gray-400 cursor-not-allowed pointer-events-none w-full flex-1 bg-transparent border border-transparent rounded-md outline-none px-1 py-1' : undefined}
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
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all cursor-pointer ${
                          module.quiz ? "bg-blue-600" : "bg-gray-200"
                        } ${module.pending_delete ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            module.quiz ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
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

                {/* Module Content */}
                {expandedModules.has(module.id) && (
                  <div className="p-4 bg-white space-y-4 border-t border-gray-50">
                    {module.sections.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 italic text-sm border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                        No sections in this module yet. Click the "+" icon to add a section.
                      </div>
                    ) : module.sections.map((section, sIndex) => (
                      <div key={section.id} className={`border border-gray-100 rounded-lg overflow-hidden transition-all duration-300 ${section.pending_delete ? 'opacity-65 border-red-200 bg-red-50/5' : ''}`}>
                        <div className="p-3 bg-gray-50/50 flex items-center gap-3">
                          <button onClick={() => toggleSection(section.id)} className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer">
                            {expandedSections.has(section.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          <div className={`flex items-center flex-1 w-full gap-2 ${section.pending_delete ? 'line-through text-gray-400' : ''}`}>
                            <EditableTitle 
                              initialTitle={section.title}
                              onSave={(val) => handleUpdateSectionTitle(module.id, section.id, val)}
                              prefix={`Section ${sIndex + 1}:`}
                              className={section.pending_delete ? 'line-through text-gray-400 cursor-not-allowed pointer-events-none w-full flex-1 bg-transparent border border-transparent rounded-md outline-none px-1 py-1' : undefined}
                            />
                            {section.pending_delete ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                                Pending Delete
                              </span>
                            ) : course.is_published && section.has_unpublished_changes ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                Modified
                              </span>
                            ) : null}
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

                        {expandedSections.has(section.id) && (
                          <div className="p-2 bg-white space-y-1">
                            {(!section.contents || section.contents.length === 0) ? (
                              <div className="text-center py-4 text-gray-400 italic text-xs">
                                No items in this section. Click the "+" icon to add content.
                              </div>
                            ) : section.contents.map((item) => (
                              <div key={item.id} className={`group flex flex-col p-2 hover:bg-gray-50 rounded-lg transition-all duration-300 ${item.pending_delete ? 'opacity-65 bg-red-50/5' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div 
                                    className="flex items-center gap-3 cursor-pointer"
                                    onClick={() => toggleContentItem(item.id)}
                                    title="Click to toggle content preview"
                                  >
                                    <FileText className={`w-4 h-4 ${item.pending_delete ? 'text-red-400' : 'text-gray-400'}`} />
                                    <span className={`text-sm text-gray-700 hover:text-indigo-600 transition-colors font-medium ${item.pending_delete ? 'line-through text-gray-400' : ''}`}>{item.title}</span>
                                    {item.pending_delete ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                                        Pending Delete
                                      </span>
                                    ) : course.is_published && item.has_unpublished_changes ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                        Modified
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => toggleContentItem(item.id)} 
                                      className={`p-1.5 rounded transition-all ${expandedContentItems.has(item.id) ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'}`}
                                      title={expandedContentItems.has(item.id) ? "Hide Content" : "View Content"}
                                    >
                                      {expandedContentItems.has(item.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => openContentItemModal(module.id, section.id, item)} 
                                      disabled={!!module.pending_delete || !!section.pending_delete || !!item.pending_delete}
                                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-all disabled:opacity-30 disabled:hover:text-gray-400" 
                                      title="Edit Content"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteContentItem(module.id, section.id, item.id)} 
                                      disabled={!!module.pending_delete || !!section.pending_delete || !!item.pending_delete}
                                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-all disabled:opacity-30 disabled:hover:text-gray-400" 
                                      title="Delete Content"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {expandedContentItems.has(item.id) && (
                                  <div className="mt-2 pl-7 space-y-2 py-2 border-t border-gray-50/50">
                                    {(() => {
                                      let blocks = item.contents || [];
                                      if (blocks.length === 0) {
                                        const legacyType = (item as any).content_type;
                                        const legacyText = (item as any).text_content;
                                        const legacyVideo = (item as any).video_url;
                                        const legacyFile = (item as any).file;
                                        
                                        if (legacyText && (legacyText.startsWith('[') || legacyText.startsWith('{'))) {
                                          try {
                                            const parsed = JSON.parse(legacyText);
                                            blocks = Array.isArray(parsed) ? parsed : [parsed];
                                          } catch (e) {
                                            blocks = [{ id: 'fallback', type: legacyType || 'text', content: legacyText }];
                                          }
                                        } else if (legacyText || legacyVideo || legacyFile) {
                                          blocks = [{
                                            id: 'fallback',
                                            type: legacyType || 'text',
                                            content: legacyText || legacyVideo || legacyFile || ''
                                          }];
                                        }
                                      }

                                      if (blocks.length === 0) {
                                        return <p className="text-[10px] italic text-gray-300">No content blocks added.</p>;
                                      }

                                      return blocks.map((block, bIdx) => (
                                        <div key={bIdx} className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {block.type === 'text' && <Type className="w-3 h-3" />}
                                            {block.type === 'video' && <Video className="w-3 h-3" />}
                                            {block.type === 'image' && <ImageIcon className="w-3 h-3" />}
                                            {block.type === 'file' && <FileIcon className="w-3 h-3" />}
                                            {block.type}
                                          </div>
                                          {block.type === 'text' ? (
                                            <div className="text-sm text-gray-700 leading-relaxed rich-text-content min-h-[1.5rem]" dangerouslySetInnerHTML={{ __html: block.content || '<span class="italic text-gray-400 text-[10px]">Empty block</span>' }} />
                                          ) : block.type === 'image' ? (
                                            <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                                              {block.content ? (
                                                <img src={block.content} alt="Preview" className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-gray-300" /></div>
                                              )}
                                            </div>
                                          ) : block.type === 'video' ? (
                                            <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-black flex items-center justify-center">
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video className="w-5 h-5 text-white/80" /></div>
                                            </div>
                                          ) : (
                                            <div className="text-[10px] text-blue-500 truncate bg-blue-50/30 p-1.5 rounded border border-blue-100/50">
                                              {block.content || 'No URL/File provided'}
                                            </div>
                                          )}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Module Quiz Section */}
                    {module.quiz && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                <CircleCheckBig className="w-4 h-4 text-amber-600"/>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm font-bold ${module.quiz.pending_delete ? 'line-through text-gray-400' : 'text-gray-900'}`}>Module Quiz</h4>
                                  {module.quiz.pending_delete ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Removed</span>
                                  ) : course.is_published && module.quiz.has_unpublished_changes ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Modified</span>
                                  ) : null}
                                </div>
                                <p className="text-[10px] text-gray-500">Assess students' understanding of this module</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowAssessmentModal({ type: 'module', moduleId: module.id })}
                              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-bold transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Question
                            </button>
                          </div>

                          {(!module.quiz || module.quiz.questions.length === 0) ? (
                            <div className="text-center py-6 bg-white/50 rounded-lg border border-dashed border-gray-200">
                              <p className="text-xs text-gray-400 italic">No questions added to this quiz yet.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {module.quiz.questions.map((q, qIdx) => (
                                <div key={q.id || qIdx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 group">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded flex-shrink-0">{qIdx + 1}</span>
                                    <span className="text-xs text-gray-700 truncate">{q.question_text || q.question}</span>
                                  </div>
                                  <div className="flex items-center gap-1 transition-all">
                                    <button 
                                      onClick={() => setShowAssessmentModal({ type: 'module', moduleId: module.id, question: q })}
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
            ))}
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
              {course.final_assessment?.questions?.length || 0} question{(course.final_assessment?.questions?.length || 0) !== 1 ? "s" : ""} added
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Show settings badges if final assessment exists */}
            {course.final_assessment && (
              <div className="flex items-center gap-1.5 mr-1">
                {course.final_assessment.duration != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <Clock className="w-3 h-3" />
                    {course.final_assessment.duration}m
                  </span>
                )}
                {course.final_assessment.max_attempts != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <RefreshCw className="w-3 h-3" />
                    {course.final_assessment.max_attempts}x
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
            <button
              onClick={() => {
                if (!course.final_assessment) {
                  // No assessment yet — configure settings first
                  setShowFinalAssessmentSettings('create');
                } else {
                  // Assessment exists — go straight to adding a question
                  setShowAssessmentModal({ type: 'final' });
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {(course.final_assessment?.questions?.length || 0) === 0 ? "Create Assessment" : "Add Question"}
            </button>
          </div>
        </div>
 
        {(!course.final_assessment || (course.final_assessment?.questions?.length || 0) === 0) ? (
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
            {course.final_assessment?.questions?.map((q, idx) => (
              <div key={q.id || idx} className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-amber-100 transition-all">
                <span className="text-sm text-gray-700 truncate pr-4">{idx + 1}. {q.question_text || q.question}</span>
                <div className="flex items-center gap-1 transition-all">
                  <button 
                    onClick={() => setShowAssessmentModal({ type: 'final', question: q })}
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
                } catch (e) {}
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
            duration: course.final_assessment?.duration,
            max_attempts: course.final_assessment?.max_attempts,
            pass_mark: course.final_assessment?.pass_mark,
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
