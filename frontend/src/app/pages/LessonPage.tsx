import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  FileText,
  List,
  X,
  Loader2,
  Award,
  ArrowRight,
  Target
} from "lucide-react";
import { fetchCourseDetails } from "../../features/courses/courseSlice";
import { fetchCourseProgress, endLearningSession } from "../../features/progress/progressSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { ContentBlockRenderer } from "../components/course/ContentBlockRenderer";
import { cn } from "../components/ui/utils";

export const LessonPage: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1024);
  
  // Track expanded items
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  // Track active and completed items for the sidebar
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string | number>>(new Set());

  const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
  const { courseProgress } = useAppSelector((state) => state.progress);
  
  const numericCourseId = Number(courseId);
  const numericModuleId = Number(moduleId);

  const progress = courseProgress[numericCourseId];

  useEffect(() => {
    if (numericCourseId) {
      if (!course || course.id !== numericCourseId) {
        dispatch(fetchCourseDetails(numericCourseId));
      }
      dispatch(fetchCourseProgress(numericCourseId));
    }

    return () => {
      if (numericCourseId) {
        dispatch(endLearningSession(numericCourseId));
      }
    };
  }, [dispatch, numericCourseId, course?.id]);

  useEffect(() => {
    // Auto-expand current module and its sections
    if (numericModuleId) {
      setExpandedModules(prev => prev.includes(numericModuleId) ? prev : [...prev, numericModuleId]);
      
      const mod = course?.modules?.find(m => m.id === numericModuleId);
      if (mod) {
        const sectionIds = mod.sections.map(s => Number(s.id));
        setExpandedSections(prev => {
          const newSet = new Set([...prev, ...sectionIds]);
          return Array.from(newSet);
        });
      }
    }
  }, [numericModuleId, course]);

  const currentModule = useMemo(() => {
    return course?.modules?.find(m => m.id === numericModuleId);
  }, [course, numericModuleId]);

  // Scroll tracking effect
  useEffect(() => {
    if (!currentModule) return;

    const orderedItemIds = currentModule.sections.flatMap(s => s.contents.map(i => i.id));
    
    // Give DOM a tick to render items
    const timeoutId = setTimeout(() => {
      const itemElements = orderedItemIds.map(id => document.getElementById(`item-${id}`)).filter(Boolean) as HTMLElement[];
      const quizBannerElement = document.getElementById('module-quiz-banner');
      
      const elementsToObserve = [...itemElements];
      if (quizBannerElement) elementsToObserve.push(quizBannerElement);

      if (elementsToObserve.length === 0) return;

      const observer = new IntersectionObserver((entries) => {
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
          // Sort by top offset to find the topmost visible item
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const target = intersecting[0];
          
          if (target.target.id === 'module-quiz-banner') {
            setCompletedItemIds(prev => {
              const newSet = new Set(prev);
              orderedItemIds.forEach(id => newSet.add(id));
              return newSet;
            });
            return;
          }
          
          const idStr = target.target.id.replace('item-', '');
          const id = isNaN(Number(idStr)) ? idStr : Number(idStr);
          
          setActiveItemId(id);
          
          const currentIndex = orderedItemIds.findIndex(itemId => String(itemId) === String(id));
          if (currentIndex !== -1) {
            setCompletedItemIds(prev => {
              const newSet = new Set(prev);
              for (let i = 0; i < currentIndex; i++) {
                newSet.add(orderedItemIds[i]);
              }
              return newSet;
            });
          }
        }
      }, {
        root: null,
        rootMargin: '-10% 0px -20% 0px',
        threshold: 0
      });

      elementsToObserve.forEach(el => observer.observe(el));

      // Set initial active item if none is set
      if (orderedItemIds.length > 0 && !activeItemId) {
        setActiveItemId(orderedItemIds[0]);
      }

      return () => observer.disconnect();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentModule]);

  const nextModule = useMemo(() => {
    if (!course || !currentModule) return null;
    const currentIndex = course.modules.findIndex(m => m.id === currentModule.id);
    return course.modules[currentIndex + 1] || null;
  }, [course, currentModule]);

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-medium tracking-tight">Preparing your learning environment...</h2>
        </div>
      </div>
    );
  }

  if (!currentModule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center text-white p-8 max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <X className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <p className="text-gray-400 mb-8">The module you're looking for doesn't exist or has been moved.</p>
          <Link to={`/course/${courseId}`}>
            <Button className="w-full h-12 text-lg">Back to Course Overview</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentProgressPercentage = progress?.completion_percentage || 0;

  const handleNextModule = () => {
    if (nextModule) {
      navigate(`/learning/${courseId}/${nextModule.id}`);
      window.scrollTo(0, 0);
    } else if (course.final_assessment) {
      navigate(`/learning/${courseId}/quiz/final`);
    } else {
      navigate(`/certificate/${courseId}`);
    }
  };

  const toggleModule = (id: number) => {
    setExpandedModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleSection = (id: number) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const scrollToItem = (itemId: string | number) => {
    const element = document.getElementById(`item-${itemId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to={`/course/${courseId}`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-white hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-white font-medium">{course.title}</h1>
              <p className="text-sm text-gray-400">{currentModule.title}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white hover:text-white hover:bg-gray-700 lg:hidden"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
            <span>Course Progress</span>
            <span>{Math.round(currentProgressPercentage)}%</span>
          </div>
          <Progress value={currentProgressPercentage} className="h-1.5 bg-white/5" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar bg-gray-900">
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-20 pb-32">

            {/* Continuous Scroll Sections */}
            <div className="space-y-32">
              {currentModule.sections.map((section, sIdx) => (
                <div key={section.id} id={`section-${section.id}`} className="space-y-12 scroll-mt-24">
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white tracking-tight">{section.title}</h3>
                      <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-4" />
                    </div>
                  </div>

                  <div className="space-y-16 pl-0">
                    {section.contents.map((item) => {
                      let blocks: any[] = [];
                      if (item.contents && item.contents.length > 0) {
                        blocks = item.contents;
                      } else {
                        const legacyText = (item as any).text_content;
                        if (legacyText) {
                          try {
                            blocks = typeof legacyText === 'string' ? JSON.parse(legacyText) : legacyText;
                          } catch (e) {
                            console.error("Failed to parse legacy content blocks", e);
                            blocks = [{
                              id: 'fallback',
                              type: (item as any).content_type || 'text',
                              content: legacyText
                            }];
                          }
                        }
                      }
                      if (!Array.isArray(blocks)) blocks = [];

                      return (
                        <div key={item.id} id={`item-${item.id}`} >
                          <div className="flex items-center gap-4 mb-4">
                            <h4 className="text-xl font-bold text-white tracking-tight">{item.title}</h4>
                          </div>
                          
                          <ContentBlockRenderer blocks={blocks} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Module Completion / Quiz Section */}
            <div className="pt-40 pb-10" id="module-quiz-banner">
              {currentModule.quiz ? (
                <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 rounded-[2rem] overflow-hidden shadow-3xl shadow-amber-500/10">
                  <CardContent className="p-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 border-4 border-amber-500/30">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h3 className="text-2xl font-bold text-white tracking-tight">Module Content Complete</h3>
                      <p className="text-slate-400 text-lg">You've reached the end of the lesson content. Next up: <span className="text-white font-medium">Module Quiz</span>.</p>
                      <p className="text-sm text-amber-500/80 font-medium">You must pass this quiz to continue to the next module.</p>
                    </div>
                    <div className="w-full md:w-auto pt-4 md:pt-0">
                      <Button 
                        size="lg" 
                        onClick={() => navigate(`/learning/${courseId}/quiz/${currentModule.id}`)}
                        className="w-full h-14 px-8 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20 group"
                      >
                        Start Quiz
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-[3rem] overflow-hidden shadow-3xl shadow-primary/10">
                  <CardContent className="p-12 text-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto border-4 border-primary/30 shadow-inner">
                      <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-black text-white tracking-tight">Excellent Work!</h3>
                      <p className="text-primary-foreground/70 text-lg font-medium max-w-md mx-auto">
                        You've successfully completed all sections of <span className="text-white font-bold">{currentModule.title}</span>.
                      </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto h-16 px-10 text-lg rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 group"
                        onClick={handleNextModule}
                      >
                        {nextModule ? (
                          <>
                            Continue to Next Module
                            <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                          </>
                        ) : (
                          <>
                            Finish Course
                            <Award className="ml-3 h-5 w-5 group-hover:scale-125 transition-transform" />
                          </>
                        )}
                      </Button>
                      <Link to={`/course/${courseId}`} className="w-full sm:w-auto">
                        <Button variant="ghost" size="lg" className="w-full h-16 px-10 text-lg rounded-2xl text-white hover:bg-white/10">
                          Course Overview
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* Backdrop for Mobile Sidebar */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/60 z-[55] lg:hidden backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:static top-0 right-0 z-[60] lg:z-0",
            "w-96 max-w-[90vw] h-full",
            "bg-gray-800 border-l border-gray-700 shadow-2xl lg:shadow-none",
            "transition-transform duration-500 ease-in-out flex flex-col overflow-hidden",
            showSidebar ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          {/* Sidebar Header */}
          <div className="px-6 py-5 border-b border-white/5 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[17px] font-bold text-white">Course Content</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-white rounded-xl hover:bg-white/5 lg:hidden"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-[13px] text-slate-400 font-medium">
              {course.modules.length} modules • {course.modules.reduce((acc, m) => acc + m.sections.length, 0)} chapters • {course.modules.reduce((acc, m) => acc + m.sections.reduce((sAcc, s) => sAcc + s.contents.length, 0), 0)} lessons
            </p>
          </div>
          
          {/* Scrollable Sidebar Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2">
            {course.modules?.map((module, mIdx) => {
              const isModuleExpanded = expandedModules.includes(Number(module.id));
              const isCurrentModule = Number(module.id) === numericModuleId;
              
              const totalModuleItems = module.sections.reduce((acc, s) => acc + s.contents.length, 0);
              const moduleCompletedCount = module.sections.reduce((acc, s) => {
                return acc + s.contents.filter(item => completedItemIds.has(item.id) || completedItemIds.has(Number(item.id)) || completedItemIds.has(String(item.id))).length;
              }, 0);
              const moduleProgressPercent = totalModuleItems > 0 ? (moduleCompletedCount / totalModuleItems) * 100 : 0;

              return (
                <Collapsible
                  key={module.id}
                  open={isModuleExpanded}
                  onOpenChange={() => toggleModule(Number(module.id))}
                  className="space-y-1"
                >
                  <CollapsibleTrigger className="w-full text-left focus:outline-none">
                    <div className="py-2 group flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {isModuleExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-[14.5px] font-bold text-white leading-snug group-hover:text-gray-200 transition-colors">
                          Module {mIdx + 1}: {module.title}
                        </h4>
                        <p className="text-[13px] text-slate-400 mt-1 mb-2">
                          {moduleCompletedCount}/{totalModuleItems} completed • 0 hours
                        </p>
                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-300 rounded-full transition-all duration-500" style={{ width: `${moduleProgressPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-6 space-y-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                    {module.sections.map((section, sIdx) => {
                      const isSectionExpanded = expandedSections.includes(Number(section.id));
                      const sectionCompletedCount = section.contents.filter(item => completedItemIds.has(item.id) || completedItemIds.has(Number(item.id)) || completedItemIds.has(String(item.id))).length;
                      
                      return (
                        <Collapsible
                          key={section.id}
                          open={isSectionExpanded}
                          onOpenChange={() => toggleSection(Number(section.id))}
                          className="space-y-1"
                        >
                          <CollapsibleTrigger className="w-full text-left focus:outline-none">
                            <div className="flex items-start gap-3 py-2 pl-2 group">
                              <div className="flex-shrink-0 mt-0.5">
                                {isSectionExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 pr-2">
                                <h5 className="text-[14px] font-bold text-white group-hover:text-gray-200 transition-colors leading-snug">
                                  {section.title}
                                </h5>
                                <p className="text-[13px] text-slate-400 mt-0.5">
                                  {sectionCompletedCount}/{section.contents.length} • 0 hours
                                </p>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="pl-8 pr-2 space-y-0.5 pt-1">
                            {section.contents.map((item, iIdx) => {
                              const isActiveItem = String(item.id) === String(activeItemId);
                              const isCompleted = completedItemIds.has(item.id) || completedItemIds.has(Number(item.id)) || completedItemIds.has(String(item.id));

                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    if (isCurrentModule) {
                                      scrollToItem(item.id);
                                    } else {
                                      navigate(`/learning/${courseId}/${module.id}`);
                                    }
                                  }}
                                  className={cn(
                                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group",
                                    isActiveItem 
                                      ? "border border-white/30 bg-white/[0.08] shadow-sm" 
                                      : "border border-transparent hover:bg-white/[0.04]"
                                  )}
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-500" />
                                    ) : (
                                      <Circle className="h-[18px] w-[18px] text-slate-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-[14px] font-medium leading-tight",
                                      isActiveItem ? "text-white" : "text-slate-200 group-hover:text-white"
                                    )}>
                                      {item.title}
                                    </p>
                                    <p className="text-[13px] text-slate-400 mt-1">
                                      10 min
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}

                    {module.quiz && (
                      <div className="pt-2 pb-2">
                        <button
                          onClick={() => navigate(`/learning/${courseId}/quiz/${module.id}`)}
                          className="w-full flex items-start gap-3 py-2 pl-2 pr-2 rounded-lg text-left transition-all group border border-transparent hover:bg-white/[0.04]"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                             <Circle className="h-[18px] w-[18px] text-amber-500 group-hover:text-amber-400 transition-colors" />
                          </div>
                          <div className="flex-1 pr-2">
                            <h5 className="text-[14px] font-bold text-amber-500 group-hover:text-amber-400 transition-colors leading-snug">
                               Module Quiz
                            </h5>
                            <p className="text-[13px] text-slate-400 mt-0.5">
                              Required before next module
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Final Assessment Section */}
            <div className="pt-6 border-t border-white/5 mt-4 pl-4 pr-2">
              <button
                onClick={() => navigate(`/learning/${courseId}/quiz/final`)}
                className="w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group border border-transparent hover:bg-white/[0.04]"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Circle className="h-[18px] w-[18px] text-amber-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-slate-200 group-hover:text-white leading-tight flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-amber-500/70" />
                    Final Assessment
                  </p>
                  <p className="text-[13px] text-slate-400 mt-1">
                    Mandatory • Complete to earn certificate
                  </p>
                </div>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
