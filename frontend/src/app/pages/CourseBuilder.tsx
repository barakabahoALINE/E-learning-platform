import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Video,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  GripVertical,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  Upload,
  CheckCircle2,
  BookOpen,
  ArrowUp,
  ArrowDown,
  Type,
  PlayCircle,
  Users,
  Award,
  ChevronDown,
  EyeOff,
} from "lucide-react";
import { fetchCourses, fetchCourseDetails, updateCourse, publishCourse, unpublishCourse, setUnpublishedChanges } from "../../features/courses/courseSlice";
import courseAPI from "../../features/courses/courseAPI";
import StatusModal from "../components/ui/StatusModal";
import type { Lesson, QuizQuestion, FinalAssessment, ContentBlock, Course } from "../../features/courses/types";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { selectCoursesLoading, selectCourseById, selectAllCourses, selectHasUnpublishedChanges } from "../../features/courses/courseSelectors";

export function CourseBuilderPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { id } = useParams();
  
  const courseId = id ? parseInt(id) : null;
  const courses = useAppSelector(selectAllCourses);
  const course = useAppSelector((state) => selectCourseById(state, courseId));
  const isLoading = useAppSelector(selectCoursesLoading);
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
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
  const lastSavedDataRef = useRef<{ lessons: Lesson[], finalAssessment: FinalAssessment } | null>(null);
  const dispatchedDetailsRef = useRef<Set<number>>(new Set());

  // Converts a backend lesson (contents[]) into the local builder format (blocks[] + quiz)
  const normalizeLessonFromBackend = (lesson: any): Lesson => ({
    ...lesson,
    blocks: lesson.blocks?.length
      ? lesson.blocks
      : (lesson.contents || []).map((c: any) => ({
          id: String(c.id || Math.random()),
          type: c.content_type === 'note' ? 'text' : (c.content_type || 'text'),
          content: c.note_text || c.video_url || c.description || c.file || '',
          settings: { caption: c.description },
        })),
    quiz: lesson.quiz || { enabled: false, questions: [] },
  });

  useEffect(() => {
    if (courses.length === 0) {
      dispatch(fetchCourses(true));
    }
  }, [dispatch, courses.length]);

  useEffect(() => {
    if (courseId && (!course || !course.lessons) && !dispatchedDetailsRef.current.has(courseId)) {
      dispatchedDetailsRef.current.add(courseId);
      dispatch(fetchCourseDetails(courseId));
    }
  }, [dispatch, courseId, course]);

  useEffect(() => {
    if (courseId !== prevCourseIdRef.current) {
      hasInitializedRef.current = false;
      prevCourseIdRef.current = courseId;
    }

    if (course && course.lessons && !hasInitializedRef.current && !isLoading) {
      const initialLessons = (course.lessons || []).map(normalizeLessonFromBackend);
      const assessmentSource = course.final_assessment || course.finalAssessment;
      const initialAssessment = assessmentSource && assessmentSource.questions 
        ? assessmentSource 
        : { questions: [] };

      setLessons(initialLessons);
      setFinalAssessment(initialAssessment);
      
      lastSavedDataRef.current = { 
        lessons: initialLessons, 
        finalAssessment: initialAssessment 
      };
      
      hasInitializedRef.current = true;
    }
  }, [course, courseId, isLoading]);

  // Auto-save course data when lessons or finalAssessment change
  useEffect(() => {
    if (courseId && hasInitializedRef.current) {
      const currentData = { lessons, finalAssessment };
      const isDataChanged = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

      if (!isDataChanged) return;

      const saveTimeout = setTimeout(() => {
        const isStillChanged = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);
        if (!isStillChanged) return;

        dispatch(updateCourse({
          id: courseId,
          data: currentData
        }));
        lastSavedDataRef.current = currentData;
        
        // If course is published, mark that there are changes to sync
        if (course?.is_published) {
          dispatch(setUnpublishedChanges({ id: courseId, hasChanges: true }));
        }
      }, 2000);

      return () => clearTimeout(saveTimeout);
    }
  }, [lessons, finalAssessment, courseId, dispatch, course?.is_published]);

  const canPublish = lessons.length > 0 && (finalAssessment?.questions?.length || 0) > 0;
  
  const currentData = { lessons, finalAssessment };
  const isDirty = JSON.stringify(currentData) !== JSON.stringify(lastSavedDataRef.current);

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

  const saveCourseContent = async (updatedLessons: Lesson[], updatedAssessment: FinalAssessment): Promise<boolean> => {
    if (!courseId) return false;
    
    try {
      const response = await dispatch(updateCourse({
        id: courseId,
        data: { lessons: updatedLessons, finalAssessment: updatedAssessment }
      })).unwrap();
      
      setStatus({ 
        type: 'success', 
        message: response.message || 'Course updated successfully' 
      });
      
      // Update the sync ref to prevent immediate auto-save
      lastSavedDataRef.current = { lessons: updatedLessons, finalAssessment: updatedAssessment };
      
      // If course is published, mark that there are changes to sync
      if (course?.is_published) {
        dispatch(setUnpublishedChanges({ id: courseId, hasChanges: true }));
      }
      return true;
    } catch (error: any) {
      setStatus({ 
        type: 'error', 
        message: typeof error === 'string' ? error : (error.message || 'Failed to update course content') 
      });
      return false;
    }
  };

  const handleSaveLesson = async (lesson: Lesson) => {
    const newLessons = editingLesson
      ? lessons.map((l) => (l.id === editingLesson.id ? lesson : l))
      : [...lessons, lesson];
    
    // 1. Prematurely update the lastSavedDataRef to match what we're about to set.
    // This PREVENTS the auto-save useEffect from triggering a redundant request.
    lastSavedDataRef.current = { lessons: newLessons, finalAssessment };
    
    // 2. Start manual save process
    setIsSavingContent(true);
    const success = await saveCourseContent(newLessons, finalAssessment);
    
    if (success) {
      // 3. Only update local state and close modal if API call succeeded
      setLessons(newLessons);
      setShowLessonModal(false);
      setEditingLesson(null);
    }
    
    setIsSavingContent(false);
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    
    const newLessons = lessons.filter((l) => l.id !== lessonId);
    setLessons(newLessons);
    await saveCourseContent(newLessons, finalAssessment);
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
      {/* Header */}
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
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Eye className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Preview</span>
            </button>
            
            {course.is_published && (
              <button
                disabled={isUnpublishing}
                onClick={() => setShowUnpublishModal(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
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
               className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium shadow-sm active:scale-95 cursor-pointer 
                ${canPublish && (!course.is_published || hasUnpublishedChanges) ? "bg-primary text-white hover:bg-gray-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {course.is_published ? "Update Live Course" : "Publish Course"}
            </button>
          </div>
        </div>
      </div>

      {/* Publishing Requirements */}
      {!canPublish && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-900 mb-1">
                Complete these requirements to publish:
              </h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                {lessons.length === 0 && <li>• Add at least one lesson</li>}
                {(finalAssessment?.questions?.length || 0) === 0 && (
                  <li>• Create final assessment with at least one question</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Lessons Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
            <p className="text-sm text-gray-500 mt-1">
              {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} added
            </p>
          </div>
          <button
            onClick={() => {
              setEditingLesson(null);
              setShowLessonModal(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold shadow-md shadow-indigo-100 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add New Lesson
          </button>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No lessons yet</p>
            <p className="text-sm text-gray-500">
              Click "Add Lesson" to create your first lesson
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move flex-shrink-0" />
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          Lesson {index + 1}: {lesson.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {(lesson.blocks?.length || 0)} content block{(lesson.blocks?.length || 0) !== 1 ? "s" : ""}
                          </span>
                          {lesson.quiz?.enabled && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Quiz: {(lesson.quiz?.questions?.length || 0)} questions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        setEditingLesson(lesson);
                        setShowLessonModal(true);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                    <button
                      onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                      className={'p-2 rounded-lg transition-colors ml-2 cursor-pointer'}
                    >
                      {expandedLesson === lesson.id ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                </div>

                {expandedLesson === lesson.id && (
                  <div className="p-5 border-t border-gray-200 bg-white space-y-5">
                    {lesson.blocks.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No sections in this lesson.</p>
                    ) : (
                      lesson.blocks.map((block, bIndex) => (
                        <div key={block.id} className="space-y-2">
                           {/* Section label */}
                           <div className="flex items-center gap-1.5">
                             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                               {block.type === 'text' && <Type className="w-3 h-3 text-blue-400" />}
                               {block.type === 'video' && <Video className="w-3 h-3 text-purple-400" />}
                               {block.type === 'image' && <ImageIcon className="w-3 h-3 text-green-400" />}
                               {block.type === 'file' && <FileIcon className="w-3 h-3 text-orange-400" />}
                               {block.type} section {bIndex + 1}
                             </span>
                           </div>

                           <MediaPreview block={block} />
                        </div>
                      ))
                    )}
                    {lesson.quiz?.enabled && (lesson.quiz?.questions?.length || 0) > 0 && (
                      <div className="pt-4 border-t border-gray-100 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm text-gray-600 font-medium">
                          Lesson Quiz — {(lesson.quiz?.questions?.length || 0)} question{(lesson.quiz?.questions?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Assessment Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Final Assessment
              <span className="ml-2 text-sm font-normal text-red-600">
                (Required to publish)
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {(finalAssessment?.questions?.length || 0)} question
              {(finalAssessment?.questions?.length || 0) !== 1 ? "s" : ""} added
            </p>
          </div>
          <button
            onClick={() => setShowAssessmentModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {finalAssessment.questions.length === 0
              ? "Create Assessment"
              : "Add Question"}
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
                key={question.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Question {index + 1}
                  </h4>
                  <button
                    onClick={() => {
                      if (!window.confirm("Delete this question?")) return;
                      const newAssessment = {
                        questions: finalAssessment.questions.filter(
                          (q) => q.id !== question.id
                        ),
                      };
                      setFinalAssessment(newAssessment);
                      saveCourseContent(lessons, newAssessment);
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
                      className={`flex items-center gap-2 text-sm p-2 rounded ${
                        optIndex === question.correctAnswer
                          ? "bg-green-50 border border-green-200"
                          : "bg-gray-50"
                      }`}
                    >
                      {optIndex === question.correctAnswer && (
                        <Check className="w-4 h-4 text-green-600" />
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

      {/* Lesson Creation/Edit Modal */}
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

      {/* Assessment Modal */}
      {showAssessmentModal && (
        <AssessmentModal
          onClose={() => setShowAssessmentModal(false)}
          onSave={async (question) => {
            const newAssessment = {
              questions: [...finalAssessment.questions, question],
            };
            setFinalAssessment(newAssessment);
            setShowAssessmentModal(false);
            
            // Explicitly save and show feedback
            await saveCourseContent(lessons, newAssessment);
          }}
        />
      )}

      {/* Course Preview Modal */}
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
          title={status.type === "success" ? "Success" : "Error"}
          description={status.message}
          onClose={() => setStatus(null)}
        />
      )}

      {/* Unpublish Confirmation Modal */}
      {showUnpublishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <EyeOff className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Unpublish Course?</h3>
              <p className="text-gray-500 text-center mb-8">
                This course will be hidden from the marketplace and learners will no longer be able to enroll. 
                Existing students will keep their access.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowUnpublishModal(false)}
                  disabled={isUnpublishing}
                  className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnpublish}
                  disabled={isUnpublishing}
                  className="px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUnpublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Unpublish"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonModal({
  lesson,
  onClose,
  onSave,
  courseId,
  totalLessons,
  isSaving = false,
}: {
  lesson: Lesson | null;
  onClose: () => void;
  onSave: (lesson: Lesson) => void;
  courseId: number;
  totalLessons: number;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(lesson?.blocks || []);
  const [quizEnabled, setQuizEnabled] = useState(lesson?.quiz?.enabled || false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    lesson?.quiz?.questions || []
  );
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [uploadingBlocks, setUploadingBlocks] = useState<Record<string, boolean>>({});

  // Refs for hidden file inputs, keyed by block id
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addBlock = (type: "text" | "video" | "image" | "file") => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockCaption = (id: string, caption: string) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, settings: { ...b.settings, caption } } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[targetIndex]] = [
        newBlocks[targetIndex],
        newBlocks[index],
      ];
      setBlocks(newBlocks);
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    setUploadingBlocks((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        updateBlock(id, response.url);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingBlocks((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleVideoUpload = async (id: string, file: File) => {
    setUploadingBlocks((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        updateBlock(id, response.url);
      }
    } catch (error) {
      console.error("Video upload failed:", error);
      alert("Failed to upload video.");
    } finally {
      setUploadingBlocks((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFileUpload = async (id: string, file: File) => {
    setUploadingBlocks((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        updateBlock(id, response.url);
      }
    } catch (error) {
      console.error("File upload failed:", error);
      alert("Failed to upload file.");
    } finally {
      setUploadingBlocks((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleSave = () => {
    if (!title || blocks.length === 0) {
      alert("Please provide a title and at least one section");
      return;
    }

    if (Object.values(uploadingBlocks).some(Boolean)) {
      alert("Please wait for all media to finish uploading before saving.");
      return;
    }

    if (blocks.some((b) => !b.content.trim())) {
      alert("Please fill in all content sections");
      return;
    }

    const newLesson: Lesson = {
      id: lesson?.id || Date.now(),
      course: courseId,
      title,
      order: lesson?.order || (totalLessons + 1),
      blocks,
      quiz: {
        enabled: quizEnabled,
        questions: quizQuestions,
      },
    };

    onSave(newLesson);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {lesson ? "Edit Lesson" : "Add New Lesson"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Lesson Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isSaving}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="e.g., Introduction to React Hooks"
            />
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Lesson Sections
              </h3>
              <span className="text-xs text-gray-400">{blocks.length} section{blocks.length !== 1 ? "s" : ""}</span>
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No sections yet.</p>
                <p className="text-xs text-gray-300 mt-1">Use the toolbar below to add your first section.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <div key={block.id} className="group relative bg-gray-50 rounded-xl border border-gray-200 p-4 transition-all hover:border-indigo-300">
                    {/* Reorder controls */}
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveBlock(index, "up")}
                        disabled={index === 0}
                        className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:text-indigo-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveBlock(index, "down")}
                        disabled={index === blocks.length - 1}
                        className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:text-indigo-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Section header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-white border border-gray-200 rounded text-[10px] font-bold flex items-center justify-center text-gray-400">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1.5">
                          {block.type === 'text' && <Type className="w-3.5 h-3.5 text-blue-500" />}
                          {block.type === 'video' && <Video className="w-3.5 h-3.5 text-purple-500" />}
                          {block.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-green-500" />}
                          {block.type === 'file' && <FileIcon className="w-3.5 h-3.5 text-orange-500" />}
                          {block.type} Section
                        </span>
                      </div>
                      <button
                        onClick={() => removeBlock(String(block.id))}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TEXT */}
                    {block.type === "text" && (
                      <textarea
                        value={block.content}
                        onChange={(e) => updateBlock(String(block.id), e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                        placeholder="Enter text content here... Use this section to explain concepts, add key points, or write step-by-step instructions."
                      />
                    )}

                    {/* VIDEO */}
                    {block.type === "video" && (
                      <div className="space-y-2">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-purple-600">Uploading Video...</span>
                          </div>
                        ) : block.content && (block.content.startsWith('blob:') || block.content.startsWith('data:') || block.content.includes('/media/course_media/')) ? (
                          <video
                            src={block.content}
                            controls
                            className="w-full rounded-lg max-h-48 bg-black"
                          />
                        ) : block.content ? (
                          <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                            <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 truncate">{block.content}</span>
                          </div>
                        ) : null}
                        <input
                          type="text"
                          value={block.content.startsWith('blob:') || block.content.startsWith('data:') ? '' : block.content}
                          onChange={(e) => updateBlock(String(block.id), e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="Paste a Video URL (YouTube, Vimeo, etc.)"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-200" />
                          <span className="text-xs text-gray-400">or</span>
                          <div className="flex-1 border-t border-gray-200" />
                        </div>
                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_video'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVideoUpload(String(block.id), file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_video']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-purple-200 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 text-sm font-medium transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Video File (MP4, WebM, MOV)
                        </button>
                        <input
                          type="text"
                          value={block.settings?.caption || ""}
                          onChange={(e) => updateBlockCaption(String(block.id), e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="Caption (optional)"
                        />
                      </div>
                    )}

                    {/* IMAGE */}
                    {block.type === "image" && (
                      <div className="space-y-2">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-green-50 rounded-xl border border-green-100">
                            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-green-600">Uploading Image...</span>
                          </div>
                        ) : block.content && (
                          <div className="relative">
                            <img
                              src={block.content}
                              alt="Section"
                              className="w-full rounded-lg max-h-64 object-cover"
                            />
                            <button
                              onClick={() => updateBlock(String(block.id), "")}
                              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <input
                          type="text"
                          value={block.content.startsWith('data:') ? '' : block.content}
                          onChange={(e) => updateBlock(String(block.id), e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="Paste an Image URL"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-200" />
                          <span className="text-xs text-gray-400">or</span>
                          <div className="flex-1 border-t border-gray-200" />
                        </div>
                        {/* Hidden file input */}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_image'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(String(block.id), file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_image']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-green-200 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 hover:border-green-400 text-sm font-medium transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Image (PNG, JPG, GIF, WebP)
                        </button>
                        <input
                          type="text"
                          value={block.settings?.caption || ""}
                          onChange={(e) => updateBlockCaption(String(block.id), e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-gray-100 rounded-lg text-xs text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          placeholder="Caption (optional)"
                        />
                      </div>
                    )}

                    {/* FILE */}
                    {block.type === "file" && (
                      <div className="space-y-4">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-orange-600">Uploading File...</span>
                          </div>
                        ) : block.content ? (
                          <div className="bg-white border-2 border-orange-100 rounded-xl p-4 flex items-center gap-4 group/file hover:border-orange-200 transition-all">
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/file:scale-110 transition-transform">
                              <FileIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {block.content.split('/').pop()}
                              </p>
                              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold text-[10px]">Document</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={block.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-gray-50 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
                                title="Download File"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => updateBlock(String(block.id), "")}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <FileIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No file selected yet</p>
                          </div>
                        )}

                        <input
                          type="file"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_file'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(String(block.id), file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_file']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-orange-500 hover:text-orange-600 text-sm font-medium transition-all"
                        >
                          <FileIcon className="w-4 h-4" />
                          {block.content ? "Change File" : "Choose File (PDF, DOCX, ZIP)"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lesson Quiz Toggle */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Add Lesson Quiz (Optional)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Test learners after this lesson
                </p>
              </div>
              <button
                onClick={() => setQuizEnabled(!quizEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  quizEnabled ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    quizEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {quizEnabled && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {quizQuestions.length} question
                    {quizQuestions.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setShowQuizBuilder(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    + Add Question
                  </button>
                </div>

                {quizQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No questions added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {quizQuestions.map((q, index) => (
                      <div
                        key={q.id}
                        className="bg-white p-3 rounded-lg border border-gray-200 flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {index + 1}. {q.question}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {q.options.length} options
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setQuizQuestions(
                              quizQuestions.filter((question) => question.id !== q.id)
                            );
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky toolbar with add section buttons + save/cancel */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between gap-3">

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-400 mr-1 hidden sm:inline">Add section:</span>
              <button
                onClick={() => addBlock("text")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="Add Text section"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Text</span>
              </button>
              <button
                onClick={() => addBlock("video")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                title="Add Video section"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Video</span>
              </button>
              <button
                onClick={() => addBlock("image")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                title="Add Image section"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Image</span>
              </button>
              <button
                onClick={() => addBlock("file")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                title="Add File section"
              >
                <FileIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">File</span>
              </button>
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors cursor-pointer disabled:bg-indigo-400 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  lesson ? "Update Lesson" : "Save Lesson"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Builder Modal */}
      {showQuizBuilder && (
        <QuizQuestionModal
          onClose={() => setShowQuizBuilder(false)}
          onSave={(question) => {
            setQuizQuestions([...quizQuestions, question]);
            setShowQuizBuilder(false);
          }}
        />
      )}
    </div>
  );
}

// Assessment/Quiz Question Modal
function AssessmentModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (question: QuizQuestion) => void;
}) {
  return (
    <QuizQuestionModal onClose={onClose} onSave={onSave} title="Add Assessment Question" />
  );
}

function QuizQuestionModal({
  onClose,
  onSave,
  title = "Add Quiz Question",
}: {
  onClose: () => void;
  onSave: (question: QuizQuestion) => void;
  title?: string;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  const handleSave = () => {
    if (!question || options.some((opt) => !opt.trim())) {
      alert("Please fill in the question and all answer options");
      return;
    }

    onSave({
      id: Date.now(),
      question,
      options,
      correctAnswer,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your question"
            />
          </div>

          {/* Answer Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Answer Options <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctAnswer === index}
                    onChange={() => setCorrectAnswer(index)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${index + 1}`}
                  />
                  {correctAnswer === index && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      Correct
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Select the radio button to mark the correct answer
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// COURSE PREVIEW MODAL — clean light admin view
// --------------------------------------------------------------------------
function CoursePreviewModal({
  course,
  lessons,
  finalAssessment,
  onClose,
}: {
  course: Course;
  lessons: Lesson[];
  finalAssessment: FinalAssessment;
  onClose: () => void;
}) {
  const [expandedLesson, setExpandedLesson] = useState<number | null>(
    lessons.length > 0 ? lessons[0].id : null
  );

  const totalSections = lessons.reduce((acc, l) => acc + (l.blocks?.length || 0), 0);

  const getImageUrl = (url: string | null) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-6 animate-in zoom-in-95 duration-200">

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">Course Preview</span>
            <span className="ml-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Admin only</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Course info */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex gap-5">
            {course.thumbnail && (
              <img src={getImageUrl(course.thumbnail)} alt={course.title} className="w-32 h-20 object-cover rounded-xl flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h1 className="text-lg font-bold text-gray-900 leading-snug">{course.title}</h1>
                <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                  course.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {course.is_published ? "Published" : "Draft"}
                </span>
              </div>
              {course.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{course.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{(lessons?.length || 0)} lesson{(lessons?.length || 0) !== 1 ? "s" : ""}</span>
                <span className="flex items-center gap-1"><Type className="w-3.5 h-3.5" />{totalSections} section{totalSections !== 1 ? "s" : ""}</span>
                {course.admin && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.admin}</span>}
                {(finalAssessment?.questions?.length || 0) > 0 && (
                  <span className="flex items-center gap-1 text-indigo-500"><Award className="w-3.5 h-3.5" />Final Assessment ({(finalAssessment?.questions?.length || 0)}Q)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lessons accordion */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {lessons.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No lessons have been added yet.</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <div key={lesson.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Lesson row */}
                <button
                  onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{lesson.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {["text","video","image", "file"].filter(t => (lesson.blocks || []).some(b => b.type === t)).map(type => (
                        <span key={type} className="text-[11px] text-gray-500 flex items-center gap-1">
                          {type === "text" && <Type className="w-3 h-3" />}
                          {type === "video" && <Video className="w-3 h-3" />}
                          {type === "image" && <ImageIcon className="w-3 h-3" />}
                          {type === "file" && <FileIcon className="w-3 h-3" />}
                          {(lesson.blocks || []).filter(b => b.type === type).length} {type}
                        </span>
                      ))}
                      {lesson.quiz?.enabled && (
                        <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">+ Quiz</span>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 cursor-pointer ${expandedLesson === lesson.id ? "rotate-180" : ""}`} />
                </button>

                {/* Lesson content */}
                {expandedLesson === lesson.id && (
                  <div className="px-5 py-4 space-y-5 bg-white border-t border-gray-100">
                    {(lesson.blocks || []).length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No sections in this lesson.</p>
                    ) : (
                      (lesson.blocks || []).map((block, bIdx) => (
                        <div key={block.id} className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
                              {block.type === "text" && <Type className="w-3 h-3 text-blue-400" />}
                              {block.type === "video" && <Video className="w-3 h-3 text-purple-400" />}
                              {block.type === "image" && <ImageIcon className="w-3 h-3 text-green-400" />}
                              {block.type === "file" && <FileIcon className="w-3 h-3 text-orange-400" />}
                              {block.type} section {bIdx + 1}
                            </span>
                          </div>

                          <MediaPreview block={block} hideLinkOnVideo />
                        </div>
                      ))
                    )}

                    {/* Quiz */}
                    {lesson.quiz?.enabled && (lesson.quiz?.questions?.length || 0) > 0 && (
                      <div className="mt-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-semibold text-gray-800">Lesson Quiz</span>
                          <span className="text-xs text-gray-400">({(lesson.quiz?.questions?.length || 0)} question{(lesson.quiz?.questions?.length || 0) !== 1 ? "s" : ""})</span>
                        </div>
                        <div className="space-y-2">
                          {(lesson.quiz?.questions || []).map((q, qIdx) => (
                            <div key={q.id} className="bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                              <p className="text-sm font-medium text-gray-800 mb-2">{qIdx + 1}. {q.question}</p>
                              <div className="grid grid-cols-2 gap-1">
                                {(q.options || []).map((opt, oIdx) => (
                                  <p key={oIdx} className={`text-xs px-2 py-1 rounded ${oIdx === q.correctAnswer ? "bg-green-100 text-green-700 font-medium" : "text-gray-500"}`}>
                                    {oIdx === q.correctAnswer ? "✓ " : ""}{opt}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Final Assessment */}
          {(finalAssessment?.questions?.length || 0) > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">Final Assessment — {(finalAssessment?.questions?.length || 0)} question{(finalAssessment?.questions?.length || 0) !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {(finalAssessment?.questions || []).map((q, qIdx) => (
                  <div key={q.id} className="bg-white border border-amber-100 rounded-lg px-4 py-3">
                    <p className="text-sm font-medium text-gray-800 mb-2">{qIdx + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {q.options.map((opt, oIdx) => (
                        <p key={oIdx} className={`text-xs px-2 py-1 rounded ${oIdx === q.correctAnswer ? "bg-green-100 text-green-700 font-medium" : "text-gray-500"}`}>
                          {oIdx === q.correctAnswer ? "✓ " : ""}{opt}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

const MediaPreview = ({ block, hideLinkOnVideo = false }: { block: ContentBlock; hideLinkOnVideo?: boolean }) => {
  if (block.type === 'text') {
    return block.content
      ? <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg px-4 py-3">{block.content}</p>
      : <p className="text-sm text-gray-400 italic">No text entered.</p>;
  }

  if (block.type === 'video') {
    if (!block.content) return <p className="text-sm text-gray-400 italic">No video selected.</p>;

    const isDirectFile = block.content.startsWith('blob:') || block.content.startsWith('data:') || block.content.includes('/media/');
    const isYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');

    return (
      <div className="space-y-2">
        {isDirectFile ? (
          <video src={block.content} controls className="w-full rounded-xl max-h-52 bg-black" />
        ) : isYouTube ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
            <iframe
              src={block.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            />
          </div>
        ) : !hideLinkOnVideo ? (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
            <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm text-purple-700 truncate">{block.content}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
             <PlayCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
             <span className="text-sm text-purple-700 break-all">{block.content}</span>
          </div>
        )}
        {block.settings?.caption && (
          <p className="text-xs text-gray-400 italic">{block.settings.caption}</p>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    return block.content ? (
      <div className="space-y-2">
        <img
          src={block.content}
          alt={block.settings?.caption || "image"}
          className="max-h-64 w-auto rounded-xl border border-gray-100 object-cover"
        />
        {block.settings?.caption && (
          <p className="text-xs text-gray-400 italic">{block.settings.caption}</p>
        )}
      </div>
    ) : <p className="text-sm text-gray-400 italic">No image uploaded.</p>;
  }

  if (block.type === 'file') {
    return block.content ? (
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 group/file transition-all">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {block.content.split('/').pop()}
            </p>
            <p className="text-xs text-gray-400">Resource File</p>
          </div>
          <a
            href={block.content}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-50 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
    ) : <p className="text-sm text-gray-400 italic">No file uploaded.</p>;
  }

  return null;
};
