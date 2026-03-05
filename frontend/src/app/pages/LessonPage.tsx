import React, { useState } from "react";
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
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { toast } from "sonner";

export const LessonPage: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const { courses, completeLesson, user } = useApp();
  const navigate = useNavigate();
  const [showSidebar, setShowSidebar] = useState(true);

  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Find current lesson
  let currentLesson: any = null;
  let currentSection: any = null;
  let lessonIndex = 0;
  let allLessons: any[] = [];

  course.syllabus.forEach((section) => {
    section.lessons.forEach((lesson) => {
      allLessons.push({ ...lesson, sectionTitle: section.title });
      if (lesson.id === lessonId) {
        currentLesson = lesson;
        currentSection = section;
      }
    });
  });

  if (!currentLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Lesson not found</h2>
          <Link to={`/course/${courseId}`}>
            <Button>Back to course</Button>
          </Link>
        </div>
      </div>
    );
  }

  lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const progress = ((lessonIndex + 1) / allLessons.length) * 100;

  const handleCompleteLesson = () => {
    completeLesson(courseId!, lessonId!);
    toast.success("Lesson completed!");
    handleNext();
  };

  const handleNext = () => {
    if (lessonIndex < allLessons.length - 1) {
      const nextLesson = allLessons[lessonIndex + 1];
      navigate(`/lesson/${courseId}/${nextLesson.id}`);
    } else {
      navigate(`/certificate/${courseId}`);
    }
  };

  const handlePrevious = () => {
    if (lessonIndex > 0) {
      const prevLesson = allLessons[lessonIndex - 1];
      navigate(`/lesson/${courseId}/${prevLesson.id}`);
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
              <h1 className="text-white font-medium">{course.title}</h1>
              <p className="text-sm text-gray-400">{currentLesson.title}</p>
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
          <div className="flex items-center justify-between text-sm text-[#FFFFFF] mb-1 text-bold">
            <span>Course Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Video Player */}
            {currentLesson.type === "video" && (
              <div className="bg-black rounded-lg mb-6 aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <PlayCircle className="w-20 h-20 mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400">Video Player</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Duration: {currentLesson.duration}
                  </p>
                </div>
              </div>
            )}

            {/* Lesson Content */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-gray-600 text-white"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="notes"
                      className="data-[state=active]:bg-gray-600 text-white"
                    >
                      Notes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6 text-white">
                    <h2 className="text-2xl mb-4">{currentLesson.title}</h2>
                    <div className="prose prose-invert max-w-none">
                      <p className="text-gray-300 mb-4">
                        Welcome to this lesson! In this session, you'll learn
                        about the fundamentals and practical applications of the
                        topic. Make sure to follow along and try the examples
                        yourself.
                      </p>

                      <h3 className="text-xl mt-6 mb-3">Key Learning Points</h3>
                      <ul className="space-y-2 text-gray-300">
                        <li>Understand the core concepts and principles</li>
                        <li>Learn practical implementation techniques</li>
                        <li>Practice with hands-on examples</li>
                        <li>Apply knowledge to real-world scenarios</li>
                      </ul>

                      <h3 className="text-xl mt-6 mb-3">Practice Exercise</h3>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <p className="text-gray-300 mb-2">
                          Try implementing what you've learned in this lesson.
                          Create a simple example that demonstrates the concepts
                          covered.
                        </p>
                        <code className="text-sm text-blue-400">
                          // Your code here
                        </code>
                      </div>
                    </div>
                  </TabsContent>

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
                    disabled={lessonIndex === 0}
                    className="border-gray-600 text-white hover:bg-gray-700"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-3">
                    {currentLesson.type === "quiz" ? (
                      <Link to={`/quiz/${courseId}/${lessonId}`}>
                        <Button>Start Quiz</Button>
                      </Link>
                    ) : (
                      <Button onClick={handleCompleteLesson}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete & Continue
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-auto">
            <div className="p-4">
              <h3 className="text-white font-medium mb-4">Course Content</h3>
              <div className="space-y-2">
                {course.syllabus.map((section, sectionIdx) => (
                  <div key={section.id}>
                    <div className="text-sm font-medium text-gray-300 mb-2 mt-4">
                      {sectionIdx + 1}. {section.title}
                    </div>
                    {section.lessons.map((lesson) => {
                      const isActive = lesson.id === lessonId;
                      const isCompleted = user?.completedLessons.some(
                        (cl) =>
                          cl.courseId === courseId && cl.lessonId === lesson.id,
                      );
                      return (
                        <button
                          key={lesson.id}
                          onClick={() =>
                            navigate(`/lesson/${courseId}/${lesson.id}`)
                          }
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {lesson.type === "video" && (
                              <PlayCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            {lesson.type === "reading" && (
                              <FileText className="w-4 h-4 flex-shrink-0" />
                            )}
                            {lesson.type === "quiz" && (
                              <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm truncate">
                                {lesson.title}
                              </div>
                              <div className="text-xs opacity-75">
                                {lesson.duration}
                              </div>
                            </div>
                            {isCompleted && (
                              <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
