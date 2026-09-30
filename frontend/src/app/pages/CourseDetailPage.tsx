import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  PlayCircle,
  CheckCircle,
  Award,
  Globe,
  Smartphone,
  FileText,
  ArrowLeft,
  Loader2,
  MessageSquare,
  Heart,
  X,
} from "lucide-react";
import {
  fetchCourseDetails,
  fetchCategories,
  fetchLevels,
} from "../../features/courses/courseSlice";
import {
  fetchMyEnrollments,
  enrollInCourse,
} from "../../features/enrollments/enrollmentSlice";
import {
  fetchCourseProgress,
  startLearning,
  continueLearning,
  fetchCourseModulesProgress,
} from "../../features/progress/progressSlice";
import {
  normalizeCourseId,
  useCommunity,
  formatRelativeTime,
} from "../data/community-data";
import { useLikeState } from "../data/like-data";
import { MainLayout } from "../components/MainLayout";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { getMediaUrl } from "../utils/media";
import AskDiscussionModal from "../components/AskDiscussionModal";

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    currentCourse: course,
    isLoading: isCourseLoading,
    categories,
    levels,
    status: courseStatus,
  } = useAppSelector((state) => state.courses);

  const { myEnrollments, loading: isEnrollmentLoading } = useAppSelector(
    (state) => state.enrollments,
  );
  const { courseProgress, courseModulesProgress } = useAppSelector(
    (state) => state.progress,
  );
  const { user } = useAppSelector((state) => state.auth);

  const { discussions, addDiscussion } = useCommunity();
  const { getSummary } = useLikeState(user ? String(user.id) : undefined);
  const [showAskModal, setShowAskModal] = React.useState(false);

  const handleOpenAskModal = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setShowAskModal(true);
  };

  const numericCourseId = Number(courseId);
  const isEnrolled = myEnrollments.some((e) => e.course === numericCourseId);
  const progress = courseProgress[numericCourseId];
  const isCurrentCourseLoaded = Boolean(
    course && Number(course.id) === numericCourseId,
  );

  const normalizedCourseId = normalizeCourseId(
    String(course?.id ?? numericCourseId),
  );
  const courseDiscussions = discussions
    .filter(
      (discussion) =>
        normalizeCourseId(String(discussion.courseId)) === normalizedCourseId,
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const discussionCount = courseDiscussions.length;

  const handlePostCourseDiscussion = (
    courseIdValue: string,
    courseTitle: string,
    title: string,
    description: string,
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const newDiscussionId = addDiscussion(
      courseIdValue,
      courseTitle,
      title,
      description,
      String(user.id),
      user.full_name || user.email?.split("@")[0] || "User",
    );
    setShowAskModal(false);
    navigate(`/community/${newDiscussionId}`);
  };

  const enrolledCoursesForModal = course
    ? [{ id: String(course.id), title: course.title }]
    : [];

  useEffect(() => {
    if (numericCourseId) {
      dispatch(fetchCourseDetails(numericCourseId));
      dispatch(fetchCourseProgress(numericCourseId));
      dispatch(fetchCourseModulesProgress(numericCourseId));
    }
  }, [dispatch, numericCourseId]);

  useEffect(() => {
    if (user && numericCourseId) {
      dispatch(fetchMyEnrollments());
    }
  }, [dispatch, numericCourseId, user?.id]);

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
    if (levels.length === 0) dispatch(fetchLevels());
  }, [dispatch]);

  if (courseStatus === "failed" && !isCurrentCourseLoaded) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (isCourseLoading || !isCurrentCourseLoaded) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await dispatch(enrollInCourse(numericCourseId)).unwrap();
      await dispatch(fetchCourseProgress(numericCourseId)).unwrap();
      toast.success("Successfully enrolled in course!");
    } catch (error: any) {
      toast.error(error || "Failed to enroll in course");
    }
  };

  const handleStartLearning = async () => {
    // Explicitly call start or continue based on current progress
    try {
      if (progress?.completion_percentage === 0) {
        await dispatch(startLearning(numericCourseId)).unwrap();
      } else {
        await dispatch(continueLearning(numericCourseId)).unwrap();
      }
    } catch (error) {
      console.error("Failed to update learning session:", error);
    }

    // Smart resume navigation - find the first incomplete module
    const modulesProgress = courseModulesProgress[numericCourseId] || [];
    const incompleteModuleProgress = modulesProgress.find(
      (m) => !m.module_completed,
    );

    let targetModule = course.modules?.[0];
    if (incompleteModuleProgress) {
      const foundModule = course.modules?.find(
        (m) => Number(m.id) === Number(incompleteModuleProgress.module_id),
      );
      if (foundModule) {
        targetModule = foundModule;
      }
    }

    if (targetModule) {
      navigate(`/learning/${course.id}/${targetModule.id}`);
    }
  };

  const handleViewCertificate = () => {
    navigate(`/certificate/${course.id}`);
  };

  const totalModules = course.modules?.length || 0;
  const totalItems =
    course.modules?.reduce(
      (sum, module) =>
        sum +
        module.sections.reduce(
          (sSum, section) => sSum + (section.contents?.length || 0),
          0,
        ),
      0,
    ) || 0;

  const categoryName =
    (typeof course.category === "string" && course.category) ||
    categories.find(
      (c) => c.id === course.category_id || c.id === Number(course.category),
    )?.name ||
    "Uncategorized";
  const levelName =
    (typeof course.level === "string" &&
      isNaN(Number(course.level)) &&
      course.level) ||
    levels.find(
      (l) => l.id === course.level_id || l.id === Number(course.level),
    )?.name ||
    "All Levels";

  return (
    <MainLayout>
      {showAskModal && (
        <AskDiscussionModal
          enrolledCourses={enrolledCoursesForModal}
          defaultCourseId={String(course.id)}
          onClose={() => setShowAskModal(false)}
          onPost={handlePostCourseDiscussion}
        />
      )}
      <div className="space-y-6">
        {/* Back Button */}
        <Link to="/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to courses
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative rounded-xl overflow-hidden mb-6 group">
              <img
                src={getMediaUrl(course.thumbnail)}
                alt={course.title}
                className="w-full h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
                <div className="p-8 text-white w-full">
                  <Badge className="mb-3 bg-primary hover:bg-primary/90">
                    {categoryName}
                  </Badge>
                  <h1 className="text-md lg:text-4xl font-bold mb-3 tracking-tight">
                    {course.title}
                  </h1>
                  <p className="text-sm lg:text-lg text-gray-200 mb-6 max-w-2xl line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Star className="w-4 h-4 text-yellow-400 mr-2 fill-yellow-400" />
                      <span className="font-semibold">
                        {course?.rating || 0}
                      </span>
                      <span className="ml-1 opacity-70">
                        ({course.enrolled_students_count || 0}{" "}
                        {course.enrolled_students_count == 1
                          ? "student"
                          : "students"}
                        )
                      </span>
                    </div>
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Award className="w-4 h-4 mr-2" />
                      <span>{levelName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="cursor-pointer">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="curriculum" className="cursor-pointer">
                  Curriculum
                </TabsTrigger>
                <TabsTrigger value="instructor" className="cursor-pointer">
                  Instructor
                </TabsTrigger>
                <TabsTrigger
                  value="discussions"
                  className="cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Discussions</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {discussionCount}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {course.modules && course.modules.length > 0 ? (
                        course.modules.map((module) => (
                          <div
                            key={module.id}
                            className="flex items-start space-x-2"
                          >
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium">
                              {module.title}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-sm text-gray-500 italic">
                          Learning objectives will be published soon.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">Course Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Total Modules
                          </div>
                          <div className="font-medium">
                            {totalModules} modules
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-medium">{course.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Language</div>
                          <div className="font-medium">English</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Award className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Certificate
                          </div>
                          <div className="font-medium">Included</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculum" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">Course Curriculum</h3>
                    <Accordion type="single" collapsible className="w-full">
                      {course.modules
                        ?.flatMap((module) => module.sections ?? [])
                        .map((section, index) => (
                          <AccordionItem
                            key={section.id}
                            value={section.id.toString()}
                          >
                            <AccordionTrigger>
                              <div className="flex items-center justify-between w-full pr-4">
                                <span className="font-medium">
                                  {index + 1}. {section.title}
                                </span>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span>
                                    {section.contents?.length ?? 0}{" "}
                                    {section.contents?.length === 1
                                      ? "lesson"
                                      : "lessons"}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pt-2">
                                {section.contents?.map((lesson) => (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <FileText className="w-5 h-5 text-gray-400" />
                                      <span className="text-sm">
                                        {lesson.title}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-6">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {course.admin
                            ? course.admin.substring(0, 2).toUpperCase()
                            : course.instructor
                              ? course.instructor.substring(0, 2).toUpperCase()
                              : "AD"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {course.admin ||
                            course.instructor ||
                            "Platform Instructor"}
                        </h3>
                        <p className="text-gray-600 mb-3">Course Creator</p>
                        <div className="flex items-center flex-wrap gap-y-2 space-x-4 text-sm">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                            <span>4.8 rating</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-gray-500" />
                            <span>
                              {course.enrolled_students_count || 0} students
                            </span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1 text-gray-500" />
                            <span>1+ courses</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* <p className="text-gray-700">
                      This course is authored and maintained by our expert instructors. They are dedicated to bringing you the highest quality learning material and keeping the content up to date with the latest industry standards.
                    </p> */}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discussions" className="mt-6 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      Course discussions
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {discussionCount > 0
                        ? `Browse ${discussionCount} question${discussionCount > 1 ? "s" : ""} and join the conversation.`
                        : "No discussions yet for this course — start the first one."}
                    </p>
                  </div>
                  {isEnrolled ? (
                    <Button
                      onClick={handleOpenAskModal}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      {user ? "Ask a Question" : "Sign in to ask"}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEnroll}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Enroll to join
                    </Button>
                  )}
                </div>

                {courseDiscussions.length === 0 ? (
                  <Card className="border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <CardContent className="p-10 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                        <MessageSquare className="h-7 w-7" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        No discussions yet
                      </h4>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {isEnrolled
                          ? "Be the first to ask a question for this course."
                          : "Enroll in the course to join the discussion board."}
                      </p>
                      {isEnrolled && (
                        <div className="mt-5">
                          <Button
                            onClick={handleOpenAskModal}
                            className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-700"
                          >
                            {user
                              ? "Ask the first question"
                              : "Sign in to ask the first question"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {courseDiscussions.map((discussion) => {
                      const discussionLike = getSummary(
                        "discussion",
                        discussion.id,
                      );
                      return (
                        <Link
                          to={`/community/${discussion.id}`}
                          key={discussion.id}
                          className="block rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/40"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                                {discussion.courseTitle}
                              </span>
                              <h4 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {discussion.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Heart
                                  className="h-4 w-4"
                                  fill={
                                    discussionLike.likedByCurrentUser
                                      ? "currentColor"
                                      : "none"
                                  }
                                />
                                {discussionLike.likeCount}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {discussion.replyCount}
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {discussion.description}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{discussion.authorName}</span>
                            <span aria-hidden="true">•</span>
                            <span>
                              {formatRelativeTime(discussion.createdAt)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {progress?.completion_percentage === 100 ? (
                  <div className="space-y-6">
                    <div className="text-center py-4 bg-green-50 rounded-2xl">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <Badge className="bg-green-600 mb-2">
                        Course Completed
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2 px-4">
                        Congratulations! You've mastered this course
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleViewCertificate}
                    >
                      <Award className="mr-2 h-5 w-5 text-primary" />
                      View Certificate
                    </Button>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartLearning}
                    >
                      Review Course Content
                    </Button>
                  </div>
                ) : isEnrolled ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-primary">
                        You're enrolled!
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">
                          Your Progress
                        </span>
                        <span className="font-bold text-primary">
                          {Math.round(progress?.completion_percentage || 0)}%
                        </span>
                      </div>
                      <Progress
                        value={progress?.completion_percentage || 0}
                        className="h-2"
                      />
                      <p className="text-xs text-gray-500 text-center">
                        {progress?.completed_lessons || 0} of{" "}
                        {progress?.total_lessons ?? totalItems}{" "}
                        {(progress?.total_lessons ?? totalItems) === 1
                          ? "item"
                          : "items"}{" "}
                        completed
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartLearning}
                    >
                      {progress?.completion_percentage === 0
                        ? "Start Learning"
                        : "Continue Learning"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-4 rounded-2xl">
                      {Number(course.price) === 0 ? (
                        <div>
                          <div className="text-3xl text-green-600 mb-2">
                            Free
                          </div>
                          <p className="text-sm text-gray-600">
                            Full access to all content
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-3xl mb-2">
                            Frw{" "}
                            {Number(course.price).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleEnroll}
                      disabled={isEnrollmentLoading}
                    >
                      {isEnrollmentLoading ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Enroll Now"
                      )}
                    </Button>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t space-y-4">
                  <h4 className="font-medium mb-3">This course includes:</h4>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <BookOpen className="w-4 h-4 mr-3 text-primary" />
                      <span>
                        {totalModules}{" "}
                        {totalModules === 1 ? "Module" : "Modules"}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <FileText className="w-4 h-4 mr-3 text-primary" />
                      <span>{totalItems} Learning items</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Smartphone className="w-4 h-4 mr-3 text-primary" />
                      <span>Access on mobile and tablet</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Award className="w-4 h-4 mr-3 text-primary" />
                      <span>Certificate of completion</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
