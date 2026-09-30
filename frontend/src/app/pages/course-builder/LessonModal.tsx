import React, { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  File as FileIcon,
  Image as ImageIcon,
  Plus,
  Trash2,
  Type,
  Upload,
  Video,
  X,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { FlipCard } from "../../components/course";
import type {
  ContentBlock,
  FlipCardSide,
  QuizQuestion,
} from "../../../features/courses/types";
import { QuizQuestionModal } from "./AssessmentModal";
import courseAPI from "../../../features/courses/courseAPI";

const BLOCK_TYPES = [
  {
    type: "text",
    label: "Text",
    Icon: Type,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    type: "video",
    label: "Video",
    Icon: Video,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  {
    type: "image",
    label: "Image",
    Icon: ImageIcon,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  {
    type: "file",
    label: "File",
    Icon: FileIcon,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  {
    type: "expandable_section",
    label: "Expandable Section",
    Icon: ChevronDown,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    type: "flip_card",
    label: "Flip Card",
    Icon: BookOpen,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
] as const;

type BlockType =
  | "text"
  | "video"
  | "image"
  | "file"
  | "expandable_section"
  | "flip_card"
  | "key_concepts";

export function LessonModal({
  lesson,
  onClose,
  onSave,
  isSaving = false,
}: {
  lesson: any;
  onClose: () => void;
  onSave: (data: {
    id?: string | number;
    title: string;
    blocks: ContentBlock[];
  }) => void;
  courseId: number;
  totalLessons: number;
  isSaving?: boolean;
}) {
  const [title, setTitle] = useState(lesson?.title || "");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [uploadingBlocks, setUploadingBlocks] = useState<
    Record<string, boolean>
  >({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  class FlipCardPreviewErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
      console.error("FlipCard preview error:", error, info);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Flip card preview is unavailable.
          </div>
        );
      }
      return this.props.children;
    }
  }

  const getMediaUrl = (url: string | null) => {
    if (!url) return "";
    if (
      url.startsWith("http") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    )
      return url;
    return `http://localhost:8000${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const normalizeFlipCardSide = (side: any): FlipCardSide => {
    if (!side) {
      return { type: "text", text: "" };
    }
    if (typeof side === "string") {
      return { type: "text", text: side };
    }
    return {
      type: side.type || "text",
      text: side.text || "",
      image: side.image || "",
      imageAlt: side.imageAlt || "",
    };
  };

  const isFlipCardSideValid = (side: any) => {
    const normalized = normalizeFlipCardSide(side);
    const hasText = !!normalized.text?.trim();
    const hasImage = !!normalized.image?.trim();
    const hasAlt = !!normalized.imageAlt?.trim();

    if (normalized.type === "image") {
      return hasImage && hasAlt;
    }
    if (normalized.type === "image_text") {
      return hasImage && hasText && hasAlt;
    }
    return hasText;
  };

  const isFlipCardBlockValid = (block: ContentBlock) => {
    if (block.type !== "flip_card" && block.type !== "key_concepts") {
      return true;
    }
    const cards = block.cards || [];
    if (cards.length === 0) return false;
    return cards.every((card: any) => {
      return isFlipCardSideValid(card.front) && isFlipCardSideValid(card.back);
    });
  };

  const createEmptyFlipCardCard = (): {
    front: FlipCardSide;
    back: FlipCardSide;
  } => ({
    front: { type: "text", text: "" },
    back: { type: "text", text: "" },
  });

  const isUploadedVideoContent = (url: string | null) => {
    if (!url) return false;
    return (
      url.startsWith("blob:") ||
      url.startsWith("data:video/") ||
      url.includes("/media/")
    );
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

  // Lock background scrolling while modal is open to ensure inner modal
  // scroll works reliably on desktop and mobile (prevents scroll chaining).
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock =
      type === "flip_card" || type === "key_concepts"
        ? {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: "",
            cards: [createEmptyFlipCardCard()],
          }
        : type === "expandable_section"
          ? {
              id: Math.random().toString(36).substr(2, 9),
              type,
              content: "",
              items: [
                {
                  id: Math.random().toString(36).substr(2, 9),
                  title: "New Section",
                  content: "",
                },
              ],
              settings: {
                defaultOpen: "first-expanded",
                allowMultiple: false,
                showNumbering: false,
              },
            }
          : { id: Math.random().toString(36).substr(2, 9), type, content: "" };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const updateBlock = (id: string | number, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockField = (
    id: string | number,
    field: keyof ContentBlock,
    value: any,
  ) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );
  };

  const updateExpandableSectionItem = (
    blockId: string | number,
    itemIndex: number,
    field: "title" | "content",
    value: string,
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "expandable_section") {
          return block;
        }

        const items = [...(block.items || [])];
        items[itemIndex] = { ...(items[itemIndex] || {}), [field]: value };
        return { ...block, items };
      }),
    );
  };

  const addExpandableSectionItem = (blockId: string | number) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "expandable_section") {
          return block;
        }

        const nextIndex = (block.items || []).length + 1;
        const newItem = {
          id: Math.random().toString(36).substr(2, 9),
          title: `Section ${nextIndex}`,
          content: "",
        };

        return {
          ...block,
          items: [...(block.items || []), newItem],
        };
      }),
    );
  };

  const moveExpandableSectionItem = (
    blockId: string | number,
    itemIndex: number,
    direction: "up" | "down",
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "expandable_section") {
          return block;
        }

        const items = [...(block.items || [])];
        const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
        if (targetIndex < 0 || targetIndex >= items.length) return block;

        [items[itemIndex], items[targetIndex]] = [
          items[targetIndex],
          items[itemIndex],
        ];
        return { ...block, items };
      }),
    );
  };

  const removeExpandableSectionItem = (
    blockId: string | number,
    itemIndex: number,
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || block.type !== "expandable_section") {
          return block;
        }

        const items = [...(block.items || [])];
        if (items.length <= 1) return block;
        return {
          ...block,
          items: items.filter((_, index) => index !== itemIndex),
        };
      }),
    );
  };

  const updateFlipCardSide = (
    blockId: string | number,
    cardIndex: number,
    sideKey: "front" | "back",
    value: any,
  ) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const cards = (block.cards || []).map((card: any, idx: number) => {
          if (idx !== cardIndex) return card;
          return {
            ...card,
            [sideKey]: value,
          };
        });
        return { ...block, cards };
      }),
    );
  };

  const handleFlipCardImageUpload = async (
    blockId: string | number,
    cardIndex: number,
    sideKey: "front" | "back",
    file: File,
  ) => {
    const uploadKey = `${blockId}_${cardIndex}_${sideKey}`;
    setUploadingBlocks((prev) => ({ ...prev, [uploadKey]: true }));
    try {
      const response = await courseAPI.uploadMedia(file);
      if (response.success) {
        const block = blocks.find((b) => b.id === blockId);
        const currentSide = block?.cards?.[cardIndex]?.[sideKey];
        const sideData = normalizeFlipCardSide(currentSide);
        updateFlipCardSide(blockId, cardIndex, sideKey, {
          ...sideData,
          image: response.data.file,
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Flip card image upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingBlocks((prev) => ({ ...prev, [uploadKey]: false }));
    }
  };

  const removeFlipCardImage = (
    blockId: string | number,
    cardIndex: number,
    sideKey: "front" | "back",
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    const currentSide = block?.cards?.[cardIndex]?.[sideKey];
    const sideData = normalizeFlipCardSide(currentSide);
    updateFlipCardSide(blockId, cardIndex, sideKey, {
      ...sideData,
      image: "",
      imageAlt: "",
    });
  };

  const removeBlock = (id: string | number) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
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

  const handleFileUploadWrapper = async (
    id: string | number,
    file: File,
    type: "image" | "video" | "file",
  ) => {
    setUploadingBlocks((prev) => ({ ...prev, [id]: true }));
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
      setUploadingBlocks((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Strip HTML and check if there's actual text content
  const isBlockEmpty = (block: ContentBlock) => {
    if (block.type === "text") {
      const stripped = block.content?.replace(/<[^>]*>/g, "").trim();
      return !stripped;
    }
    if (block.type === "expandable_section") {
      const items = block.items || [];
      if (items.length === 0) {
        return true;
      }

      return items.every((item) => {
        const titleEmpty = !item.title?.trim();
        const contentEmpty = !item.content?.replace(/<[^>]*>/g, "").trim();
        return titleEmpty || contentEmpty;
      });
    }
    if (block.type === "flip_card" || block.type === "key_concepts") {
      const cards = block.cards || [];
      if (cards.length === 0) {
        return true;
      }
      return cards.every(
        (card: any) =>
          !normalizeFlipCardSide(card.front).text?.trim() &&
          !normalizeFlipCardSide(card.back).text?.trim() &&
          !normalizeFlipCardSide(card.front).image?.trim() &&
          !normalizeFlipCardSide(card.back).image?.trim(),
      );
    }
    return !block.content?.trim();
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
    if (blocks.some((block) => !isFlipCardBlockValid(block))) {
      alert(
        "Please fill in all flip card sides and image alt text before saving.",
      );
      return;
    }
    if (
      blocks.some(
        (block) =>
          block.type === "video" && !isUploadedVideoContent(block.content),
      )
    ) {
      alert("Please upload a video file instead of using a video link.");
      return;
    }
    onSave({ id: lesson?.id, title, blocks });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {lesson ? "Edit Content Item" : "Add Content Item"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              disabled={isSaving}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 text-sm"
              placeholder="e.g., Introduction to the module"
            />
          </div>

          {/* Blocks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Content Blocks
              </h3>
              <span className="text-xs text-gray-400">
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
              </span>
            </div>

            {blocks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No content blocks yet.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Use the toolbar below to add your first block.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => {
                  const meta = BLOCK_TYPES.find((b) => b.type === block.type)!;
                  return (
                    <div
                      key={block.id}
                      className="group relative bg-gray-50 rounded-xl border border-gray-200 p-4 transition-all"
                    >
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
                          <span
                            className={`text-xs font-bold uppercase tracking-tighter flex items-center gap-1.5 ${meta.color}`}
                          >
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
                          onChange={(val) => updateBlock(block.id, val)}
                          disabled={isSaving}
                          placeholder="Write your content here — supports headings, bold, italic, links, lists and more..."
                        />
                      )}

                      {/* VIDEO */}
                      {block.type === "video" && (
                        <div className="space-y-3">
                          {uploadingBlocks[block.id] ? (
                            <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-purple-50 rounded-xl border border-purple-100">
                              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                              <span className="text-xs font-semibold text-purple-600 animate-pulse">
                                Uploading Video...
                              </span>
                            </div>
                          ) : block.content &&
                            isUploadedVideoContent(block.content) ? (
                            <div className="relative group/video">
                              <video
                                src={getMediaUrl(block.content)}
                                controls
                                className="w-full rounded-lg max-h-48 bg-black shadow-inner"
                              />
                              <button
                                onClick={() => updateBlock(block.id, "")}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg cursor-pointer"
                                title="Remove Video"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : block.content ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                              <Video className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-amber-800">
                                  Video links are no longer supported.
                                </p>
                                <p className="text-xs text-amber-700 truncate mt-1">
                                  {block.content}
                                </p>
                              </div>
                              <button
                                onClick={() => updateBlock(block.id, "")}
                                className="p-1 text-amber-700 hover:text-red-600 hover:bg-white rounded cursor-pointer"
                                title="Remove Link"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-8 border-2 border-dashed border-purple-100 rounded-xl bg-purple-50/50">
                              <Video className="w-10 h-10 text-purple-200 mx-auto mb-2 opacity-70" />
                              <p className="text-xs text-purple-500 italic">
                                No video uploaded yet
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[block.id + "_video"] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f)
                                handleFileUploadWrapper(block.id, f, "video");
                            }}
                          />
                          <button
                            onClick={() =>
                              fileInputRefs.current[
                                block.id + "_video"
                              ]?.click()
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-purple-200 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 hover:border-purple-400 text-sm font-medium transition-all cursor-pointer"
                          >
                            <Upload className="w-4 h-4" />{" "}
                            {block.content
                              ? "Replace Video File"
                              : "Upload Video File"}
                          </button>
                        </div>
                      )}

                      {/* IMAGE */}
                      {block.type === "image" && (
                        <div className="space-y-2">
                          {uploadingBlocks[block.id] ? (
                            <div className="w-full flex flex-col items-center justify-center gap-3 py-12 bg-green-50 rounded-xl border border-green-100">
                              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
                              <span className="text-xs font-semibold text-green-600 animate-pulse">
                                Uploading Image...
                              </span>
                            </div>
                          ) : block.content ? (
                            <div className="relative group/img">
                              <img
                                src={getMediaUrl(block.content)}
                                alt="Section"
                                className="w-full rounded-lg max-h-64 object-cover shadow-sm"
                              />
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
                            value={
                              block.content.startsWith("data:")
                                ? ""
                                : block.content
                            }
                            onChange={(e) =>
                              updateBlock(block.id, e.target.value)
                            }
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Paste an Image URL"
                          />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[block.id + "_image"] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f)
                                handleFileUploadWrapper(block.id, f, "image");
                            }}
                          />
                          <button
                            onClick={() =>
                              fileInputRefs.current[
                                block.id + "_image"
                              ]?.click()
                            }
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
                              <span className="text-xs font-semibold text-orange-600 animate-pulse">
                                Uploading File...
                              </span>
                            </div>
                          ) : block.content ? (
                            <div className="bg-white border-2 border-orange-50 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-orange-200 transition-all">
                              <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileIcon className="w-6 h-6 text-orange-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <a
                                  href={getMediaUrl(block.content)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline truncate block"
                                >
                                  {block.content.split("/").pop()}
                                </a>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">
                                  Resource Document
                                </p>
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
                              <p className="text-xs text-gray-400 italic">
                                No file selected yet
                              </p>
                            </div>
                          )}
                          <input
                            type="file"
                            className="hidden"
                            ref={(el) => {
                              fileInputRefs.current[block.id + "_file"] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f)
                                handleFileUploadWrapper(block.id, f, "file");
                            }}
                          />
                          <button
                            onClick={() =>
                              fileInputRefs.current[block.id + "_file"]?.click()
                            }
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-orange-500 hover:text-orange-600 text-sm font-medium transition-all cursor-pointer"
                          >
                            <FileIcon className="w-4 h-4" />
                            {block.content ? "Change File" : "Choose File"}
                          </button>
                        </div>
                      )}

                      {/* EXPANDABLE SECTION */}
                      {block.type === "expandable_section" && (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input
                                type="radio"
                                checked={
                                  block.settings?.defaultOpen !== "collapsed"
                                }
                                onChange={() =>
                                  updateBlockField(block.id, "settings", {
                                    ...block.settings,
                                    defaultOpen: "first-expanded",
                                  })
                                }
                                className="h-4 w-4 text-emerald-600"
                              />
                              Start first section expanded
                            </label>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input
                                type="radio"
                                checked={
                                  block.settings?.defaultOpen === "collapsed"
                                }
                                onChange={() =>
                                  updateBlockField(block.id, "settings", {
                                    ...block.settings,
                                    defaultOpen: "collapsed",
                                  })
                                }
                                className="h-4 w-4 text-emerald-600"
                              />
                              Start collapsed
                            </label>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={!!block.settings?.allowMultiple}
                                onChange={(e) =>
                                  updateBlockField(block.id, "settings", {
                                    ...block.settings,
                                    allowMultiple: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded text-emerald-600"
                              />
                              Allow multiple open
                            </label>
                          </div>

                          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={!!block.settings?.showNumbering}
                              onChange={(e) =>
                                updateBlockField(block.id, "settings", {
                                  ...block.settings,
                                  showNumbering: e.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded text-emerald-600"
                            />
                            Show section numbering
                          </label>

                          <div className="space-y-3">
                            {(block.items || []).map((item, itemIndex) => (
                              <div
                                key={item.id}
                                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                      {itemIndex + 1}
                                    </span>
                                    Section
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveExpandableSectionItem(
                                          block.id,
                                          itemIndex,
                                          "up",
                                        )
                                      }
                                      disabled={itemIndex === 0}
                                      className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-emerald-600 disabled:opacity-30"
                                    >
                                      <ArrowUp className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveExpandableSectionItem(
                                          block.id,
                                          itemIndex,
                                          "down",
                                        )
                                      }
                                      disabled={
                                        itemIndex ===
                                        (block.items || []).length - 1
                                      }
                                      className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:text-emerald-600 disabled:opacity-30"
                                    >
                                      <ArrowDown className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={(block.items || []).length <= 1}
                                      onClick={() =>
                                        removeExpandableSectionItem(
                                          block.id,
                                          itemIndex,
                                        )
                                      }
                                      className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-30"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  value={item.title}
                                  onChange={(e) =>
                                    updateExpandableSectionItem(
                                      block.id,
                                      itemIndex,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                  placeholder="Section title"
                                />

                                <RichTextEditor
                                  value={item.content || ""}
                                  onChange={(value) =>
                                    updateExpandableSectionItem(
                                      block.id,
                                      itemIndex,
                                      "content",
                                      value,
                                    )
                                  }
                                  disabled={isSaving}
                                  placeholder="Add the content for this expandable section..."
                                />
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => addExpandableSectionItem(block.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                          >
                            <Plus className="h-4 w-4" />
                            Add Section
                          </button>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                              Live Preview
                            </p>
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              {(block.items || []).map((item, previewIndex) => (
                                <div
                                  key={`${block.id}-preview-${item.id || previewIndex}`}
                                  className="border-b border-slate-200 last:border-b-0"
                                >
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700"
                                  >
                                    <span className="flex items-center gap-2">
                                      {block.settings?.showNumbering && (
                                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                                          {previewIndex + 1}
                                        </span>
                                      )}
                                      {item.title ||
                                        `Section ${previewIndex + 1}`}
                                    </span>
                                    <ArrowDown className="h-4 w-4 text-slate-400" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* KEY CONCEPTS */}
                      {(block.type === "flip_card" ||
                        block.type === "key_concepts") && (
                        <div className="space-y-3">
                          <div className="space-y-4">
                            {(block.cards || []).map(
                              (card: any, ci: number) => {
                                const frontSide = normalizeFlipCardSide(
                                  card.front,
                                );
                                const backSide = normalizeFlipCardSide(
                                  card.back,
                                );
                                const frontUploadKey = `${block.id}_${ci}_front`;
                                const backUploadKey = `${block.id}_${ci}_back`;

                                return (
                                  <div
                                    key={ci}
                                    className="bg-white border border-gray-100 rounded-lg p-4"
                                  >
                                    <div className="flex items-center justify-between gap-3 mb-4">
                                      <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                          Flip Card {ci + 1}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Configure each side independently.
                                        </p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          updateBlockField(
                                            block.id,
                                            "cards",
                                            (block.cards || []).filter(
                                              (_: any, idx: number) =>
                                                idx !== ci,
                                            ),
                                          )
                                        }
                                        className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                      >
                                        Remove card
                                      </button>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                      {[
                                        {
                                          label: "Front",
                                          sideKey: "front" as const,
                                          sideData: frontSide,
                                        },
                                        {
                                          label: "Back",
                                          sideKey: "back" as const,
                                          sideData: backSide,
                                        },
                                      ].map(({ label, sideKey, sideData }) => (
                                        <div
                                          key={sideKey}
                                          className="space-y-3 rounded-3xl border border-slate-200 p-4 bg-slate-50 dark:bg-slate-950/50 dark:border-slate-700"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                              {label} Side
                                            </p>
                                            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                              {sideData.type.replace("_", ".")}
                                            </span>
                                          </div>

                                          <div className="grid gap-2">
                                            {(
                                              [
                                                "text",
                                                "image",
                                                "image_text",
                                              ] as const
                                            ).map((option) => (
                                              <label
                                                key={option}
                                                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                                                  sideData.type === option
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                              >
                                                <input
                                                  type="radio"
                                                  name={`${block.id}-${ci}-${sideKey}-type`}
                                                  value={option}
                                                  checked={
                                                    sideData.type === option
                                                  }
                                                  onChange={() =>
                                                    updateFlipCardSide(
                                                      block.id,
                                                      ci,
                                                      sideKey,
                                                      {
                                                        ...sideData,
                                                        type: option,
                                                      },
                                                    )
                                                  }
                                                  className="h-4 w-4 text-indigo-600"
                                                />
                                                <span>
                                                  {option === "text"
                                                    ? "Text"
                                                    : option === "image"
                                                      ? "Image"
                                                      : "Image + Text"}
                                                </span>
                                              </label>
                                            ))}
                                          </div>

                                          {(sideData.type === "text" ||
                                            sideData.type === "image_text") && (
                                            <div className="space-y-2">
                                              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                Text
                                              </label>
                                              <textarea
                                                value={sideData.text || ""}
                                                onChange={(e) =>
                                                  updateFlipCardSide(
                                                    block.id,
                                                    ci,
                                                    sideKey,
                                                    {
                                                      ...sideData,
                                                      text: e.target.value,
                                                    },
                                                  )
                                                }
                                                className="w-full min-h-[120px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/10"
                                                placeholder="Enter the text for this side"
                                              />
                                            </div>
                                          )}

                                          {(sideData.type === "image" ||
                                            sideData.type === "image_text") && (
                                            <div className="space-y-3">
                                              <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                  Image
                                                </label>

                                                {sideData.image ? (
                                                  <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
                                                    <img
                                                      src={getMediaUrl(
                                                        sideData.image,
                                                      )}
                                                      alt={
                                                        sideData.imageAlt ||
                                                        "Flip card image"
                                                      }
                                                      className="w-full h-auto object-contain"
                                                    />
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        removeFlipCardImage(
                                                          block.id,
                                                          ci,
                                                          sideKey,
                                                        )
                                                      }
                                                      className="absolute right-2 top-2 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900"
                                                    >
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
                                                    No image selected
                                                  </div>
                                                )}
                                              </div>

                                              <div className="flex flex-col gap-2">
                                                <input
                                                  type="file"
                                                  className="hidden"
                                                  ref={(el) => {
                                                    fileInputRefs.current[
                                                      `${block.id}_${ci}_${sideKey}_image`
                                                    ] = el;
                                                  }}
                                                  accept="image/*"
                                                  onChange={(e) => {
                                                    const file =
                                                      e.target.files?.[0];
                                                    if (file)
                                                      handleFlipCardImageUpload(
                                                        block.id,
                                                        ci,
                                                        sideKey,
                                                        file,
                                                      );
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    fileInputRefs.current[
                                                      `${block.id}_${ci}_${sideKey}_image`
                                                    ]?.click()
                                                  }
                                                  className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                                                >
                                                  {uploadingBlocks[
                                                    frontUploadKey
                                                  ] && sideKey === "front"
                                                    ? "Uploading…"
                                                    : uploadingBlocks[
                                                          backUploadKey
                                                        ] && sideKey === "back"
                                                      ? "Uploading…"
                                                      : sideData.image
                                                        ? "Replace Image"
                                                        : "Upload Image"}
                                                </button>
                                              </div>

                                              <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                                  Alt Text
                                                </label>
                                                <input
                                                  type="text"
                                                  value={
                                                    sideData.imageAlt || ""
                                                  }
                                                  onChange={(e) =>
                                                    updateFlipCardSide(
                                                      block.id,
                                                      ci,
                                                      sideKey,
                                                      {
                                                        ...sideData,
                                                        imageAlt:
                                                          e.target.value,
                                                      },
                                                    )
                                                  }
                                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500/10"
                                                  placeholder="Image description for accessibility"
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>

                                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">
                                        Live preview
                                      </p>
                                      <FlipCardPreviewErrorBoundary>
                                        <FlipCard
                                          front={frontSide}
                                          back={backSide}
                                        />
                                      </FlipCardPreviewErrorBoundary>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateBlockField(block.id, "cards", [
                                ...(block.cards || []),
                                createEmptyFlipCardCard(),
                              ])
                            }
                            className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded text-sm"
                          >
                            Add Flip Card
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
              <span className="text-xs font-medium text-gray-400 mr-1 hidden sm:inline">
                Add block:
              </span>
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
          onSave={(question) => {
            setQuizQuestions([...quizQuestions, question]);
            setShowQuizBuilder(false);
          }}
        />
      )}
    </div>
  );
}
