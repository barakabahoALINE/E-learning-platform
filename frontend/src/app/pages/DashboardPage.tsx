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
import { useApp } from "../context/AppContext";
import { MainLayout } from "../components/MainLayout";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser } from "../../features/auth/authSelectors";

export const DashboardPage: React.FC = () => {
  const { enrolledCourses } = useApp();
  const reduxUser = useAppSelector(selectCurrentUser);

  const user = reduxUser ? {
    ...reduxUser,
    name: reduxUser.full_name,
    achievements: [], 
  } : null;

  // Mock progress data
  const weeklyProgress = [
    { day: "Mon", hours: 2 },
    { day: "Tue", hours: 1.5 },
    { day: "Wed", hours: 3 },
    { day: "Thu", hours: 2.5 },
    { day: "Fri", hours: 1 },
    { day: "Sat", hours: 0 },
    { day: "Sun", hours: 0 },
  ];

  const totalHours = weeklyProgress.reduce((sum, day) => sum + day.hours, 0);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] rounded-2xl p-8 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl mb-2">
                Welcome back, {user?.name?.split(" ")[0] || "User"}! 👋
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
                  <p className="text-2xl">{enrolledCourses.length}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Achievements</p>
                  <p className="text-2xl">{user?.achievements?.length || 0}</p>
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

            {enrolledCourses.length === 0 ? (
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
              enrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {course.category}
                            </Badge>
                            <h3 className="font-medium mb-1">{course.title}</h3>
                            <p className="text-sm text-gray-600 mb-3">
                              By {course.instructor.name}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">45%</span>
                          </div>
                          <Progress value={45} />
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-gray-600">
                              12 of 27 lessons completed
                            </span>
                            <Link to={`/lesson/${course.id}/1-1-1`}>
                              <Button className="bg-[#4BA847]" size="sm">
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Continue
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
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
