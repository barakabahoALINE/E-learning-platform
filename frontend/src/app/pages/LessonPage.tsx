import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  FileText,
  List,
  MessageSquare,
  X,
  Loader2,
  Check,
  Award,
} from "lucide-react";
import { fetchCourseDetails } from "../../features/courses/courseSlice";
import { fetchCourseProgress, markContentComplete, continueLearning, endLearningSession, fetchCourseLessonsProgress, fetchLessonContentsProgress } from "../../features/progress/progressSlice";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";

interface InlineFileViewerProps {
  file: string | File;
  title: string;
}

const getFileExtension = (url: string): string =>
  url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

const InlineFileViewer: React.FC<InlineFileViewerProps> = ({ file, title }) => {
  const [blobUrl, setBlobUrl]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError]   = useState(false);

  const rawUrl = typeof file === "string" ? file : null;
  const ext    = getFileExtension(
    typeof file === "string" ? file : (file as File).name ?? ""
  );

  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
  const isPdf   = ext === "pdf";
  const isDoc   = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "csv", "txt"].includes(ext);

  useEffect(() => {
    let objectUrl: string | null = null;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        if (file instanceof File) {
          objectUrl = URL.createObjectURL(file);
          setBlobUrl(objectUrl);
        } else {
          const token = localStorage.getItem("e-learning-access_token");
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

          const res = await fetch(file, { headers });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const blob = await res.blob();
          objectUrl  = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Revoke the blob URL when the component unmounts or file changes
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setBlobUrl(null);
    };
  }, [rawUrl]);

  const downloadHref = blobUrl ?? (typeof file === "string" ? file : "#");

  return (
    <div className="bg-gray-800 rounded-xl mb-6 border border-gray-700 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3 text-white min-w-0">
          <FileText className="w-5 h-5 text-primary shrink-0" />
          <span className="font-semibold truncate">{title}</span>
          {ext && (
            <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/20 text-primary px-2 py-0.5 rounded shrink-0">
              {ext}
            </span>
          )}
        </div>
        <a
          href={downloadHref}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors shrink-0 ml-4"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-90" />
          Download
        </a>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-white gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Loading file…</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && hasError && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6 text-white">
          <FileText className="w-16 h-16 text-gray-500 mb-4" />
          <p className="text-gray-300 mb-2 font-medium">Could not load preview.</p>
          <p className="text-gray-500 text-sm mb-6">
            The file may be unavailable or your session may have expired.
          </p>
          <a href={typeof file === "string" ? file : "#"} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="lg" className="text-white border-gray-600 hover:bg-gray-700">
              Open in New Tab
            </Button>
          </a>
        </div>
      )}

      {/* Viewer (only when blob URL is ready) */}
      {!isLoading && !hasError && blobUrl && (
        <>
          {isImage && (
            <div className="flex items-center justify-center p-4 bg-gray-900 min-h-[300px]">
              <img
                src={blobUrl}
                alt={title}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded shadow"
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full border-0"
              style={{ height: "75vh" }}
            />
          )}

          {isDoc && (
            <iframe
              src={blobUrl}
              title={title}
              className="w-full border-0"
              style={{ height: "75vh" }}
            />
          )}

          {!isImage && !isPdf && !isDoc && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6 text-white">
              <FileText className="w-16 h-16 text-gray-500 mb-4" />
              <p className="text-gray-300 mb-2 font-medium">
                Preview not available for this file type.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Use the download button above to open the file.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const LessonPage: React.FC = () => {
  const { courseId, lessonId, contentId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1024);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setShowSidebar(false);
    }
  }, [lessonId, contentId]);

  const { currentCourse: course, isLoading } = useAppSelector((state) => state.courses);
  const { courseProgress, lessonContentProgress, courseLessonsProgress } = useAppSelector((state) => state.progress);
  
  const numericCourseId = Number(courseId);
  const numericLessonId = Number(lessonId);
  const numericContentId = Number(contentId);

  // Function to check if a specific content is completed by looking through lesson progress data
  const isContentCompleted = (lessonId: number, contentId: number) => {
    const lessonProg = courseLessonsProgress[numericCourseId]?.find(lp => lp.lesson_id === lessonId);
    return lessonProg?.completed_content_ids?.includes(contentId) || false;
  };

  const progress = courseProgress[numericCourseId];

  useEffect(() => {
    if (numericCourseId) {
      if (!course || course.id !== numericCourseId) {
        dispatch(fetchCourseDetails(numericCourseId));
      }
      dispatch(fetchCourseProgress(numericCourseId));
      dispatch(fetchCourseLessonsProgress(numericCourseId));
      
      if (numericLessonId) {
        dispatch(fetchLessonContentsProgress({ courseId: numericCourseId, lessonId: numericLessonId }));
      }
    }

    // Cleanup: End learning session when leaving the page
    return () => {
      if (numericCourseId) {
        dispatch(endLearningSession(numericCourseId));
      }
    };
  }, [dispatch, numericCourseId, course?.id]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (numericCourseId) {
        const token = localStorage.getItem('e-learning-access_token');
        if (token) {
          fetch(`http://127.0.0.1:8000/api/progress/courses/${numericCourseId}/end-session/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            keepalive: true
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [numericCourseId]);

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext)) || url.toLowerCase().includes('/media/');
  };

  if (isLoading || !course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" />
          <h2 className="text-xl">Loading Lesson...</h2>
        </div>
      </div>
    );
  }

  // Flatten the lessons and contents for easy linear navigation
  const allContents: { lesson: any, content: any, lessonIndex: number, contentIndex: number }[] = [];
  
  course.lessons?.forEach((lesson, lIdx) => {
    lesson.contents?.forEach((content, cIdx) => {
       allContents.push({
         lesson,
         content,
         lessonIndex: lIdx,
         contentIndex: cIdx
       });
    });
  });

  if (course.final_assessment?.questions?.length > 0) {
    allContents.push({
      lesson: { id: 'final', title: 'Course Final Assessment' },
      content: { id: 'final', content_type: 'final_assessment', title: 'Final Exam' },
      lessonIndex: course.lessons?.length || 0,
      contentIndex: 0
    });
  }

  if (allContents.length === 0) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-900">
         <div className="text-center text-white">
           <h2 className="text-2xl mb-4">No content available for this course yet.</h2>
           <Link to={`/course/${courseId}`}>
             <Button>Back to course</Button>
           </Link>
         </div>
       </div>
     );
  }

  // Find current position
  let currentIndex = allContents.findIndex(c => {
    if (contentId === 'final') return c.content.id === 'final';
    return c.lesson.id === numericLessonId && (numericContentId ? c.content.id === numericContentId : true);
  });

  if (currentIndex === -1) currentIndex = 0;
  
  const currentItem = allContents[currentIndex];
  const currentLesson = currentItem.lesson;
  const currentContent = currentItem.content;

  const currentProgressPercentage = progress?.completion_percentage || 0;

  const handleCompleteContent = async () => {
    try {
      if (currentContent.id) {
         await dispatch(markContentComplete({
            courseId: numericCourseId,
            lessonId: numericLessonId,
            contentId: currentContent.id
         })).unwrap();
         
         dispatch(fetchLessonContentsProgress({ courseId: numericCourseId, lessonId: numericLessonId }));
         dispatch(fetchCourseLessonsProgress(numericCourseId));
         
         toast.success("Content marked as complete!");
      }
      handleNext();
    } catch (error: any) {
      toast.error(error || "Failed to mark as complete");
      handleNext();
    }
  };

  const handleNext = () => {
    if (currentIndex < allContents.length - 1) {
      const next = allContents[currentIndex + 1];
      if (next.content.id === 'final') {
        navigate(`/lesson/${courseId}/final/final`);
      } else {
        navigate(`/lesson/${courseId}/${next.lesson.id}/${next.content.id}`);
      }
    } else if (currentContent.content_type === 'final_assessment') {
      navigate(`/certificate/${courseId}`);
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prev = allContents[currentIndex - 1];
      navigate(`/lesson/${courseId}/${prev.lesson.id}/${prev.content.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-10">
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
              <div className="flex items-center">
                <h1 className="text-white font-medium">{course.title}</h1>
              </div>
              <p className="text-sm text-gray-400">{currentLesson.title}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-white hover:text-white hover:bg-gray-700"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-[#FFFFFF] mb-1 text-bold">
            <span>Course Progress</span>
            <span>{Math.round(currentProgressPercentage)}%</span>
          </div>
          <Progress value={currentProgressPercentage} className="h-2" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 lg:p-6 pb-20 lg:pb-6">
            {/* Video Player */}
            {currentContent.content_type === "video" && (
              <div className="bg-black rounded-lg mb-6 aspect-video flex flex-col items-center justify-center overflow-hidden">
                {currentContent.video_url ? (
                  isVideoFile(currentContent.video_url) ? (
                    <video 
                      src={currentContent.video_url} 
                      controls 
                      className="w-full h-full"
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <iframe
                      src={currentContent.video_url.replace("watch?v=", "embed/")}
                      title={currentContent.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  )
                ) : (
                  <div className="text-center text-white">
                    <PlayCircle className="w-20 h-20 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-400">Video Player Required</p>
                  </div>
                )}
              </div>
            )}

            {/* Main Content Renderers */}
            {currentContent.content_type === "note" && (
              <div className="bg-gray-800 rounded-lg p-8 mb-6 text-white prose prose-invert max-w-none">
                 <div dangerouslySetInnerHTML={{ __html: currentContent.note_text?.replace(/\n/g, "<br />") || "No notes available." }} />
              </div>
            )}

            {currentContent.content_type === "image" && currentContent.file && (
              <div className="bg-gray-800 rounded-lg mb-6 p-4 flex flex-col items-center justify-center overflow-hidden">
                <img src={typeof currentContent.file === 'string' ? currentContent.file : URL.createObjectURL(currentContent.file as File)} alt={currentContent.title} className="max-h-[60vh] md:max-h-[500px] w-auto max-w-full object-contain rounded shadow-sm" />
              </div>
            )}

            {currentContent.content_type === "quiz" && (
                <div className="bg-gray-800 rounded-lg p-8 mb-6 text-white border border-gray-700 text-center ">
                    <CheckCircle className="mx-auto text-primary w-10 h-10 mb-4" />
                    <h3 className="text-xl lg:text-2xl font-bold mb-4">Quiz</h3>
                    <div className="mb-8 text-center">
                      <p className="text-gray-300 text-sm lg:text-lg max-w-2xl mx-auto leading-relaxed">
                        Test your knowledge on the topics covered in this chapter.
                        <br />
                        <span className="inline-block italic mt-3 px-3 py-1.5 bg-primary/10 border-l-4 border-primary text-white font-xs lg:font-medium rounded-r-md">
                          ⚠️ Note: Passing mark is <strong className="text-primary">80%</strong> — you must score at least 80% to proceed.
                        </span>
                      </p>
                    </div>
                    <Link to={`/quiz/${courseId}/${lessonId}`}>
                        <Button size="lg" className="px-10 h-14 text-lg">Start Quiz Now</Button>
                    </Link>
                </div>
            )}

            {currentContent.content_type === "file" && currentContent.file && (
                <InlineFileViewer file={currentContent.file} title={currentContent.title} />
            )}

            {currentContent.content_type === "final_assessment" && (
                <div className="bg-gray-800 rounded-lg p-8 mb-6 text-white border border-gray-700 text-center">
                    <Award className="mx-auto text-yellow-500 w-12 h-12 mb-4" />
                    <h3 className="text-sm lg:text-xl font-bold mb-4">Course Final Assessment</h3>
                    <div className="mb-8 text-center">
                      <p className="text-gray-300 text-sm lg:text-lg max-w-2xl mx-auto leading-relaxed">
                        This is the final assessment for <span className="text-white font-bold">{course.title}</span>. 
                        Successfully passing this exam will earn you your course certificate.
                        <br />
                        <span className="inline-block italic mt-4 px-4 py-2 bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-200 font-medium rounded-r-md">
                          Note: Passing mark is 80%
                        </span>
                      </p>
                    </div>
                    <Link to={`/quiz/${courseId}/final`}>
                        <Button size="lg" className="px-10 h-14 text-lg bg-primary">Start Final Assessment</Button>
                    </Link>
                </div>
            )}

            {/* Lesson Content */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <Tabs key={currentContent.id} defaultValue={currentContent.content_type === "quiz" ? "notes" : "overview"} className="w-full">
                  <TabsList className={`grid w-full ${currentContent.content_type === "quiz" ? "grid-cols-1" : "grid-cols-2"} bg-gray-700`}>
                    {currentContent.content_type !== "quiz" && (
                      <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-gray-600 text-white cursor-pointer"
                      >
                        Overview
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="notes"
                      className="data-[state=active]:bg-gray-600 text-white cursor-pointer"
                    >
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  {currentContent.content_type !== "quiz" && (
                    <TabsContent value="overview" className="mt-6 text-white">
                      <div className="prose prose-invert max-w-none">
                        <p className="text-gray-300 text-lg">
                          {currentContent.description || "No description provided for this content."}
                        </p>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="notes" className="mt-6">
                    <div className="text-center py-12 text-gray-400">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Your notes will appear here</p>
                      <p className="text-sm mt-2">
                        Take notes as you learn to reinforce your understanding
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="border-gray-600 text-white bg-gray-500 hover:bg-gray-700 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-3">
                    {currentContent.content_type !== 'final_assessment' && currentContent.content_type !== 'quiz' && (
                      <Button onClick={handleCompleteContent}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {currentIndex === allContents.length - 1 ? 'Back to Course' : (
                          <>
                            <span className="hidden sm:block">Complete & </span> Continue
                          </>
                        )}
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Backdrop for Mobile */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity duration-300"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative inset-y-0 right-0 z-30 lg:z-0 
            w-80 max-w-[85vw] bg-gray-800 border-l border-gray-700 flex flex-col 
            h-[calc(100vh-64px)] transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
            ${showSidebar ? "translate-x-0" : "translate-x-full lg:hidden"}
          `}
        >
          <div className="p-4 border-b border-gray-700 shrink-0 flex items-center justify-between">
            <h3 className="text-white font-medium">Course Content</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="text-gray-400 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="overflow-y-auto flex-1 px-3">
              <div className="space-y-2">
                {course.lessons?.map((lesson, lessonIdx) => (
                  <div key={lesson.id} className="mb-2">
                    <div className="text-sm font-medium text-gray-300 mb-2 mt-4">
                      Chapter {lessonIdx + 1}: {lesson.title}
                    </div>
                    <div className="space-y-1">
                      {lesson.contents?.map((content, contentIdx) => {
                        const isActive = content.id === numericContentId;
                        const lessonProgress = courseLessonsProgress[numericCourseId]?.find(lp => lp.lesson_id === lesson.id);
                        const isLessonCompleted = lessonProgress?.lesson_completed;

                        return (
                          <button
                            key={content.id}
                            onClick={() =>
                              navigate(`/lesson/${courseId}/${lesson.id}/${content.id}`)
                            }
                            className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
                              isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                            } ${content.content_type === "quiz" ? 'border border-yellow-600/30':''} `}
                          >
                            <div className="flex items-center space-x-3 w-full">
                              <div className="shrink-0 flex items-center justify-center w-5 h-5">
                                {content.content_type === "video" && <PlayCircle className="w-4 h-4" />}
                                {content.content_type === "note" && <FileText className="w-4 h-4" />}
                                {content.content_type === "quiz" && <CheckCircle className="w-4 h-4 text-yellow-500" />}
                                {(content.content_type === "file" || content.content_type === "image") && <FileText className="w-4 h-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm truncate font-medium">
                                  {contentIdx + 1}. {content.title}
                                </div>
                              </div>
                              {isContentCompleted(lesson.id, content.id) && (
                                <div className="shrink-0 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center ml-auto">
                                  <Check  className="text-white p- h-4 w-4"/>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {course?.final_assessment?.questions?.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => navigate(`/lesson/${courseId}/final/final`)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border border-yellow-600/30 ${
                        contentId === 'final' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 w-full cursor-pointer">
                        <div className="shrink-0 flex items-center justify-center w-5 h-5">
                          <Award className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate font-bold tracking-wider">
                            Course Final Assessment
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  };
