import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, BookOpen,
  File as FileIcon, Image as ImageIcon,
  Link as LinkIcon, Trash2, Type, Upload, Video, X,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import type { ContentBlock, QuizQuestion } from "../../../features/courses/types";
import { QuizQuestionModal } from "./AssessmentModal";
import courseAPI from "../../../features/courses/courseAPI";

const BLOCK_TYPES = [
  { type: "text", label: "Text", Icon: Type, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  { type: "video", label: "Video", Icon: Video, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  { type: "image", label: "Image", Icon: ImageIcon, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
  { type: "file", label: "File", Icon: FileIcon, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
] as const;

type BlockType = "text" | "video" | "image" | "file";

export function LessonModal({
  lesson,
  onClose,
  onSave,
  isSaving = false,
}: {
  lesson: any;
  onClose: () => void;
  onSave: (data: { id?: string | number; title: string; blocks: ContentBlock[] }) => void;
  courseId: number;
  totalLessons: number;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [uploadingBlocks, setUploadingBlocks] = useState<Record<string, boolean>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getMediaUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) return url;
    return `http://localhost:8000${url.startsWith("/") ? "" : "/"}${url}`;
  };

  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || "");
      setBlocks(lesson.blocks && lesson.blocks.length > 0 ? lesson.blocks : []);
    } else {
      setTitle("");
      setBlocks([]);
      setQuizQuestions([]);
    }
  }, [lesson?.id]); // use lesson.id so re-opening same modal doesn't reset

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (id: string | number, content: string) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockField = (id: string | number, field: keyof ContentBlock, value: any) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBlock = (id: string | number) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newBlocks.length) {
      [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
      setBlocks(newBlocks);
    }
  };

  const handleFileUploadWrapper = async (id: string | number, file: File, type: "image" | "video" | "file") => {
    setUploadingBlocks(prev => ({ ...prev, [id]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        updateBlock(id, response.data.file);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error(`${type} upload failed:`, error);
      alert(`Failed to upload ${type}. Please try again.`);
    } finally {
      setUploadingBlocks(prev => ({ ...prev, [id]: false }));
    }
  };

  // Strip HTML and check if there's actual text content
  const isBlockEmpty = (block: ContentBlock) => {
    if (block.type !== "text") return !block.content?.trim();
    const stripped = block.content?.replace(/<[^>]*>/g, "").trim();
    return !stripped;
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please provide a title for this content item");
      return;
    }
    if (blocks.length === 0) {
      alert("Please add at least one content block");
      return;
    }
    if (Object.values(uploadingBlocks).some(Boolean)) {
      alert("Please wait for all media to finish uploading before saving.");
      return;
    }
    if (blocks.some(isBlockEmpty)) {
      alert("Please fill in all content blocks");
      return;
    }
    onSave({ id: lesson?.id, title, blocks });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {lesson ? "Edit Content Item" : "Add Content Item"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isSaving}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 text-sm"
              placeholder="e.g., Introduction to the module"
            />
          </div>


          {/* Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Content Blocks</h3>
              <span className="text-xs text-gray-400">{blocks.length} block{blocks.length !== 1 ? "s" : ""}</span>
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No content blocks yet.</p>
                <p className="text-xs text-gray-300 mt-1">Use the toolbar below to add your first block.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => {
                  const meta = BLOCK_TYPES.find(b => b.type === block.type)!;
                  return (
                    <div key={block.id} className="group relative bg-gray-50 rounded-xl border border-gray-200 p-4 transition-all">
                      {/* Move up/down */}
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

                      {/* Block header row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-white border border-gray-200 rounded text-[10px] font-bold flex items-center justify-center text-gray-400">
                            {index + 1}
                          </span>
                          <span className={`text-xs font-bold uppercase tracking-tighter flex items-center gap-1.5 ${meta.color}`}>
                            <meta.Icon className="w-3.5 h-3.5" />
                            {meta.label} Block
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
                          onChange={val => updateBlock(block.id, val)}
                          disabled={isSaving}
                          placeholder="Write your content here — supports headings, bold, italic, links, lists and more..."
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
                          ) : block.content && (block.content.startsWith("blob:") || block.content.startsWith("data:") || block.content.includes("/media/")) ? (
                            <video src={getMediaUrl(block.content)} controls className="w-full rounded-lg max-h-48 bg-black shadow-inner" />
                          ) : block.content ? (
                            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                              <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
                              <span className="text-xs text-gray-600 truncate">{block.content}</span>
                            </div>
                          ) : null}
                          <input
                            type="text"
                            value={block.content.startsWith("blob:") || block.content.startsWith("data:") ? "" : block.content}
                            onChange={e => updateBlock(block.id, e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Paste a Video URL (YouTube, Vimeo…)"
                          />
                          <input
                            type="file" accept="video/*" className="hidden"
                            ref={el => { fileInputRefs.current[block.id + "_video"] = el; }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUploadWrapper(block.id, f, "video"); }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[block.id + "_video"]?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-purple-200 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 text-sm font-medium transition-all cursor-pointer"
                          >
                            <Upload className="w-4 h-4" /> Upload Video File
                          </button>
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
                          ) : block.content ? (
                            <div className="relative group/img">
                              <img src={getMediaUrl(block.content)} alt="Section" className="w-full rounded-lg max-h-64 object-cover shadow-sm" />
                              <button
                                onClick={() => updateBlock(block.id, "")}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : null}
                          <input
                            type="text"
                            value={block.content.startsWith("data:") ? "" : block.content}
                            onChange={e => updateBlock(block.id, e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Paste an Image URL"
                          />
                          <input
                            type="file" accept="image/*" className="hidden"
                            ref={el => { fileInputRefs.current[block.id + "_image"] = el; }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUploadWrapper(block.id, f, "image"); }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[block.id + "_image"]?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-green-200 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 hover:border-green-400 text-sm font-medium transition-all cursor-pointer"
                          >
                            <Upload className="w-4 h-4" /> Upload Image File
                          </button>
                        </div>
                      )}

                      {/* FILE */}
                      {block.type === "file" && (
                        <div className="space-y-3">
                          {uploadingBlocks[block.id] ? (
                            <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-orange-50 rounded-xl border border-orange-100">
                              <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                              <span className="text-xs font-semibold text-orange-600 animate-pulse">Uploading File...</span>
                            </div>
                          ) : block.content ? (
                            <div className="bg-white border-2 border-orange-50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-orange-200 transition-all">
                              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileIcon className="w-6 h-6 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <a href={getMediaUrl(block.content)} target="_blank" rel="noopener noreferrer"
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline truncate block">
                                  {block.content.split("/").pop()}
                                </a>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Resource Document</p>
                              </div>
                              <button
                                onClick={() => updateBlock(block.id, "")}
                                className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                title="Remove File"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                              <FileIcon className="w-10 h-10 text-gray-200 mx-auto mb-2 opacity-50" />
                              <p className="text-xs text-gray-400 italic">No file selected yet</p>
                            </div>
                          )}
                          <input
                            type="file" className="hidden"
                            ref={el => { fileInputRefs.current[block.id + "_file"] = el; }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUploadWrapper(block.id, f, "file"); }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[block.id + "_file"]?.click()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-orange-500 hover:text-orange-600 text-sm font-medium transition-all cursor-pointer"
                          >
                            <FileIcon className="w-4 h-4" />
                            {block.content ? "Change File" : "Choose File"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/70 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Add block buttons — left side */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-400 mr-1 hidden sm:inline">Add block:</span>
              {BLOCK_TYPES.map(({ type, Icon, color }) => (
                <button
                  key={type}
                  onClick={() => addBlock(type as BlockType)}
                  disabled={isSaving}
                  title={`Add ${type} block`}
                  className={`p-2.5 bg-white border border-gray-200 ${color} rounded-lg hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-40`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>

            {/* Cancel / Save — right side */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-white text-sm font-medium transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSaving ? "Saving…" : lesson ? "Update Item" : "Save Item"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showQuizBuilder && (
        <QuizQuestionModal
          onClose={() => setShowQuizBuilder(false)}
          onSave={question => {
            setQuizQuestions([...quizQuestions, question]);
            setShowQuizBuilder(false);
          }}
        />
      )}
    </div>
  );
}
