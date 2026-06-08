import { Users, BookOpen, CheckCircle, TrendingUp, Loader2 } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import React from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { fetchCategories, fetchCourses } from "../../features/courses/courseSlice";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import api from "../../services/api";

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6B7280"];

interface AdminEnrollment {
  id: number;
  student: number;
  student_email: string;
  course: number;
  course_title: string;
  status: string;
  enrolled_at: string;
  updated_at?: string;
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  institution?: string;
  role?: string;
  is_verified?: boolean;
}

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { courses, categories } = useAppSelector((state) => state.courses);
  const currentUser = useAppSelector(selectCurrentUser);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [enrollments, setEnrollments] = React.useState<AdminEnrollment[]>([]);
  const [completedItems, setCompletedItems] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);

  const isInstructor = currentUser?.role === 'instructor' || currentUser?.groups?.includes('Instructor');

  React.useEffect(() => {
    dispatch(fetchCourses(true));
    dispatch(fetchCategories());
  }, [dispatch]);

  React.useEffect(() => {
    const loadDashboardData = async () => {
      try {
        let loadedUsers: AdminUser[] = [];
        let loadedEnrollments: AdminEnrollment[] = [];

        if (isInstructor) {
          const enrollmentsResponse = await api.get("instructor/course-enrollments/");
          const instructorEnrollments: any[] = enrollmentsResponse.data.data || enrollmentsResponse.data || [];

          const studentMap = new Map<number, AdminUser>();
          instructorEnrollments.forEach((e: any) => {
            const student = e.student;
            const studentId = typeof student === 'object' ? student.id : student;
            if (typeof student === 'object' && !studentMap.has(studentId)) {
              studentMap.set(studentId, {
                id: studentId,
                email: student.email || '',
                full_name: student.full_name || student.email || '',
                role: 'student',
              });
            }
            const courseId = typeof e.course === 'object' ? e.course.id : e.course;
            const courseTitle = typeof e.course === 'object' ? e.course.title : String(e.course || '');
            loadedEnrollments.push({
              id: e.id,
              student: studentId,
              student_email: typeof student === 'object' ? (student.email || '') : '',
              course: courseId,
              course_title: courseTitle,
              status: e.status,
              enrolled_at: e.enrolled_at,
            });
          });
          loadedUsers = Array.from(studentMap.values());
        } else {
          const [usersResponse, enrollmentsResponse] = await Promise.all([
            api.get("auth/users/"),
            api.get("enrollments/"),
          ]);
          loadedUsers = usersResponse.data.data || usersResponse.data || [];
          loadedEnrollments = enrollmentsResponse.data.data || enrollmentsResponse.data || [];
        }

        setUsers(loadedUsers);
        setEnrollments(loadedEnrollments);

        const progressResults = await Promise.allSettled(
          loadedEnrollments.map((enrollment: AdminEnrollment) =>
            api.get(`progress/admin/students/${enrollment.student}/courses/${enrollment.course}/`)
          )
        );

        const totalCompleted = progressResults.reduce((sum, result) => {
          if (result.status !== "fulfilled") return sum;
          const data = result.value.data.data || result.value.data;
          return sum + (data.completed_modules || data.completed_sections || 0);
        }, 0);

        setCompletedItems(totalCompleted);
      } catch (error) {
        console.error("Failed to load dashboard overview data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [isInstructor]);

  const learners = users.filter(user => user.role === "student");
  const activeEnrollments = enrollments.filter(enrollment => enrollment.status !== "cancelled");
  const completedEnrollments = enrollments.filter(enrollment => enrollment.status === "completed");
  const completionRate = activeEnrollments.length > 0
    ? Math.round((completedEnrollments.length / activeEnrollments.length) * 100)
    : 0;

  const monthlyEnrollmentData = React.useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        date,
        month: monthFormatter.format(date),
        users: 0,
      };
    });

    activeEnrollments.forEach((enrollment) => {
      const enrolledDate = new Date(enrollment.enrolled_at);
      const bucket = months.find(item =>
        item.date.getFullYear() === enrolledDate.getFullYear() &&
        item.date.getMonth() === enrolledDate.getMonth()
      );
      if (bucket) bucket.users += 1;
    });

    let cumulative = 0;
    return months.map(item => {
      cumulative += item.users;
      return { month: item.month, users: cumulative };
    });
  }, [activeEnrollments]);

  const courseCategoryData = React.useMemo(() => {
    const counts = new Map<string, number>();
    // Initialize all existing categories to 0 count
    categories.forEach((category) => {
      if (category.name) {
        counts.set(category.name, 0);
      }
    });

    courses.forEach((course) => {
      const categoryName =
        (typeof course.category === "string" && course.category) ||
        categories.find(category => category.id === course.category_id || category.id === Number(course.category))?.name ||
        "Uncategorized";
      counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
    });

    const total = courses.length || 1;
    return Array.from(counts.entries()).map(([name, count], index) => ({
      name,
      value: Math.round((count / total) * 100),
      count,
      color: COLORS[index % COLORS.length],
    }));
  }, [courses, categories]);

  const recentActivities = React.useMemo(() => {
    return [...enrollments]
      .sort((a, b) => new Date(b.updated_at || b.enrolled_at).getTime() - new Date(a.updated_at || a.enrolled_at).getTime())
      .slice(0, 5)
      .map((enrollment) => ({
        id: enrollment.id,
        user: enrollment.student_email,
        action: enrollment.status === "completed" ? "Completed course" : "Enrolled in",
        course: enrollment.course_title,
        time: new Date(enrollment.updated_at || enrollment.enrolled_at).toLocaleDateString(),
      }));
  }, [enrollments]);

  const stats = [
    {
      label: "Total Learners",
      value: isLoading ? "..." : learners.length.toLocaleString(),
      icon: Users,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Courses",
      value: courses.length.toLocaleString(),
      icon: BookOpen,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Items Completed",
      value: completedItems.toLocaleString(),
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "bg-orange-50 text-orange-600",
    },
  ];

  const LoadingBlock = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
  );

  return (
    <div className="max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              {isLoading ? (
                <>
                  <LoadingBlock className="h-9 w-24 mb-2" />
                  <LoadingBlock className="h-4 w-28" />
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Learner Growth</h3>
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading growth data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyEnrollmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Categories</h3>
          {isLoading ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
              Loading categories...
            </div>
          ) : courseCategoryData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-gray-500">No courses found</div>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="60%" height={280}>
                <PieChart>
                  <Pie data={courseCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {courseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {courseCategoryData.map((category) => (
                  <div key={category.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                      <span className="text-sm text-gray-700 truncate">{category.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{category.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500 text-center" colSpan={4}>
                    <Loader2 className="inline mr-2 h-5 w-5 animate-spin text-blue-600" />
                    Loading activity...
                  </td>
                </tr>
              ) : recentActivities.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500 text-center" colSpan={4}>No recent activity found</td>
                </tr>
              ) : (
                recentActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{activity.user}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{activity.action}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{activity.course}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{activity.time}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
