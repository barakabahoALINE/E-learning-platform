import { TrendingUp, Users, Clock, Award } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const coursePerformanceData = [
  { course: "React", enrolled: 342, completed: 287 },
  { course: "Design", enrolled: 256, completed: 198 },
  { course: "JavaScript", enrolled: 512, completed: 401 },
  { course: "Marketing", enrolled: 198, completed: 156 },
  { course: "Python", enrolled: 423, completed: 356 },
  { course: "Business", enrolled: 167, completed: 142 },
];

const engagementData = [
  { week: "Week 1", activeUsers: 1850, completions: 234 },
  { week: "Week 2", activeUsers: 1920, completions: 267 },
  { week: "Week 3", activeUsers: 2050, completions: 289 },
  { week: "Week 4", activeUsers: 2180, completions: 312 },
  { week: "Week 5", activeUsers: 2340, completions: 345 },
  { week: "Week 6", activeUsers: 2543, completions: 378 },
];

const topLearners = [
  {
    id: 1,
    name: "Sarah Johnson",
    coursesCompleted: 12,
    avgScore: 96,
    totalHours: 124,
  },
  {
    id: 2,
    name: "Michael Chen",
    coursesCompleted: 10,
    avgScore: 94,
    totalHours: 98,
  },
  {
    id: 3,
    name: "Emma Williams",
    coursesCompleted: 9,
    avgScore: 93,
    totalHours: 87,
  },
  {
    id: 4,
    name: "James Brown",
    coursesCompleted: 8,
    avgScore: 91,
    totalHours: 76,
  },
  {
    id: 5,
    name: "Olivia Davis",
    coursesCompleted: 8,
    avgScore: 90,
    totalHours: 82,
  },
];

const stats = [
  {
    label: "Active Learners",
    value: "2,543",
    change: "+12.3%",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    label: "Avg. Completion Rate",
    value: "78.4%",
    change: "+5.2%",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    label: "Total Learning Hours",
    value: "18,542",
    change: "+18.7%",
    icon: Clock,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    label: "Certificates Issued",
    value: "1,234",
    change: "+23.1%",
    icon: Award,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

export function AnalyticsPage() {
  return (
    <div className="max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Analytics</h1>

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
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stat.change}
                </span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Course Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={coursePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="course" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Bar dataKey="enrolled" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-sm text-gray-600">Enrolled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Engagement Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="week" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="activeUsers"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={{ fill: "#8B5CF6", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="completions"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: "#F59E0B", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded"></div>
              <span className="text-sm text-gray-600">Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-600 rounded"></div>
              <span className="text-sm text-gray-600">Completions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Learners and Completion Rate */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Most Active Learners</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Learner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courses Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topLearners.map((learner, index) => (
                  <tr key={learner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-full font-medium text-sm">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {learner.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {learner.coursesCompleted}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {learner.avgScore}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{learner.totalHours}h</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Completion Rate
          </h3>
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#E5E7EB"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#3B82F6"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 80 * 0.784} ${2 * Math.PI * 80}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-gray-900">78.4%</div>
                <div className="text-sm text-gray-500">Overall Rate</div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Courses Completed</span>
                <span className="font-medium text-gray-900">1,234</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: "78.4%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">In Progress</span>
                <span className="font-medium text-gray-900">345</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: "21.6%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
