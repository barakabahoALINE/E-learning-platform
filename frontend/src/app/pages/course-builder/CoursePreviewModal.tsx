import { useState } from "react";
import { Award, BookOpen, ChevronDown, Eye, Users, X } from "lucide-react";
import { useAppSelector } from "../../../hooks/reduxHooks";
import type { Course, Lesson, FinalAssessment } from "../../../features/courses/types";
import { LessonSummaryLine, MediaPreview } from "./CourseBuilderComponents";
import { mapContentToBlock } from "./course-builder-utils";

export function CoursePreviewModal({
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
  const contentsMap = useAppSelector((state) => state.lessons.contents);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(
    lessons.length > 0 ? lessons[0].id : null
  );

  const totalSections = lessons.reduce((acc, l) => {
    const contents = contentsMap[l.id] || [];
    return acc + (contents.length || l.blocks?.length || 0);
  }, 0);

  const getImageUrl = (url: string | null) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl my-6 animate-in zoom-in-95 duration-200">

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

        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-5">
            {course.thumbnail && (
              <img src={getImageUrl(course.thumbnail)} alt={course.title} className="w-full sm:w-32 h-44 sm:h-20 object-cover rounded-xl flex-shrink-0 shadow-sm" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h1 className="text-lg font-bold text-gray-900 leading-snug">{course.title}</h1>
                <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  course.is_published ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {course.is_published ? "Published" : "Draft"}
                </span>
              </div>
              {course.description && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{course.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{(lessons?.length || 0)} lesson{(lessons?.length || 0) !== 1 ? "s" : ""}</span>
                {totalSections > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{totalSections} section{totalSections !== 1 ? "s" : ""}</span>}
                {course.admin && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.admin}</span>}
                {(finalAssessment?.questions?.length || 0) > 0 && (
                  <span className="flex items-center gap-1 text-indigo-500 font-medium"><Award className="w-3.5 h-3.5" />Final Assessment ({(finalAssessment?.questions?.length || 0)}Q)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {lessons.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 italic">No lessons have been added yet.</p>
            </div>
          ) : (
            lessons.map((lesson, index) => (
              <div key={lesson.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm transition-all hover:border-indigo-100">
                <button
                  onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50/50 hover:bg-white transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lesson.title}</p>
                      <span className="text-[10px] text-gray-400 font-mono tracking-tighter bg-gray-50 px-1.5 rounded">ORD-{lesson.order}</span>
                    </div>
                    <LessonSummaryLine 
                      lessonId={lesson.id} 
                      lessonBlocksLength={lesson.blocks?.length || 0}
                    />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${expandedLesson === lesson.id ? "rotate-180" : ""}`} />
                </button>

                {expandedLesson === lesson.id && (
                  <div className="px-5 py-5 space-y-6 bg-white border-t border-gray-50">
                    {(() => {
                      const contents = contentsMap[lesson.id] || [];
                      const blocks = contents.length > 0 ? contents.map((c, i) => mapContentToBlock(c, i)) : (lesson.blocks || []);
                      
                      if (blocks.length === 0) {
                        return (
                          <div className="flex flex-col items-center py-6 text-gray-300">
                            <BookOpen className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs italic">No sections in this lesson.</p>
                          </div>
                        );
                      }
                      
                      return blocks.map((block, bIdx) => (
                        <div key={block.id || `preview-${bIdx}`} className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                            {bIdx + 1}. Content Section
                          </span>
                          <MediaPreview block={block} hideLinkOnVideo />
                        </div>
                      ));
                    })()}

                    {lesson.quiz?.enabled && (lesson.quiz?.questions?.length || 0) > 0 && (
                      <div className="mt-4 pt-6 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                          <Award className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-bold text-gray-800 uppercase tracking-tight">Lesson Quiz</span>
                          <span className="text-[10px] text-gray-400 font-medium">({(lesson.quiz?.questions?.length || 0)} question{(lesson.quiz?.questions?.length || 0) !== 1 ? "s" : ""})</span>
                        </div>
                        <div className="space-y-3">
                          {(lesson.quiz?.questions || []).map((q, qIdx) => (
                            <div key={q.id} className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl px-4 py-4">
                              <p className="text-sm font-semibold text-gray-800 mb-3">{qIdx + 1}. {q.question}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || []).map((opt, oIdx) => (
                                  <div key={oIdx} className={`text-xs px-3 py-2 rounded-lg border ${oIdx === q.correctAnswer ? "bg-green-100 border-green-200 text-green-700 font-bold" : "bg-white border-gray-100 text-gray-500"}`}>
                                    <span className="opacity-50 mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                                  </div>
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

          {(finalAssessment?.questions?.length || 0) > 0 && (
            <div className="border border-amber-200 bg-amber-50 rounded-2xl p-5 mt-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-amber-900 uppercase tracking-tight">Final Certification Exam — {(finalAssessment?.questions?.length || 0)}Q</span>
              </div>
              <div className="space-y-3">
                {(finalAssessment?.questions || []).map((q, qIdx) => (
                  <div key={q.id} className="bg-white/80 border border-amber-100/50 rounded-xl px-4 py-4">
                    <p className="text-sm font-semibold text-gray-800 mb-3">{qIdx + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`text-xs px-3 py-2 rounded-lg border ${oIdx === q.correctAnswer ? "bg-green-100 border-green-200 text-green-700 font-bold" : "bg-white/50 border-gray-100 text-gray-500"}`}>
                          <span className="opacity-50 mr-1">{String.fromCharCode(65 + oIdx)}.</span> {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-gray-100 flex justify-end bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
