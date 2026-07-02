import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Settings,
  UserCog,
  KeyRound,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useAppSelector } from "../../../hooks/reduxHooks";
import { selectCurrentUser } from "../../../features/auth/authSelectors";
import { hasPermission, hasAdminManagementAccess } from "../../../features/auth/permissions";
import Logo from '../../assets/R.png';

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Learners", path: "/admin/learners", permission: "users_app.view_user" },
  { icon: BookOpen, label: "Courses", path: "/admin/courses", permission: "courses_app.view_course" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics", permission: "users_app.view_analytics" },
  { icon: Shield, label: "Security", path: "/admin/security", permission: "users_app.view_user" },
  { icon: Settings, label: "Settings", path: "/admin/settings", permission: "users_app.change_platform_settings" },
];

const accessManagementItems = [
  { icon: Users, label: "Users", path: "/admin/rbac/users", permission: "users_app.view_user" },
  { icon: UserCog, label: "Roles", path: "/admin/rbac/roles", permission: "auth.view_group" },
  { icon: KeyRound, label: "Permissions", path: "/admin/rbac/permissions", permission: "auth.view_permission" },
  { icon: FileText, label: "Audit Logs", path: "/admin/rbac/audit-logs", permission: "users_app.view_user" },
];

export function Sidebar() {
  const location = useLocation();
  const user = useAppSelector(selectCurrentUser);
  const [isAccessExpanded, setIsAccessExpanded] = useState(true);
  const visibleNavItems = navItems.filter((item) => !item.permission || hasPermission(user, item.permission));
  const visibleAccessItems = accessManagementItems.filter((item) => hasPermission(user, item.permission));
  const canViewAccessManagement = hasAdminManagementAccess(user);

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-[240px] bg-white border-r border-gray-200 transition-all duration-300 z-50 overflow-y-auto">
      <div className="p-1 md:p-6 flex items-center space-x-2 bg-red- justify-center">
        <img src={Logo} alt="Logo" className="w-auto h-10" />
        <span className="hidden md:block text-xl font-bold bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] bg-clip-text text-transparent">
          LearnHub
        </span>
      </div>

      <nav className="px-3 space-y-1 pb-6">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                ${isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[15px] hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
                {item.label}
              </span>
            </Link>
          );
        })}

        {canViewAccessManagement && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            <Link
              to="/admin/rbac"
              className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
              ${location.pathname === "/admin/rbac"
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
                }
            `}
            >
              {location.pathname === "/admin/rbac" && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r" />
              )}
              <Shield className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
              <span className="text-[15px] hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
                Access Control Panel
              </span>
            </Link>

            {visibleAccessItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsAccessExpanded(!isAccessExpanded)}
                className="hidden md:flex w-full items-center justify-between px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors mt-2"
              >
                <span className="text-[14px] font-medium">Access Management</span>
                {isAccessExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}

            <div className={`${isAccessExpanded ? "md:block" : "md:hidden"} mt-1 md:ml-6 space-y-1`}>
              {visibleAccessItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[14px]
                    ${isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                      }
                  `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
                    <span className="hidden md:block whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
