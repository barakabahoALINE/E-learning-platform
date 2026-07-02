import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
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
  Target,
  PlayCircle,
  Lock,
  ClipboardCheck
} from "lucide-react";
import Logo from "../assets/R.png";
import { ThemeToggle } from "../components/ThemeToggle";
import { fetchCourseDetails } from "../../features/courses/courseSlice";
import {
  endLearningSession,
  fetchCourseModulesProgress,
  fetchCourseProgress,
  fetchModuleContentsProgress,
  markContentComplete,
} from "../../features/progress/progressSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { ContentBlockRenderer } from "../components/course/ContentBlockRenderer";
import { cn } from "../components/ui/utils";

export const LessonPage: React.FC = () => {
  const { courseId, moduleId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const completionRequestsRef = useRef<Set<string>>(new Set());
  const userCompletionIntentRef = useRef(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1024);

  // Track expanded items
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  // Track active and completed items for the sidebar
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);
  const [completedItemIds, setCompletedItemIds] = useState<Set<string | number>>(new Set());

  const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
  const { courseProgress, moduleContentsProgress, courseModulesProgress } = useAppSelector((state) => state.progress);

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

  const currentModuleProgress = moduleContentsProgress[numericModuleId];

  const scrollMainToItem = useCallback((itemId: string | number, behavior: ScrollBehavior = "auto") => {
    const scrollRoot = mainRef.current;
    const element = document.getElementById(`item-${itemId}`);
    if (!scrollRoot || !element) return;

    const rootRect = scrollRoot.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop = scrollRoot.scrollTop + elementRect.top - rootRect.top - 24;

    scrollRoot.scrollTo({
      top: Math.max(0, targetTop),
      behavior,
    });
  }, []);

  const contentMetaById = useMemo(() => {
    const meta = new Map<string, { sectionId: number; contentId: number }>();
    currentModule?.sections.forEach((section) => {
      section.contents.forEach((item) => {
        meta.set(String(item.id), {
          sectionId: Number(section.id),
          contentId: Number(item.id),
        });
      });
    });
    return meta;
  }, [currentModule]);

  const allCompletedContentIds = useMemo(() => {
    const completed = new Set<string | number>();
    Object.values(moduleContentsProgress).forEach((modProgress) => {
      modProgress?.sections?.forEach((section) => {
        section.contents.forEach((content) => {
          if (content.completed) {
            completed.add(content.content_id);
            completed.add(String(content.content_id));
            if (content.id !== undefined) {
              completed.add(content.id);
              completed.add(String(content.id));
            }
          }
        });
      });
    });
    return completed;
  }, [moduleContentsProgress]);

  useEffect(() => {
    if (numericCourseId && course?.modules) {
      course.modules.forEach((mod) => {
        dispatch(fetchModuleContentsProgress({ courseId: numericCourseId, moduleId: Number(mod.id) }));
      });
      dispatch(fetchCourseModulesProgress(numericCourseId));
    }
  }, [dispatch, numericCourseId, course?.modules]);

  useEffect(() => {
    setCompletedItemIds(allCompletedContentIds);
  }, [allCompletedContentIds]);

  const hasInitializedActiveItem = useRef(false);

  useEffect(() => {
    hasInitializedActiveItem.current = false;
    userCompletionIntentRef.current = false;
    setActiveItemId(null);
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [numericModuleId]);

  useEffect(() => {
    if (!currentModule) return;

    const navigationTargetItemId = (location.state as { targetItemId?: string | number } | null)?.targetItemId;
    if (
      navigationTargetItemId &&
      !hasInitializedActiveItem.current &&
      currentModule.sections.some(section => section.contents.some(item => String(item.id) === String(navigationTargetItemId)))
    ) {
      setActiveItemId(navigationTargetItemId);
      userCompletionIntentRef.current = false;

      const timeoutId = setTimeout(() => {
        scrollMainToItem(navigationTargetItemId, "auto");
      }, 100);

      hasInitializedActiveItem.current = true;
      return () => clearTimeout(timeoutId);
    }

    if (activeItemId === null) {
      const firstItem = currentModule.sections.flatMap(section => section.contents)[0];
      setActiveItemId(firstItem?.id ?? null);
    }

    if (!currentModuleProgress || hasInitializedActiveItem.current) return;

    let targetItemId: string | number | null = null;
    for (const section of currentModuleProgress.sections || []) {
      const incompleteContent = section.contents.find(c => !c.completed);
      if (incompleteContent) {
        const matchedItem = currentModule.sections
          .flatMap(s => s.contents)
          .find(item => String(item.id) === String(incompleteContent.content_id) || String(item.id) === String(incompleteContent.id));
        if (matchedItem) {
          targetItemId = matchedItem.id;
          break;
        }
      }
    }

    if (!targetItemId) {
      const firstItem = currentModule.sections.flatMap(s => s.contents)[0];
      targetItemId = firstItem?.id ?? null;
    }

    if (targetItemId) {
      setActiveItemId(targetItemId);
      userCompletionIntentRef.current = false;

      const timeoutId = setTimeout(() => {
        scrollMainToItem(targetItemId, "auto");
      }, 100);

      hasInitializedActiveItem.current = true;
      return () => clearTimeout(timeoutId);
    }
  }, [currentModule, currentModuleProgress, numericModuleId, activeItemId, location.state, scrollMainToItem]);

  useEffect(() => {
    const scrollRoot = mainRef.current;
    if (!scrollRoot) return;

    const markIntent = () => {
      userCompletionIntentRef.current = true;
    };

    scrollRoot.addEventListener("wheel", markIntent, { passive: true });
    scrollRoot.addEventListener("touchmove", markIntent, { passive: true });
    scrollRoot.addEventListener("keydown", markIntent);
    scrollRoot.addEventListener("mousedown", markIntent, { passive: true });
    scrollRoot.addEventListener("pointerdown", markIntent, { passive: true });

    return () => {
      scrollRoot.removeEventListener("wheel", markIntent);
      scrollRoot.removeEventListener("touchmove", markIntent);
      scrollRoot.removeEventListener("keydown", markIntent);
      scrollRoot.removeEventListener("mousedown", markIntent);
      scrollRoot.removeEventListener("pointerdown", markIntent);
    };
  }, []);

  useEffect(() => {
    userCompletionIntentRef.current = false;
  }, [activeItemId]);

  const completeActiveContent = useCallback((contentId: string | number) => {
    if (!numericCourseId || !currentModule) return;

    const meta = contentMetaById.get(String(contentId));
    if (!meta) return;

    const requestKey = `${numericCourseId}:${meta.sectionId}:${meta.contentId}`;
    if (
      completionRequestsRef.current.has(requestKey) ||
      completedItemIds.has(meta.contentId) ||
      completedItemIds.has(String(meta.contentId))
    ) {
      return;
    }

    completionRequestsRef.current.add(requestKey);
    setCompletedItemIds(prev => new Set(prev).add(meta.contentId).add(String(meta.contentId)));
    dispatch(markContentComplete({
      courseId: numericCourseId,
      sectionId: meta.sectionId,
      contentId: meta.contentId,
    })).unwrap().catch(() => {
      completionRequestsRef.current.delete(requestKey);
      setCompletedItemIds(prev => {
        const next = new Set(prev);
        next.delete(meta.contentId);
        next.delete(String(meta.contentId));
        return next;
      });
    });
  }, [completedItemIds, contentMetaById, currentModule, dispatch, numericCourseId]);

  // Active item tracking effect
  useEffect(() => {
    if (!currentModule) return;

    const orderedItemIds = currentModule.sections.flatMap(s => s.contents.map(i => i.id));
    let observer: IntersectionObserver | null = null;

    const timeoutId = setTimeout(() => {
      const itemElements = orderedItemIds.map(id => document.getElementById(`item-${id}`)).filter(Boolean) as HTMLElement[];

      if (itemElements.length === 0) return;

      const obs = new IntersectionObserver((entries) => {
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          const target = intersecting[0];

          const idStr = target.target.id.replace('item-', '');
          const id = isNaN(Number(idStr)) ? idStr : Number(idStr);

          setActiveItemId(id);
        }
      }, {
        root: mainRef.current,
        rootMargin: '-10% 0px -20% 0px',
        threshold: 0
      });
      observer = obs;

      itemElements.forEach(el => obs.observe(el));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer?.disconnect();
    };
  }, [currentModule]);

  // Completion tracking effect. Only the active content item's own end marker can complete it.
  useEffect(() => {
    if (!activeItemId || !contentMetaById.has(String(activeItemId))) return;

    let observer: IntersectionObserver | null = null;
    let shortContentTimer: number | undefined;
    const timeoutId = setTimeout(() => {
      const scrollRoot = mainRef.current;
      const itemElement = document.getElementById(`item-${activeItemId}`);
      const sentinel = document.getElementById(`item-${activeItemId}-end`);
      if (!scrollRoot || !itemElement || !sentinel) return;

      const rootIsScrollable = scrollRoot.scrollHeight > scrollRoot.clientHeight + 4;
      const itemFitsInView = itemElement.getBoundingClientRect().height <= scrollRoot.clientHeight * 0.85;

      if (!rootIsScrollable || itemFitsInView) {
        shortContentTimer = window.setTimeout(() => {
          if (String(activeItemId) === sentinel.dataset.contentId) {
            completeActiveContent(activeItemId);
          }
        }, 1500);
      }

      observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || String(activeItemId) !== sentinel.dataset.contentId) return;
        if (!userCompletionIntentRef.current) return;

        completeActiveContent(activeItemId);
      }, {
        root: mainRef.current,
        rootMargin: '0px 0px -12% 0px',
        threshold: 1,
      });

      observer.observe(sentinel);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      if (shortContentTimer) window.clearTimeout(shortContentTimer);
      observer?.disconnect();
    };
  }, [activeItemId, completeActiveContent, contentMetaById]);

  const nextModule = useMemo(() => {
    if (!course || !currentModule) return null;
    const currentIndex = course.modules.findIndex(m => m.id === currentModule.id);
    return course.modules[currentIndex + 1] || null;
  }, [course, currentModule]);

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center text-foreground dark:text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-medium tracking-tight">Preparing your learning environment...</h2>
        </div>
      </div>
    );
  }

  if (!currentModule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950">
        <div className="text-center text-foreground dark:text-white p-8 max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
            <X className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Module not found</h2>
          <p className="text-muted-foreground dark:text-gray-400 mb-8">The module you're looking for doesn't exist or has been moved.</p>
          <Link to={`/course/${courseId}`}>
            <Button className="w-full h-12 text-lg">Back to Course Overview</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentProgressPercentage = progress?.completion_percentage || 0;
  const moduleProgressById = new Map(
    (courseModulesProgress[numericCourseId] || []).map((moduleProgress) => [
      Number(moduleProgress.module_id),
      moduleProgress,
    ])
  );
  const isModuleReady = (module: NonNullable<typeof currentModule>) => {
    const moduleProgress = moduleProgressById.get(Number(module.id));
    return module.quiz ? Boolean(moduleProgress?.quiz_passed) : Boolean(moduleProgress?.module_completed);
  };
  const allModulesCompleted = course?.modules?.length
    ? course.modules.every((module) => isModuleReady(module))
    : false;
  const isCurrentModuleCompleted = isModuleReady(currentModule);
  const canOpenFinalAssessment = allModulesCompleted && Boolean(course.final_assessment);
  const finalAssessmentCompleted = Boolean(progress?.final_passed || progress?.course_completed);

  const handleNextModule = () => {
    if (nextModule) {
      navigate(`/learning/${courseId}/${nextModule.id}`);
      window.scrollTo(0, 0);
    } else if (course.final_assessment) {
      navigate(`/learning/${courseId}/final-assessment`);
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

  const getStatusIcon = (isCompleted: boolean, isActive: boolean) => {
    if (isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (isActive) {
      return <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    }
    return <Circle className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
  };

  const scrollToItem = (itemId: string | number) => {
    userCompletionIntentRef.current = false;
    setActiveItemId(itemId);
    scrollMainToItem(itemId, "smooth");
    window.setTimeout(() => {
      userCompletionIntentRef.current = false;
    }, 500);
  };

  const handleCloseLesson = async () => {
    if (numericCourseId) {
      try {
        await dispatch(endLearningSession(numericCourseId)).unwrap();
      } catch (error) {
        console.error("Failed to end learning session:", error);
      }
    }
    navigate(`/course/${courseId}`);
  };

  return (
    <div className="h-screen bg-background dark:bg-gray-900 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className=" bg-white/30 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 px-6 bg-red-500 py-4 backdrop-blur-2xl rounded-b-lg shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <Link to="/dashboard" className="flex items-center space-x-2 border-r border-gray-300 pr-4">
              <img src={Logo} alt="Logo" className="h-10 w-auto" />
            </Link>
            <div className="flex-1 px-6">
              <h1 className="text-md dark:text-white font-medium">{course.title}</h1>
              <p className="text-sm text-muted-foreground dark:text-gray-400">{currentModule.title}</p>
              <div className="mt-3 flex-1">
                <div className="flex items-center justify-between text-sm text-muted-foreground dark:text-gray-400 mb-1">
                  <span>Course Progress</span>
                  <span>{Math.round(currentProgressPercentage)}%</span>
                </div>
                <Progress value={currentProgressPercentage} className="h-1.5" />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseLesson}
              className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white hover:bg-accent dark:hover:bg-gray-700 lg:hidden"
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content Area - Scrollable */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar bg-gray-50 dark:bg-[#111827]">
          <div className="max-w-4xl mx-auto px-6 py-12 space-y-20 pb-32">

            {/* Continuous Scroll Sections */}
            <div className="space-y-32">
              {currentModule.sections.map((section, sIdx) => (
                <div key={section.id} id={`section-${section.id}`} className="space-y-12 scroll-mt-24">
                  <div className="flex items-center gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">{section.title}</h3>
                      <div className="h-px w-full bg-gradient-to-r from-border dark:from-white/10 to-transparent mt-4" />
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
                            <h4 className="text-xl font-bold text-foreground dark:text-white tracking-tight">{item.title}</h4>
                          </div>

                          <ContentBlockRenderer blocks={blocks} />
                          <div
                            id={`item-${item.id}-end`}
                            data-content-id={String(item.id)}
                            aria-hidden="true"
                            className="h-1 w-full"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Module Completion / Quiz Section */}
            <div className="pt-20 pb-10" id="module-quiz-banner">
              <div className="relative rounded-3xl overflow-hidden bg-card text-card-foreground border p-8">
                <div className="relative flex flex-col md:flex-row items-center gap-8">
                  {currentModule.quiz ? (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
                        {isCurrentModuleCompleted ? (
                          <CheckCircle2 className="w-10 h-10 text-green-500" />
                        ) : (
                          <FileText className="w-10 h-10 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-foreground dark:text-white mb-2">
                          {isCurrentModuleCompleted ? "Module Review Complete" : "Module Review"}
                        </h3>
                        <p className="text-muted-foreground dark:text-gray-300 text-lg">
                          {isCurrentModuleCompleted
                            ? "Your quiz result is saved. You can continue learning."
                            : "Test your knowledge with the module quiz to proceed."}
                        </p>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => isCurrentModuleCompleted ? handleNextModule() : navigate(`/learning/${courseId}/quiz/${currentModule.id}`)}
                        className="h-14 px-8 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-semibold transition-colors"
                      >
                        {isCurrentModuleCompleted ? (nextModule ? "Next Module" : "Continue") : "Start Quiz"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-bold text-foreground dark:text-white mb-2">Well Done!</h3>
                        <p className="text-muted-foreground dark:text-gray-300 text-lg">You've completed all lessons in this module.</p>
                      </div>
                      <Button
                        size="lg"
                        onClick={handleNextModule}
                        className="h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-semibold transition-colors"
                      >
                        {nextModule ? "Next Module" : "Finish Course"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!nextModule && course.final_assessment && (
              <div className="pb-10">
                <div className="relative rounded-3xl overflow-hidden bg-card text-card-foreground border p-8">
                  <div className="relative flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center flex-shrink-0 border border-primary/20">
                      {finalAssessmentCompleted ? (
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                      ) : canOpenFinalAssessment ? (
                        <Target className="w-10 h-10 text-primary" />
                      ) : (
                        <Lock className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-foreground dark:text-white mb-2">Final Assessment</h3>
                      <p className="text-muted-foreground dark:text-gray-300 text-lg">
                        {finalAssessmentCompleted
                          ? "You passed the final assessment."
                          : canOpenFinalAssessment
                            ? "Complete the final checkpoint to earn your certificate."
                            : "Finish the module requirements to unlock the final assessment."}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      disabled={!canOpenFinalAssessment && !finalAssessmentCompleted}
                      onClick={() => navigate(finalAssessmentCompleted ? `/certificate/${courseId}` : `/learning/${courseId}/final-assessment`)}
                      className="h-14 px-8 rounded-2xl font-semibold transition-colors"
                    >
                      <ClipboardCheck className="mr-2 h-5 w-5" />
                      {finalAssessmentCompleted ? "View Certificate" : "Start Assessment"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
            "bg-gray-50 dark:bg-[#111827] border-l border-gray-200 dark:border-gray-800 shadow-2xl lg:shadow-none",
            "transition-transform duration-500 ease-in-out flex flex-col overflow-hidden",
            showSidebar ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          )}
        >
          {/* Sidebar Header */}
          <div className="px-6 py-5 border-b border-border dark:border-white/5 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[17px] font-bold text-foreground dark:text-white">Course Content</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(false)}
                className="text-muted-foreground dark:text-gray-500 hover:text-foreground dark:hover:text-white rounded-xl hover:bg-accent dark:hover:bg-white/5 lg:hidden"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <p className="text-[13px] text-muted-foreground dark:text-slate-400 font-medium">
              {course.modules.length} modules • {course.modules.reduce((acc, m) => acc + m.sections.length, 0)} sections • {course.modules.reduce((acc, m) => acc + m.sections.reduce((sAcc, s) => sAcc + s.contents.length, 0), 0)} lessons
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
                          <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-white transition-colors" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-slate-400 group-hover:text-foreground dark:group-hover:text-white transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-[14.5px] font-bold text-foreground dark:text-white leading-snug group-hover:text-foreground dark:group-hover:text-gray-200 transition-colors">
                          Module {mIdx + 1}: {module.title}
                        </h4>
                        <p className="text-[13px] text-muted-foreground dark:text-slate-400 mt-1 mb-2">
                          {moduleCompletedCount}/{totalModuleItems} completed • 0 hours
                        </p>
                        <Progress value={moduleProgressPercent} className="h-1.5" />
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
                                  <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 pr-2">
                                <h5 className="text-[14px] font-bold text-foreground dark:text-white group-hover:text-foreground dark:group-hover:text-gray-200 transition-colors leading-snug">
                                  {section.title}
                                </h5>
                                <p className="text-[13px] text-muted-foreground dark:text-slate-400 mt-0.5">
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
                                      navigate(`/learning/${courseId}/${module.id}`, { state: { targetItemId: item.id } });
                                    }
                                  }}
                                  className={cn(
                                    'w-full flex items-start gap-2 p-2 rounded text-left transition-colors mb-1 last:mb-0 border border-transparent',
                                    isActiveItem
                                      ? 'active-lesson-card'
                                      : 'hover:bg-gray-100 dark:hover:bg-[#1F2937]/45',
                                    isCompleted && !isActiveItem && 'opacity-85'
                                  )}
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    {getStatusIcon(isCompleted, isActiveItem)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-[14px] font-medium leading-tight",
                                      isActiveItem ? "text-foreground dark:text-white" : "text-muted-foreground dark:text-slate-200 group-hover:text-foreground dark:group-hover:text-white"
                                    )}>
                                      {item.title}
                                    </p>
                                    <p className="text-[13px] text-muted-foreground dark:text-slate-400 mt-1">
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
                        {(() => {
                          const moduleProgress = moduleProgressById.get(Number(module.id));
                          const isQuizCompleted = Boolean(moduleProgress?.quiz_passed);
                          return (
                            <button
                              onClick={() => navigate(`/learning/${courseId}/quiz/${module.id}`)}
                              className="w-full flex items-start gap-3 py-2 pl-2 pr-2 rounded-lg text-left transition-all group border border-transparent hover:bg-accent dark:hover:bg-white/[0.04]"
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {isQuizCompleted ? (
                                  <CheckCircle2 className="h-[18px] w-[18px] text-green-600 dark:text-green-400 transition-colors" />
                                ) : (
                                  <Circle className="h-[18px] w-[18px] text-amber-500 group-hover:text-amber-400 transition-colors" />
                                )}
                              </div>
                              <div className="flex-1 pr-2">
                                <h5 className={cn(
                                  "text-[14px] font-bold transition-colors leading-snug",
                                  isQuizCompleted ? "text-green-600 dark:text-green-400" : "text-amber-500 group-hover:text-amber-400"
                                )}>
                                  Module Quiz
                                </h5>
                                <p className="text-[13px] text-muted-foreground dark:text-slate-400 mt-0.5">
                                  {isQuizCompleted ? "Completed" : "Required before next module"}
                                </p>
                              </div>
                            </button>
                          );
                        })()}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {/* Final Assessment Section */}
            <div className="pt-6 border-t border-border dark:border-white/5 mt-4 pl-4 pr-2">
              <button
                onClick={() => {
                  if (canOpenFinalAssessment) {
                    navigate(`/learning/${courseId}/final-assessment`);
                  }
                }}
                disabled={!canOpenFinalAssessment}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group border border-transparent",
                  canOpenFinalAssessment
                    ? "hover:bg-accent dark:hover:bg-white/[0.04]"
                    : "opacity-55 cursor-not-allowed"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {finalAssessmentCompleted ? (
                    <CheckCircle2 className="h-[18px] w-[18px] text-green-600 dark:text-green-400" />
                  ) : canOpenFinalAssessment ? (
                    <Circle className="h-[18px] w-[18px] text-amber-500" />
                  ) : (
                    <Lock className="h-[18px] w-[18px] text-muted-foreground dark:text-slate-500" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[14px] font-medium text-muted-foreground dark:text-slate-200 group-hover:text-foreground dark:group-hover:text-white leading-tight flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-amber-500/70" />
                    Final Assessment
                  </p>
                  <p className="text-[13px] text-muted-foreground dark:text-slate-400 mt-1">
                    {finalAssessmentCompleted
                      ? "Completed"
                      : canOpenFinalAssessment
                        ? "Mandatory - Complete to earn certificate"
                        : "Complete all modules to unlock"}
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
