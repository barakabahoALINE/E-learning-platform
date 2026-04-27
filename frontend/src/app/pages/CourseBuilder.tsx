import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  BookOpen,
  X,
  GripVertical,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { 
  fetchCourses, 
  fetchCourseDetails, 
  updateCourse, 
  publishCourse, 
  unpublishCourse, 
  setUnpublishedChanges,
  fetchLevels,
  fetchCategories
} from "../../features/courses/courseSlice";
import { 
  fetchLessons as fetchNormalizedLessons,
  createLesson,
  updateLesson as updateNormalizedLesson,
  deleteLesson as deleteNormalizedLesson,
  fetchLessonContents
} from "../../features/courses/lessonSlice";
import { 
  selectCoursesLoading, 
  selectCourseById, 
  selectAllCourses, 
  selectHasUnpublishedChanges 
} from "../../features/courses/courseSelectors";

import StatusModal from "../components/ui/StatusModal";
import { LessonModal } from "./course-builder/LessonModal";
import { AssessmentModal } from "./course-builder/AssessmentModal";
import { CoursePreviewModal } from "./course-builder/CoursePreviewModal";
import { LessonSummaryLine, LessonContentsView } from "./course-builder/CourseBuilderComponents";

import { extractErrorMessage } from "./course-builder/course-builder-utils";
import type { Lesson, FinalAssessment } from "../../features/courses/types";

