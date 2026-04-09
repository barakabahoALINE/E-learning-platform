import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Settings,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Users, label: "Learners", path: "/admin/learners" },
  { icon: BookOpen, label: "Courses", path: "/admin/courses" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Shield, label: "Security", path: "/admin/security" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-[240px] bg-white border-r border-gray-200 transition-all duration-300 z-50">
      <div className="p-4 md:p-6 flex justify-center md:justify-start">
        <h1 className="text-xl font-bold text-blue-600 md:text-gray-900">
          <span className="md:hidden">LH</span>
          <span className="hidden md:inline">LearnHub Admin</span>
        </h1>
      </div>

      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                ${
                  isActive
                    ? "bg-gray-50 text-blue-600"
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
      </nav>
    </aside>
  );
}
