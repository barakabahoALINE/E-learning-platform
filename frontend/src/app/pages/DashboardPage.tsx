import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  PlayCircle,
  Award,
  Target,
  Zap,
  RotateCcw,
  CheckCircle,
  MessageSquare,
  Heart,
  ArrowRight,
  X,
} from "lucide-react";
import AskDiscussionModal from "../components/AskDiscussionModal";
import { MainLayout } from "../components/MainLayout";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { fetchMyEnrollments } from "../../features/enrollments/enrollmentSlice";
import {
  fetchCourses,
  fetchCategories,
} from "../../features/courses/courseSlice";
import { getMediaUrl } from "../utils/media";
import {
  fetchCourseProgress,
  fetchLearningHoursKPI,
  fetchLearningActivityKPI,
  fetchCoursesKPI,
  fetchCompletionRateKPI,
  continueLearning,
  fetchCourseSectionsProgress,
} from "../../features/progress/progressSlice";
import { normalizeCourseId, useCommunity } from "../data/community-data";
import { useLikeState } from "../data/like-data";

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reduxUser = useAppSelector(selectCurrentUser);
  const { discussions, addDiscussion } = useCommunity();
  const { getSummary } = useLikeState(reduxUser?.id);
  const { myEnrollments } = useAppSelector((state) => state.enrollments);
  const { courses, categories } = useAppSelector((state) => state.courses);
  const {
    courseProgress,
    courseSectionsProgress,
    learningHours,
    learningActivity,
    coursesKPI,
    completionRateKPI,
  } = useAppSelector((state) => state.progress);

  const [isReturningUser, setIsReturningUser] = React.useState(false);

  React.useEffect(() => {
    dispatch(fetchMyEnrollments());
    dispatch(fetchCourses(false));
    dispatch(fetchCategories());
    dispatch(fetchLearningHoursKPI());
    dispatch(fetchLearningActivityKPI());
    dispatch(fetchCoursesKPI());
    dispatch(fetchCompletionRateKPI());
  }, [dispatch]);

  React.useEffect(() => {
    if (reduxUser?.id) {
      const key = `has_visited_dashboard_${reduxUser.id}`;
      const visited = localStorage.getItem(key);
      if (visited) {
        setIsReturningUser(true);
      } else {
        localStorage.setItem(key, "true");
        setIsReturningUser(false);
      }
    }
  }, [reduxUser?.id]);

  React.useEffect(() => {
    myEnrollments.forEach((enrollment) => {
      dispatch(fetchCourseProgress(Number(enrollment.course)));
      dispatch(fetchCourseSectionsProgress(Number(enrollment.course)));
    });
  }, [dispatch, myEnrollments]);

  const user = reduxUser
    ? {
        ...reduxUser,
        name: reduxUser.full_name,
        achievements: [],
      }
    : null;

  const getCourseDetails = (courseId: number) => {
    return courses.find((c) => c.id === courseId);
  };

  const getProgress = (courseId: number) => {
    return courseProgress[courseId];
  };

  const getItemProgress = (courseId: number) => {
    const sections = courseSectionsProgress[courseId] || [];
    const total = sections.reduce(
      (sum, section) => sum + (section.total_contents || 0),
      0,
    );
    const completed = sections.reduce(
      (sum, section) => sum + (section.completed_contents || 0),
      0,
    );
    return { total, completed };
  };

  const totalHours =
    learningHours?.weekly_totals?.[0]?.hours ??
    learningHours?.total_hours_learned ??
    0;
  const currentStreak = learningActivity?.current_streak || 0;
  const weeklyProgress = learningActivity?.weekly_activity || [
    { day: "Sun", hours: 0, minutes: 0, date: "" },
    { day: "Mon", hours: 0, minutes: 0, date: "" },
    { day: "Tue", hours: 0, minutes: 0, date: "" },
    { day: "Wed", hours: 0, minutes: 0, date: "" },
    { day: "Thu", hours: 0, minutes: 0, date: "" },
    { day: "Fri", hours: 0, minutes: 0, date: "" },
    { day: "Sat", hours: 0, minutes: 0, date: "" },
  ];
  const activeEnrollments = myEnrollments.filter(
    (enrollment) => enrollment.status !== "cancelled",
  );
  const learningHistory = activeEnrollments
    .map((enrollment) => {
      const course = getCourseDetails(enrollment.course);
      if (!course) return null;
      const progress = getProgress(enrollment.course);
      const percent = Math.round(
        progress?.completion_percentage || progress?.progress_percentage || 0,
      );
      return {
        id: enrollment.id,
        courseId: enrollment.course,
        courseName: course.title,
        thumbnail: course.thumbnail,
        category:
          typeof course.category === "string"
            ? course.category
            : categories.find((c) => c.id === Number(course.category))?.name,
        status:
          enrollment.status === "completed" ||
          progress?.course_completed ||
          percent >= 100
            ? "completed"
            : "in-progress",
        progress: percent,
        lastAccessedAt: progress?.completed_at || enrollment.enrolled_at,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.lastAccessedAt).getTime() -
        new Date(a!.lastAccessedAt).getTime(),
    );

  const inProgressEnrollments = activeEnrollments.filter((enrollment) => {
    const progress = getProgress(enrollment.course);
    const percent = Math.round(
      progress?.completion_percentage || progress?.progress_percentage || 0,
    );
    const isCompleted =
      enrollment.status === "completed" ||
      progress?.course_completed ||
      percent >= 100;
    return !isCompleted;
  });

  const enrolledCount = activeEnrollments.length;
  const completedCount = learningHistory.filter(
    (item) => item!.status === "completed",
  ).length;
  const completionRate =
    enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;
  const completionRateChange =
    completionRateKPI?.change_percentage ??
    completionRateKPI?.month_over_month_change;

  const enrolledCourses = learningHistory.filter((item) => item !== null);
  const enrolledCourseIds = new Set(
    enrolledCourses.map((course) =>
      normalizeCourseId(String(course?.courseId ?? "")),
    ),
  );
  const communityPreviews = discussions
    .filter((discussion) =>
      enrolledCourseIds.has(normalizeCourseId(discussion.courseId)),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 3);

  const formatRelativeTime = (value: string) => {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Ask modal state
  const [showAskModal, setShowAskModal] = React.useState(false);

  const enrolledCoursesSimple = enrolledCourses.map((c) => ({
    id: String(c!.courseId),
    title: c!.courseName,
  }));

  const currentUserId = reduxUser ? String(reduxUser.id) : "";
  const currentUserName = reduxUser
    ? reduxUser.full_name || reduxUser.email?.split("@")[0] || "User"
    : "User";

  const handlePostDiscussion = (
    courseId: string,
    courseTitle: string,
    title: string,
    description: string,
  ) => {
    const newId = addDiscussion(courseId, courseTitle, title, description);
    setShowAskModal(false);
    navigate(`/community/${newId}`);
    return newId;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl mb-2">
                {isReturningUser ? "Welcome back" : "Welcome"},{" "}
                {user?.name?.split(" ")[0] || "User"}!
              </h1>
              <p className="text-blue-100 mb-4">
                You've learned {totalHours} hours this week. Keep up the great
                work!
              </p>
              <Link to="/courses">
                <Button variant="secondary" size="lg">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Browse Courses
                </Button>
              </Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 min-w-[200px]">
              <div className="text-sm text-blue-100 mb-1">Learning Streak</div>
              <div className="flex items-baseline">
                <div className="text-4xl">{currentStreak}</div>
                <div className="text-xl ml-2">days</div>
              </div>
              <div className="flex items-center mt-2 text-sm text-blue-100">
                <Zap className="w-4 h-4 mr-1" />
                <span>Keep it going!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Courses Enrolled</p>
                  <p className="text-2xl">{enrolledCount}</p>
                  {/* <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +2 this month
                  </p> */}
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Hours Learned</p>
                  <p className="text-2xl">{totalHours}</p>
                  <p className="text-xs text-gray-500 mt-1">This week</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Course Completed</p>
                  <p className="text-2xl">{completedCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Unlocked</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-2xl">{completionRate}%</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {completionRateChange !== undefined
                      ? `${completionRateChange >= 0 ? "+" : ""}${Math.round(completionRateChange)}% vs last month`
                      : "Based on completed courses"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Continue Learning */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Continue Learning</h2>
              <Link to="/profile?tab=courses">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>

            {inProgressEnrollments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No courses in progress</h3>
                  <p className="text-gray-600 mb-4">
                    Start learning by enrolling in a course
                  </p>
                  <Link to="/courses">
                    <Button>Browse Courses</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              inProgressEnrollments.slice(0, 3).map((enrollment) => {
                const courseDetail = getCourseDetails(enrollment.course);
                const progress = getProgress(enrollment.course);
                const completionPercentage = Math.round(
                  progress?.completion_percentage || 0,
                );
                const itemProgress = getItemProgress(enrollment.course);

                if (!courseDetail) return null;

                return (
                  <Card
                    key={enrollment.id}
                    className="hover:shadow-lg transition-shadow bg-gray-50 mb-4"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <div className="relative group overflow-hidden rounded-xl w-full sm:w-32 h-32 flex-shrink-0">
                          <img
                            src={getMediaUrl(courseDetail.thumbnail)}
                            alt={courseDetail.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="secondary" className="mb-2">
                                {typeof courseDetail.category === "string"
                                  ? courseDetail.category
                                  : categories.find(
                                      (c) =>
                                        c.id === Number(courseDetail.category),
                                    )?.name || "Category"}
                              </Badge>
                              <h3 className="font-bold text-lg mb-1">
                                {courseDetail.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {courseDetail.admin ||
                                  courseDetail.instructor ||
                                  "Platform Instructor"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 font-medium">
                                Progress
                              </span>
                              <span className="font-bold text-primary">
                                {completionPercentage}%
                              </span>
                            </div>
                            <Progress
                              value={completionPercentage}
                              className="h-2"
                            />
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm text-gray-500 font-medium">
                                {itemProgress.completed} of {itemProgress.total}{" "}
                                items completed
                              </span>
                              <Button
                                className="bg-primary hover:bg-primary/90"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await dispatch(
                                      continueLearning(Number(courseDetail.id)),
                                    ).unwrap();
                                  } catch (error) {
                                    console.error(
                                      "Failed to continue session:",
                                      error,
                                    );
                                  }
                                  navigate(`/course/${courseDetail.id}`);
                                }}
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Continue
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5 text-blue-600" />
                  Learning History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {learningHistory.length > 0 ? (
                  <>
                    {learningHistory.slice(0, 2).map((item) => (
                      <div
                        key={item!.courseId}
                        className="flex items-start space-x-3"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={getMediaUrl(item!.thumbnail)}
                            alt={item!.courseName}
                            className="w-12 h-12 rounded object-cover"
                          />
                          {item!.status === "completed" && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item!.courseName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={
                                item!.status === "completed"
                                  ? "secondary"
                                  : "default"
                              }
                              className="text-xs"
                            >
                              {item!.status === "completed"
                                ? "Completed"
                                : "In Progress"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {item!.progress}%
                            </span>
                          </div>
                          <Progress
                            value={item!.progress}
                            className="h-1.5 mt-2"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                item!.lastAccessedAt,
                              ).toLocaleDateString()}
                            </span>
                            <Link to={`/course/${item!.courseId}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                              >
                                {item!.status === "completed" ? (
                                  <>
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Revisit
                                  </>
                                ) : (
                                  <>
                                    <PlayCircle className="w-3 h-3 mr-1" />
                                    Resume
                                  </>
                                )}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Link to="/profile?tab=history" className="block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        View Full History
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Your learning history will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyProgress.map((day) => {
                    const width = Math.min(100, (day.hours / 3) * 100);
                    return (
                      <div key={day.day}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">{day.day}</span>
                          <span className="font-medium">
                            {day.hours.toFixed(1)}h
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] rounded-full transition-all"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Learning Community
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/community")}
                className="text-blue-600 hover:text-blue-700 gap-1 text-sm"
              >
                View Community <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            {showAskModal && (
              <AskDiscussionModal
                enrolledCourses={enrolledCoursesSimple}
                defaultCourseId={enrolledCoursesSimple[0]?.id}
                onPost={handlePostDiscussion}
                onClose={() => setShowAskModal(false)}
              />
            )}
            {enrolledCourses.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Start learning to join discussions.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Enroll in a course to ask questions and interact with other
                  learners.
                </p>
                <Link to="/courses">
                  <Button
                    size="sm"
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Browse Courses
                  </Button>
                </Link>
              </div>
            ) : communityPreviews.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <div className="max-w-xl text-center">
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    No discussions yet in your courses.
                  </p>
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                    Be the first to ask a question — start a discussion for your
                    classmates and instructors to engage with.
                  </p>
                  <div className="mt-6">
                    <Button
                      className="bg-white text-black shadow-sm px-5 py-2 rounded-full"
                      onClick={() => setShowAskModal(true)}
                    >
                      Start a Discussion
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {communityPreviews.map((discussion) => {
                  const discussionLike = getSummary(
                    "discussion",
                    discussion.id,
                  );
                  return (
                    <button
                      key={discussion.id}
                      onClick={() => navigate(`/community/${discussion.id}`)}
                      className="w-full text-left rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-slate-950 p-4 transition hover:shadow-sm hover:border-blue-200/70 dark:hover:border-blue-500/40"
                    >
                      <div className="min-w-0">
                        <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300 mb-2">
                          {discussion.courseTitle}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 transition-colors line-clamp-1 mb-2">
                          {discussion.title}
                        </h3>
                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {discussion.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{discussion.authorName}</span>
                          <span aria-hidden="true">•</span>
                          <span>
                            {formatRelativeTime(discussion.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                          <div className="inline-flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span>{discussion.replyCount}</span>
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <Heart
                              className="w-4 h-4"
                              fill={
                                discussionLike.likedByCurrentUser
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                            <span>{discussionLike.likeCount}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};
