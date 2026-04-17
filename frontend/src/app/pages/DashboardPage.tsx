import React from "react";
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { MainLayout } from "../components/MainLayout";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { fetchMyEnrollments } from "../../features/enrollments/enrollmentSlice";
import { fetchCourses } from "../../features/courses/courseSlice";
import { fetchCourseProgress, fetchLearningHoursKPI, fetchCoursesKPI, continueLearning } from "../../features/progress/progressSlice";

export const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const reduxUser = useAppSelector(selectCurrentUser);
  const { myEnrollments } = useAppSelector((state) => state.enrollments);
  const { courses } = useAppSelector((state) => state.courses);
  const { courseProgress, learningHours, coursesKPI } = useAppSelector((state) => state.progress);

  const [isReturningUser, setIsReturningUser] = React.useState(false);

  React.useEffect(() => {
    dispatch(fetchMyEnrollments());
    dispatch(fetchCourses(false));
    dispatch(fetchLearningHoursKPI());
    dispatch(fetchCoursesKPI());
  }, [dispatch]);

  React.useEffect(() => {
    if (reduxUser?.id) {
      const key = `has_visited_dashboard_${reduxUser.id}`;
      const visited = localStorage.getItem(key);
      if (visited) {
        setIsReturningUser(true);
      } else {
        localStorage.setItem(key, 'true');
        setIsReturningUser(false);
      }
    }
  }, [reduxUser?.id]);

  React.useEffect(() => {
    if (myEnrollments.length > 0) {
      myEnrollments.slice(0, 3).forEach(enrollment => {
        dispatch(fetchCourseProgress(enrollment.course));
      });
    }
  }, [dispatch, myEnrollments]);

  const user = reduxUser ? {
    ...reduxUser,
    name: reduxUser.full_name,
    achievements: [], 
  } : null;

  const getCourseDetails = (courseId: number) => {
    return courses.find(c => c.id === courseId);
  };

  const getProgress = (courseId: number) => {
    return courseProgress[courseId];
  };

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };

  // Mock progress data
  const weeklyProgress = [
    { day: "Mon", hours: 0 },
    { day: "Tue", hours: 0 },
    { day: "Wed", hours: 0 },
    { day: "Thu", hours: 0 },
    { day: "Fri", hours: 0 },
    { day: "Sat", hours: 0 },
    { day: "Sun", hours: 0 },
  ];

  const totalHours = learningHours?.total_hours_learned || 0;
  const enrolledCount = coursesKPI?.total_courses_enrolled || myEnrollments.length;
  const completedCount = coursesKPI?.courses_completed || 0;

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl mb-2">
                {isReturningUser ? 'Welcome back' : 'Welcome'}, {user?.name?.split(" ")[0] || "User"}! 👋
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
                <div className="text-4xl">5</div>
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
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Courses Enrolled</p>
                  <p className="text-2xl">{enrolledCount}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +2 this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
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

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                  <p className="text-2xl">68%</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +12% vs last month
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
              <Link to="/courses">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>

            {myEnrollments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No courses yet</h3>
                  <p className="text-gray-600 mb-4">
                    Start learning by enrolling in a course
                  </p>
                  <Link to="/courses">
                    <Button>Browse Courses</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              myEnrollments.slice(0, 3).map((enrollment) => {
                const courseDetail = getCourseDetails(enrollment.course);
                const progress = getProgress(enrollment.course);
                const completionPercentage = Math.round(progress?.completion_percentage || 0);

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
                            src={getImageUrl(courseDetail.thumbnail)}
                            alt={courseDetail.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="secondary" className="mb-2 bg-white text-primary border-none">
                                {courseDetail.category_name || "Course"}
                              </Badge>
                              <h3 className="font-bold text-lg mb-1">{courseDetail.title}</h3>
                              <p className="text-sm text-gray-600">
                                {courseDetail.admin || courseDetail.instructor || "Platform Instructor"}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500 font-medium">Progress</span>
                              <span className="font-bold text-primary">{completionPercentage}%</span>
                            </div>
                            <Progress value={completionPercentage} className="h-2" />
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm text-gray-500 font-medium">
                                {progress?.completed_lessons || 0} of {progress?.total_lessons || 0} lessons completed
                              </span>
                              <Button 
                                className="bg-[#4BA847] hover:bg-[#4BA847]/90" 
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await dispatch(continueLearning(courseDetail.id)).unwrap();
                                  } catch (error) {
                                    console.error("Failed to continue session:", error);
                                  }
                                  window.location.href = `/course/${courseDetail.id}`;
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
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5 text-yellow-600" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.achievements?.slice(0, 3).map((achievement: any) => (
                  <div
                    key={achievement.id}
                    className="flex items-start space-x-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-gray-600">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {achievement.unlockedAt}
                      </p>
                    </div>
                  </div>
                ))}
                {(!user?.achievements || user.achievements.length === 0) && (
                  <div className="text-center py-4">
                    <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Complete courses to unlock achievements
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
                  {weeklyProgress.map((day) => (
                    <div key={day.day}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">{day.day}</span>
                        <span className="font-medium">{day.hours}h</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] rounded-full transition-all"
                          style={{ width: `${(day.hours / 3) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