export function CourseBuilderPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { id } = useParams();
  
  const courseId = id ? parseInt(id) : null;
  const courses = useAppSelector(selectAllCourses);
  const course = useAppSelector((state) => selectCourseById(state, courseId));
  const lessons = useAppSelector((state) => state.lessons.lessons);
  const isLoading = useAppSelector(selectCoursesLoading);
  
  const [finalAssessment, setFinalAssessment] = useState<FinalAssessment>({
    questions: [],
  });
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const hasUnpublishedChanges = useAppSelector((state) => selectHasUnpublishedChanges(state, courseId));
  const hasInitializedRef = useRef(false);
  const prevCourseIdRef = useRef<number | null>(null);
  const dispatchedDetailsRef = useRef<Set<number>>(new Set());

  const canPublish = lessons.length > 0 && (finalAssessment?.questions?.length || 0) > 0;

  useEffect(() => {
    if (courses.length === 0) {
      dispatch(fetchCourses(true));
    }
  }, [dispatch, courses.length]);

  useEffect(() => {
    // We check for final_assessment as a way to determine if we have a detailed course object
    const needsDetail = courseId && (!course || (!course.lessons && !course.final_assessment));
    if (needsDetail && !dispatchedDetailsRef.current.has(courseId)) {
      dispatchedDetailsRef.current.add(courseId);
      dispatch(fetchCourseDetails(courseId));
      dispatch(fetchNormalizedLessons(courseId));
    }
  }, [dispatch, courseId, course]);

  useEffect(() => {
    if (courseId !== prevCourseIdRef.current) {
      hasInitializedRef.current = false;
      prevCourseIdRef.current = courseId;
    }

    if (course && !isLoading) {
      const assessmentSource = course.final_assessment; 

      if (assessmentSource && assessmentSource.questions?.length > 0) {
        if (!hasInitializedRef.current || finalAssessment.questions.length === 0) {
          setFinalAssessment(assessmentSource);
          hasInitializedRef.current = true;
        }
      } else if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
      }
    }
  }, [course, courseId, isLoading, finalAssessment.questions.length]);

  const handlePublish = async () => {
    if (!courseId || !canPublish) return;
    
    setIsPublishing(true);
    try {
      await dispatch(publishCourse(courseId)).unwrap();
      const isUpdating = course?.is_published;
      setStatus({ 
        type: 'success', 
        message: isUpdating ? 'Live course updated successfully!' : 'Course published successfully! It is now visible to learners.' 
      });
      dispatch(setUnpublishedChanges({ id: courseId, hasChanges: false }));
      if (!isUpdating) {
        setTimeout(() => navigate("/admin/courses"), 2000);
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: typeof error === 'string' ? error : 'Failed to publish course.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!courseId) return;
    
    setIsUnpublishing(true);
    try {
      await dispatch(unpublishCourse(courseId)).unwrap();
      setStatus({ type: 'success', message: 'Course unpublished successfully.' });
      dispatch(setUnpublishedChanges({ id: courseId, hasChanges: false }));
      setShowUnpublishModal(false);
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: typeof error === 'string' ? error : (error.message || 'Failed to unpublish course') 
      });
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleSaveLesson = async (lessonData: Lesson) => {
    if (!courseId) return;

    setIsSavingContent(true);
    try {
      const incomingBlocks = lessonData.blocks || [];
      const contents = incomingBlocks.map((block, i) => ({
        id: typeof block.id === 'number' ? block.id : undefined,
        title: block.title || `${block.type === 'text' ? 'Note' : (block.type.charAt(0).toUpperCase() + block.type.slice(1))} Segment`,
        content_type: block.type === 'text' ? 'note' : (block.type as any),
        order: i + 1,
        note_text: block.type === 'text' ? block.content : undefined,
        video_url: block.type === 'video' ? block.content : undefined,
        file: (block.type === 'file' || block.type === 'image') ? block.content : undefined,
        description: block.settings?.caption || (block.type === 'image' ? block.content : undefined),
        quiz: block.type === 'quiz' ? block.quiz : undefined,
      }));

      const payload = {
        title: lessonData.title,
        order: lessonData.order,
        contents,
      };

      if (editingLesson) {
        await dispatch(updateNormalizedLesson({
          courseId,
          lessonId: editingLesson.id,
          data: payload
        })).unwrap();
      } else {
        await dispatch(createLesson({
          courseId,
          data: payload
        })).unwrap();
      }

      await dispatch(fetchCourseDetails(courseId));
      await dispatch(fetchLevels());
      await dispatch(fetchCategories());
      
      setStatus({ type: 'success', message: 'Lesson saved successfully' });
      setShowLessonModal(false);
      setEditingLesson(null);
      
      if (course?.is_published) {
        dispatch(setUnpublishedChanges({ id: courseId, hasChanges: true }));
      }
    } catch (error: any) {
      console.error("Failed to save lesson:", error);
      const errorMessage = extractErrorMessage(error);
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!courseId || !window.confirm("Are you sure you want to delete this lesson?")) return;
    
    try {
      await dispatch(deleteNormalizedLesson({ courseId, lessonId })).unwrap();
      setStatus({ type: 'success', message: 'Lesson deleted successfully' });
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: typeof error === 'string' ? error : (error.message || 'Failed to delete lesson') 
      });
    }
  };

  if (isLoading && (!course || !course.lessons)) {
    return (
      <div className="max-w-[1200px] mx-auto pb-12">
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium italic">Synchronizing course data...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-[1200px] mx-auto pb-12">
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <X className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course not found</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">The course you're looking for doesn't exist or you don't have permission to build it.</p>
          <button
            onClick={() => navigate("/admin/courses")}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-200 cursor-pointer"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {course.title}
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
              <span className="text-gray-700">Preview</span>
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
               disabled={!canPublish || isPublishing || (course.is_published && !hasUnpublishedChanges)}
               title={course.is_published && !hasUnpublishedChanges ? "No changes to update" : ""}
               className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-medium cursor-pointer 
                ${canPublish && (!course.is_published || hasUnpublishedChanges) ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {course.is_published ? "Update Live" : "Publish Course"}
            </button>
          </div>
        </div>
      </div>

      {!canPublish && (
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
                {lessons.length === 0 && <li>• Add at least one lesson</li>}
                {(finalAssessment?.questions?.length || 0) === 0 && (
                  <li>• Create final assessment with at least one question</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Lessons Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Lessons</h2>
              <p className="text-xs text-gray-400 mt-1">
                {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} added
              </p>
            </div>
            <button
              onClick={() => {
                setEditingLesson(null);
                setShowLessonModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Lesson
            </button>
          </div>

          <div className="p-6">
            {lessons.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-50 rounded-xl">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 italic">No lessons yet. Start by adding your first unit.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className="border border-gray-100 rounded-lg overflow-hidden transition-all hover:border-gray-200 bg-white mb-2"
                  >
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                           <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm">
                            Lesson {index + 1}: {lesson.title}
                          </h3>
                          <LessonSummaryLine lessonId={lesson.id} lessonBlocksLength={lesson.blocks?.length || 0} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setEditingLesson(lesson);
                            setShowLessonModal(true);
                            if (courseId) {
                              dispatch(fetchLessonContents({ courseId, lessonId: lesson.id }));
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                          title="Edit Lesson"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLesson(lesson.id)}
                          className="p-1.5 text-red-500 transition-colors cursor-pointer"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const isExpanding = expandedLesson !== lesson.id;
                            setExpandedLesson(isExpanding ? lesson.id : null);
                            if (isExpanding && courseId) {
                              dispatch(fetchLessonContents({ courseId, lessonId: lesson.id }));
                            }
                          }}
                          className={`p-1.5 transition-colors cursor-pointer ${expandedLesson === lesson.id ? "text-indigo-600" : "text-gray-400 hover:text-indigo-600"}`}
                        >
                          {expandedLesson === lesson.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {expandedLesson === lesson.id && (
                       <LessonContentsView lessonId={lesson.id} />
                     )}
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>

        {/* Final Assessment Section */}
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
                {finalAssessment.questions.length} question{finalAssessment.questions.length !== 1 ? "s" : ""} added
              </p>
            </div>
            <button
              onClick={() => setShowAssessmentModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {finalAssessment.questions.length === 0 ? "Create Assessment" : "Add Question"}
            </button>
          </div>

          {finalAssessment.questions.length === 0 ? (
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
            <div className="space-y-4">
              {finalAssessment.questions.map((question, index) => (
                <div
                  key={question.id || index}
                  className="border border-gray-200 rounded-lg p-4 transition-all hover:border-blue-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Question {index + 1}
                    </h4>
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete this question?")) return;
                        const newAssessment = {
                          questions: finalAssessment.questions.filter((q) => q.id !== question.id),
                        };
                        setFinalAssessment(newAssessment);
                        try {
                          await dispatch(updateCourse({ 
                            id: courseId!, 
                            data: { 
                              final_assessment: newAssessment,
                              finalAssessment: newAssessment
                            } 
                          })).unwrap();
                          dispatch(setUnpublishedChanges({ id: courseId!, hasChanges: true }));
                        } catch (err) {
                          setStatus({ type: 'error', message: 'Failed to delete question' });
                        }
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{question.question}</p>
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 text-sm p-2 rounded transition-colors ${
                          optIndex === question.correctAnswer
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50"
                        }`}
                      >
                        {optIndex === question.correctAnswer && (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        )}
                        <span className="text-gray-700">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLessonModal && (
        <LessonModal
          lesson={editingLesson}
          courseId={courseId || 0}
          totalLessons={lessons.length}
          isSaving={isSavingContent}
          onClose={() => {
            if (!isSavingContent) {
              setShowLessonModal(false);
              setEditingLesson(null);
            }
          }}
          onSave={handleSaveLesson}
        />
      )}

      {showAssessmentModal && (
        <AssessmentModal
          onClose={() => setShowAssessmentModal(false)}
          onSave={async (question) => {
            if (!courseId) return;
            const newAssessment = {
              questions: [...finalAssessment.questions, question],
            };
            
            setFinalAssessment(newAssessment);
            setShowAssessmentModal(false);
            
            try {
              await dispatch(updateCourse({
                id: courseId,
                data: { finalAssessment: newAssessment }
              })).unwrap();
              setStatus({ type: 'success', message: 'Assessment updated successfully' });
              
              if (course?.is_published) {
                dispatch(setUnpublishedChanges({ id: courseId, hasChanges: true }));
              }
            } catch (error: any) {
              setStatus({ 
                type: 'error', 
                message: typeof error === 'string' ? error : (error.message || 'Failed to update assessment') 
              });
            }
          }}
        />
      )}

      {showPreviewModal && course && (
        <CoursePreviewModal
          course={course}
          lessons={lessons}
          finalAssessment={finalAssessment}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

      {status && (
        <StatusModal
          isOpen={!!status}
          type={status.type}
          title={status.type === "success" ? "Done" : "Error"}
          description={status.message}
          onClose={() => setStatus(null)}
        />
      )}

      {/* Unpublish Confirmation */}
      {showUnpublishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <EyeOff className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Unpublish?</h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                This will hide the course from all learners. You can republish it at any time.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUnpublish}
                  disabled={isUnpublishing}
                  className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                   {isUnpublishing ? "Processing..." : "Yes, Unpublish"}
                </button>
                <button
                  onClick={() => setShowUnpublishModal(false)}
                  disabled={isUnpublishing}
                  className="w-full py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all cursor-pointer"
                >
                  Keep Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
