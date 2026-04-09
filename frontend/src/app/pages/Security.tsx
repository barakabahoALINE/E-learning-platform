import { Shield, AlertTriangle, Clock, Settings } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useData } from "../context/DataContext";

const loginActivity = [
  {
    id: 1,
    user: "Sarah Johnson",
    email: "sarah.j@example.com",
    ipAddress: "192.168.1.100",
    location: "New York, US",
    timestamp: "2024-02-19 14:32:10",
    status: "success",
  },
  {
    id: 2,
    user: "Michael Chen",
    email: "m.chen@example.com",
    ipAddress: "192.168.1.105",
    location: "San Francisco, US",
    timestamp: "2024-02-19 14:28:45",
    status: "success",
  },
  {
    id: 3,
    user: "Unknown",
    email: "test@example.com",
    ipAddress: "45.12.34.56",
    location: "Unknown",
    timestamp: "2024-02-19 14:15:22",
    status: "failed",
  },
  {
    id: 4,
    user: "Emma Williams",
    email: "emma.w@example.com",
    ipAddress: "192.168.1.112",
    location: "Seattle, US",
    timestamp: "2024-02-19 13:45:18",
    status: "success",
  },
  {
    id: 5,
    user: "Unknown",
    email: "admin@fake.com",
    ipAddress: "123.45.67.89",
    location: "Unknown",
    timestamp: "2024-02-19 13:32:55",
    status: "failed",
  },
];

const failedLoginData = [
  { day: "Mon", attempts: 3 },
  { day: "Tue", attempts: 5 },
  { day: "Wed", attempts: 2 },
  { day: "Thu", attempts: 8 },
  { day: "Fri", attempts: 4 },
  { day: "Sat", attempts: 1 },
  { day: "Sun", attempts: 2 },
];

export function SecurityPage() {
  const { getSuspendedLearners, updateLearner } = useData();
  const suspendedAccounts = getSuspendedLearners();

  const handleReactivate = (id: number) => {
    updateLearner(id, { status: "active" });
  };

  return (
    <div className="max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Security</h1>

      {/* Security Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-50">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">2,543</div>
          <div className="text-sm text-gray-500">Active Sessions</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-red-50">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">25</div>
          <div className="text-sm text-gray-500">Failed Login Attempts</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-orange-50">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{suspendedAccounts.length}</div>
          <div className="text-sm text-gray-500">Suspended Accounts</div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">30min</div>
          <div className="text-sm text-gray-500">Session Timeout</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Failed Login Chart */}
        <div className="col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Failed Login Attempts (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={failedLoginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="#EF4444"
                strokeWidth={2}
                dot={{ fill: "#EF4444", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Security Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout
              </label>
              <select defaultValue="30 minutes" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>15 minutes</option>
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Login Attempts
              </label>
              <select defaultValue="5 attempts" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>3 attempts</option>
                <option>5 attempts</option>
                <option>10 attempts</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                2FA Required
              </span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-700">
                Email Alerts
              </span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Login Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loginActivity.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {activity.user}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{activity.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{activity.ipAddress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{activity.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{activity.timestamp}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full border ${
                        activity.status === "success"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {activity.status === "success" ? "Success" : "Failed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspended Accounts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Suspended Accounts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Courses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suspendedAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No suspended accounts
                  </td>
                </tr>
              ) : (
                suspendedAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {account.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{account.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{account.enrolledCourses}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{account.lastLogin}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleReactivate(account.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Reactivate
                      </button>
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