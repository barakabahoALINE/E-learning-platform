import { useData } from "../context/DataContext";
import { Card } from "../components/ui/card";
import { Users, Shield, Key, Activity, UserCheck, UserX, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectRBACLoading } from "../../features/rbac/rbacSelectors";

export function RBACDashboardPage() {
  const { users, roles, permissions, auditLogs } = useData();

  const rbacLoading = useAppSelector(selectRBACLoading);
  const activeUsers = users.filter(u => u.status === "active").length;
  const inactiveUsers = users.filter(u => u.status === "inactive").length;
  const recentLogs = auditLogs.slice(0, 5);
  const criticalEvents = auditLogs.filter(log => log.severity === "critical").length;

  const roleDistribution = roles.map(role => ({
    name: role.name,
    count: role.userCount,
    color: role.name === "Super User" ? "bg-purple-500" :
      role.name === "Admin" ? "bg-blue-500" :
        role.name === "Instructor" ? "bg-green-500" :
          role.name === "Student" ? "bg-orange-500" : "bg-gray-500"
  }));

  const totalUserCount = roleDistribution.reduce((sum, role) => sum + role.count, 0);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="text-xs">Critical</Badge>;
      case "warning":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Warning</Badge>;
      default:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">Info</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Security Overview</h1>
        <p className="text-gray-600 mt-1">Monitor and manage platform access controls</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : users.length}</p>
              <p className="text-sm text-gray-500 mt-1">{rbacLoading ? 'Loading…' : `${activeUsers} active`}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : activeUsers}</p>
              <p className="text-sm text-green-600 mt-1">
                {rbacLoading ? 'Loading…' : `${Math.round((activeUsers / users.length) * 100)}% of total`}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Roles</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : roles.length}</p>
              <p className="text-sm text-gray-500 mt-1">{rbacLoading ? 'Loading…' : `${roles.filter(r => r.isSystemRole).length} system roles`}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Permissions</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : permissions.length}</p>
              <p className="text-sm text-gray-500 mt-1">{rbacLoading ? 'Loading…' : `Across ${[...new Set(permissions.map((p) => p.module))].length} modules`}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Key className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Security Health</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">Active Users</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{activeUsers}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">Inactive Users</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{inactiveUsers}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-gray-700">Critical Events (24h)</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{criticalEvents}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-700">Recent Activities</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{auditLogs.length}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h2>
          <div className="space-y-4">
            {roleDistribution.map((role) => {
              const percentage = totalUserCount > 0 ? (role.count / totalUserCount) * 100 : 0;
              return (
                <div key={role.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">{role.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{role.count} users</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${role.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h2>
        <div className="space-y-3">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{log.actor}</span>
                  <span className="text-sm text-gray-600">{log.action}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Target: <span className="font-medium">{log.target}</span> • {log.details}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(log.timestamp).toLocaleString()} • {log.ipAddress}
                </p>
              </div>
              <div>
                {getSeverityBadge(log.severity)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Role Changes</h2>
          <div className="space-y-3">
            {auditLogs
              .filter(log => log.action.includes("role") || log.action.includes("Role"))
              .slice(0, 5)
              .map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.details}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Permission Changes</h2>
          <div className="space-y-3">
            {auditLogs
              .filter(log => log.action.includes("permission") || log.action.includes("Permission"))
              .slice(0, 5)
              .map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2">
                  <Key className="w-4 h-4 text-orange-600 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.details}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
