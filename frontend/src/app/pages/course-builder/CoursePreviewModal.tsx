import { useState } from "react";
import { Award, BookOpen, ChevronDown, Eye, X, FileText, CheckCircle2 } from "lucide-react";
import { MediaPreview } from "./CourseBuilderComponents";
import { Course } from "../../../features/courses/types";

export function CoursePreviewModal({
  course,
  onClose,
}: {
  course: Course;
  onClose: () => void;
}) {
  const [expandedModule, setExpandedModule] = useState<string | number | null>(course.modules[0]?.id || null);
  const [expandedItem, setExpandedItem] = useState<string | number | null>(null);

  const getImageUrl = (url: string | null) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const totalItems = course.modules.reduce((acc, m) => 
    acc + m.sections.reduce((sAcc, s) => sAcc + s.contents.length, 0), 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl w-full max-w-4xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-900">Course Preview</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Simple Course Info */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <img src={getImageUrl(course.thumbnail)} alt={course.title} className="w-24 h-16 object-cover rounded-lg border border-gray-200 shadow-sm" />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-0.5">
                <h1 className="text-lg font-bold text-gray-900">{course.title}</h1>
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold uppercase tracking-wider">
                  {course.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 line-clamp-1">{course.description}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-indigo-500" />{course.modules.length} Modules</span>
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-indigo-500" />{totalItems} Lessons</span>
                {course.final_assessment && (
                  <span className="flex items-center gap-1 text-amber-600"><Award className="w-3.5 h-3.5" />Final Exam</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Explorer */}
        <div className="p-6 space-y-3 overflow-y-auto bg-white flex-1">
          {course.modules.map((module, mIdx) => (
            <div key={module.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button 
                onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                className={`w-full px-5 py-4 flex items-center justify-between text-left transition-colors ${
                  expandedModule === module.id ? "bg-indigo-50/30" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                    expandedModule === module.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {mIdx + 1}
                  </div>
                  <h3 className="font-bold text-md text-gray-800">{module.title}</h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedModule === module.id ? "rotate-180" : ""}`} />
              </button>
              
              {expandedModule === module.id && (
                <div className="p-4 bg-white border-t border-gray-100 space-y-6">
                  {module.sections.map((section, sIdx) => (
                    <div key={section.id} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                         <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Section {sIdx + 1}: {section.title}</h4>
                      </div>
                      
                      <div className="space-y-2 pl-4">
                        {section.contents.map((item) => (
                          <div key={item.id} className="border border-gray-100 rounded-lg">
                              <button
                                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                              >
                                <FileText className={`w-4 h-4 ${expandedItem === item.id ? "text-indigo-600" : "text-gray-400"}`} />
                                <p className="text-sm font-bold text-gray-700 flex-1 truncate">{item.title}</p>
                                <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${expandedItem === item.id ? "rotate-180" : ""}`} />
                              </button>

                              {expandedItem === item.id && (
                                <div className="p-4 bg-gray-50/30 border-t border-gray-100">
                                   <div className="space-y-4">
                                      {(() => {
                                        if (item.contents?.length > 0) return item.contents;
                                        const text = (item as any).text_content;
                                        if (text && (text.startsWith('[') || text.startsWith('{'))) {
                                          try {
                                            const parsed = JSON.parse(text);
                                            return Array.isArray(parsed) ? parsed : [parsed];
                                          } catch (e) {}
                                        }
                                        return [{
                                          id: 'main',
                                          type: (item as any).content_type || 'text',
                                          content: text || (item as any).video_url || (item as any).file || ''
                                        }];
                                      })().map((block: any, bIdx: number) => (
                                        <div key={block.id || bIdx} className="space-y-2">
                                           <MediaPreview block={block} hideLinkOnVideo />
                                        </div>
                                      ))}
                                   </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Module Quiz */}
                  {module.quiz && module.quiz.questions.length > 0 && (
                    <div className="p-6 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                       <div className="flex items-center gap-2 mb-6">
                          <Award className="w-5 h-5 text-indigo-600" />
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Module Quiz: {module.quiz.title}</span>
                       </div>
                       <div className="space-y-4">
                          {module.quiz.questions.map((q: any, qIdx: number) => (
                            <div key={q.id || qIdx} className="bg-white p-5 rounded-lg border border-indigo-100/30">
                               <p className="text-sm font-bold text-gray-800 mb-4">{qIdx + 1}. {q.question || q.question_text}</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(q.choices || q.options || []).map((opt: any, oIdx: number) => {
                                    const isCorrect = opt.is_correct || oIdx === q.correctAnswer || (q.correct_answer_id && opt.id === q.correct_answer_id);
                                    return (
                                      <div key={oIdx} className={`px-4 py-3 rounded-lg border text-xs font-medium transition-all ${
                                        isCorrect 
                                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold" 
                                          : "bg-gray-50 border-gray-100 text-gray-600"
                                      }`}>
                                        <div className="flex items-center justify-between gap-2">
                                          <span>{typeof opt === 'string' ? opt : opt.text}</span>
                                          {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                        </div>
                                      </div>
                                    );
                                  })}
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Final Assessment */}
          {course.final_assessment && course.final_assessment.questions.length > 0 && (
            <div className="border border-amber-200 rounded-lg overflow-hidden mt-6">
              <div className="bg-amber-500 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3 font-bold uppercase tracking-widest text-sm">
                  <Award className="w-5 h-5" />
                  <span>Final Course Exam</span>
                </div>
                <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase">
                  {course.final_assessment.questions.length} Questions
                </span>
              </div>

              <div className="p-6 space-y-4 bg-gray-50/30">
                {course.final_assessment.questions.map((q: any, qIdx: number) => (
                  <div key={q.id || qIdx} className="bg-white border border-gray-200 rounded-lg p-5">
                    <p className="text-sm font-bold text-gray-800 mb-4">{qIdx + 1}. {q.question_text || q.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.choices || q.options || []).map((opt: any, oIdx: number) => {
                        const isCorrect = opt.is_correct || oIdx === q.correctAnswer || (q.correct_answer_id && opt.id === q.correct_answer_id);
                        return (
                          <div key={oIdx} className={`px-4 py-3 rounded-lg border text-xs font-medium transition-all ${
                            isCorrect 
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold" 
                              : "bg-gray-50 border-gray-100 text-gray-600"
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <span>{typeof opt === 'string' ? opt : opt.text}</span>
                              {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
          <button onClick={onClose} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors cursor-pointer">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
