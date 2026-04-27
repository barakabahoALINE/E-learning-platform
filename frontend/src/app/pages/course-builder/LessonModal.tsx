import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, File as FileIcon, Image as ImageIcon, Plus, Trash2, Type, Upload, Video, X } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { useAppDispatch, useAppSelector } from "../../../hooks/reduxHooks";
import { fetchLessonContents } from "../../../features/courses/lessonSlice";
import courseAPI from "../../../features/courses/courseAPI";
import type { Lesson, ContentBlock, QuizQuestion } from "../../../features/courses/types";
import { QuizQuestionModal } from "./AssessmentModal";

const EMPTY_ARRAY: any[] = [];

export function LessonModal({
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
  const dispatch = useAppDispatch();
  const [title, setTitle] = useState(lesson?.title || "");
  
  const reduxContents = useAppSelector((state) => (lesson && state.lessons.contents[lesson.id]) ? state.lessons.contents[lesson.id] : EMPTY_ARRAY);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [uploadingBlocks, setUploadingBlocks] = useState<Record<string, boolean>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (lesson && courseId) {
       dispatch(fetchLessonContents({ courseId, lessonId: lesson.id }));
    }
  }, [lesson?.id, courseId, dispatch]);

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title);

      const uiBlocks = reduxContents
        .filter(c => c.content_type !== 'quiz')
        .map(c => ({
          id: c.id,
          type: (c.content_type === 'note' ? 'text' : c.content_type) as any,
          content: c.note_text || c.video_url || c.file || c.description || '',
          settings: { caption: c.description },
          title: c.title
        }));
      setBlocks(uiBlocks);

      const quizContent = reduxContents.find(c => c.content_type === 'quiz');
      if (quizContent) {
        setQuizEnabled(true);
        setQuizQuestions(quizContent.quiz?.questions || []);
      } else {
        setQuizEnabled(false);
        setQuizQuestions([]);
      }
    } else {
      setTitle("");
      setBlocks([]);
      setQuizEnabled(false);
      setQuizQuestions([]);
    }
  }, [lesson, reduxContents.length]);

  const addBlock = (type: "text" | "video" | "image" | "file") => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (id: string | number, content: string) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockCaption = (id: string | number, caption: string) => {
    setBlocks(blocks.map((b) => b.id === id ? { ...b, settings: { ...b.settings, caption } } : b));
  };

  const removeBlock = (id: string | number) => {
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

  const handleFileUploadWrapper = async (id: string | number, file: File, type: 'image' | 'video' | 'file') => {
    setUploadingBlocks((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        updateBlock(id, response.url);
      }
    } catch (error) {
      console.error(`${type} upload failed:`, error);
      alert(`Failed to upload ${type}. Please try again.`);
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

    if (quizEnabled && quizQuestions.length === 0) {
      alert("Please add at least one question to the quiz or disable it.");
      return;
    }

    let finalBlocks = [...blocks];
    if (quizEnabled) {
      const existingQuizBlock = reduxContents.find(c => c.content_type === 'quiz');
      finalBlocks.push({
        id: existingQuizBlock?.id || `new-quiz-${Date.now()}`,
        type: 'quiz',
        content: 'Lesson Quiz ....',
        quiz: { questions: quizQuestions }
      });
    }

    const newLesson: Lesson = {
      id: lesson?.id || Date.now(),
      course: courseId,
      title,
      order: lesson?.order || (totalLessons + 1),
      blocks: finalBlocks,
    };

    onSave(newLesson);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {lesson ? "Edit Lesson" : "Add New Lesson"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isSaving}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
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
                  <div key={block.id} className="group relative bg-gray-50 rounded-lg border border-gray-200 p-4 transition-all">
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveBlock(index, "up")}
                        disabled={index === 0}
                        className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveBlock(index, "down")}
                        disabled={index === blocks.length - 1}
                        className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:text-blue-600 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-white border border-gray-200 rounded text-[10px] font-bold flex items-center justify-center text-gray-400">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter flex items-center gap-1.5">
                          {block.type === 'text' && <Type className="w-3.5 h-3.5 text-blue-500" />}
                          {block.type === 'video' && <Video className="w-3.5 h-3.5 text-blue-500" />}
                          {block.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                          {block.type === 'file' && <FileIcon className="w-3.5 h-3.5 text-blue-500" />}
                          {block.type} Section
                        </span>
                      </div>
                      <button
                        onClick={() => removeBlock(block.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TEXT */}
                    {block.type === "text" && (
                      <RichTextEditor
                        value={block.content || ""}
                        onChange={(val) => updateBlock(block.id, val)}
                        disabled={isSaving}
                        placeholder="Enter your lesson content here... Use the toolbar above to format your text (Bold, Italic, lists, etc.)"
                      />
                    )}

                    {/* VIDEO */}
                    {block.type === "video" && (
                      <div className="space-y-2">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-purple-50 rounded-xl border border-purple-100">
                            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-purple-600 animate-pulse">Uploading Video...</span>
                          </div>
                        ) : block.content && (block.content.startsWith('blob:') || block.content.startsWith('data:') || block.content.includes('/media/course_media/')) ? (
                          <video
                            src={block.content}
                            controls
                            className="w-full rounded-lg max-h-48 bg-black shadow-inner"
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
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="Paste a Video URL (YouTube, Vimeo, etc.)"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-100" />
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span>
                          <div className="flex-1 border-t border-gray-100" />
                        </div>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_video'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUploadWrapper(block.id, file, 'video');
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_video']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-purple-200 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 text-sm font-medium transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Video File
                        </button>
                        <input
                          type="text"
                          value={block.settings?.caption || ""}
                          onChange={(e) => updateBlockCaption(block.id, e.target.value)}
                          className="w-full px-4 py-1.5 bg-white border border-gray-50 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                          placeholder="Video caption (optional)"
                        />
                      </div>
                    )}

                    {/* IMAGE */}
                    {block.type === "image" && (
                      <div className="space-y-2">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-green-50 rounded-xl border border-green-100">
                            <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-green-600 animate-pulse">Uploading Image...</span>
                          </div>
                        ) : block.content && (
                          <div className="relative group/img">
                            <img
                              src={block.content}
                              alt="Section"
                              className="w-full rounded-lg max-h-64 object-cover shadow-sm transition-opacity group-hover/img:opacity-90"
                            />
                            <button
                              onClick={() => updateBlock(block.id, "")}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <input
                          type="text"
                          value={block.content.startsWith('data:') ? '' : block.content}
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                          placeholder="Paste an Image URL"
                        />
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-gray-100" />
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">or</span>
                          <div className="flex-1 border-t border-gray-100" />
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_image'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUploadWrapper(block.id, file, 'image');
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_image']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-green-200 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 hover:border-green-400 text-sm font-medium transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          Upload Image File
                        </button>
                        <input
                          type="text"
                          value={block.settings?.caption || ""}
                          onChange={(e) => updateBlockCaption(block.id, e.target.value)}
                          className="w-full px-4 py-1.5 bg-white border border-gray-50 rounded-lg text-xs text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                          placeholder="Image caption (optional)"
                        />
                      </div>
                    )}

                    {/* FILE */}
                    {block.type === "file" && (
                      <div className="space-y-4">
                        {uploadingBlocks[block.id] ? (
                          <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-orange-50 rounded-xl border border-orange-100">
                            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-orange-600 animate-pulse">Uploading File...</span>
                          </div>
                        ) : block.content ? (
                          <div className="bg-white border-2 border-orange-50 rounded-xl p-4 flex items-center gap-4 shadow-sm group/file hover:border-orange-200 transition-all">
                            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/file:scale-110 transition-transform">
                              <FileIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {block.content.split('/').pop()}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Resource Document</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateBlock(block.id, "")}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                title="Remove File"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                            <FileIcon className="w-10 h-10 text-gray-200 mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-gray-400 italic">No file selected yet</p>
                          </div>
                        )}

                        <input
                          type="file"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[block.id + '_file'] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUploadWrapper(block.id, file, 'file');
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[block.id + '_file']?.click()}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-orange-500 hover:text-orange-600 text-sm font-medium transition-all active:scale-[0.98] cursor-pointer"
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
          <div className="border-t border-gray-100 pt-8 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Add Lesson Quiz (Optional)
                </h3>
                <p className="text-xs text-gray-400 mt-1 italic">
                  Test learners after this lesson
                </p>
              </div>
              <button
              onClick={() => setQuizEnabled(!quizEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all cursor-pointer ${
                quizEnabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  quizEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {quizEnabled && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-500 tracking-wider">
                  {quizQuestions.length} question{quizQuestions.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setShowQuizBuilder(true)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
              </div>

              {quizQuestions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No questions added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {quizQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="bg-white p-4 rounded-lg border border-gray-100 flex items-start justify-between hover:border-blue-200"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm font-semibold text-gray-800 leading-snug">
                          {index + 1}. {q.question}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setQuizQuestions(
                            quizQuestions.filter((question) => question.id !== q.id)
                          );
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-6 py-5">
        <div className="flex items-center justify-between gap-6">

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-medium text-gray-400 mr-1">Add section:</span>
            <button
              onClick={() => addBlock("text")}
              className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
              title="Add Text"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => addBlock("video")}
              className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
              title="Add Video"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => addBlock("image")}
              className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
              title="Add Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => addBlock("file")}
              className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
              title="Add File"
            >
              <FileIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex sm:hidden items-center gap-1">
             <button onClick={() => addBlock("text")} className="p-2 bg-white rounded-lg border border-gray-200"><Type className="w-4 h-4 text-blue-600"/></button>
             <button onClick={() => addBlock("video")} className="p-2 bg-white rounded-lg border border-gray-200"><Video className="w-4 h-4 text-blue-600"/></button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all disabled:bg-blue-300 flex items-center gap-2 cursor-pointer"
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

      {/* Nested Quiz Builder Modal */}
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
