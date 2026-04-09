import { Users, BookOpen, CheckCircle, TrendingUp } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stats = [
  {
    label: "Total Learners",
    value: "2,543",
    icon: Users,
    color: "bg-blue-50 text-blue-600",
  },
  {
    label: "Total Courses",
    value: "48",
    icon: BookOpen,
    color: "bg-purple-50 text-purple-600",
  },
  {
    label: "Lessons Completed",
    value: "12,847",
    icon: CheckCircle,
    color: "bg-green-50 text-green-600",
  },
  {
    label: "Completion Rate",
    value: "78.4%",
    icon: TrendingUp,
    color: "bg-orange-50 text-orange-600",
  },
];

const userGrowthData = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1450 },
  { month: "Mar", users: 1680 },
  { month: "Apr", users: 1920 },
  { month: "May", users: 2180 },
  { month: "Jun", users: 2543 },
];

const courseCategoryData = [
  { name: "Programming", value: 35, color: "#3B82F6" },
  { name: "Design", value: 25, color: "#8B5CF6" },
  { name: "Business", value: 20, color: "#10B981" },
  { name: "Marketing", value: 15, color: "#F59E0B" },
  { name: "Other", value: 5, color: "#6B7280" },
];

const recentActivities = [
  {
    id: 1,
    user: "Sarah Johnson",
    action: "Completed course",
    course: "React Advanced Patterns",
    time: "2 minutes ago",
  },
  {
    id: 2,
    user: "Michael Chen",
    action: "Started lesson",
    course: "UI/UX Design Fundamentals",
    time: "15 minutes ago",
  },
  {
    id: 3,
    user: "Emma Williams",
    action: "Achieved certificate",
    course: "JavaScript Mastery",
    time: "1 hour ago",
  },
  {
    id: 4,
    user: "James Brown",
    action: "Enrolled in",
    course: "Digital Marketing 101",
    time: "2 hours ago",
  },
  {
    id: 5,
    user: "Olivia Davis",
    action: "Completed quiz",
    course: "Python for Data Science",
    time: "3 hours ago",
  },
];

export function DashboardPage() {
  return (
    <div className="max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard Overview</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">User Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Course Categories</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={280}>
              <PieChart>
                <Pie
                  data={courseCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {courseCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {courseCategoryData.map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {category.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentActivities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {activity.user}
                    </div>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
