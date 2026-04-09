import { Bell, ChevronDown, User, Settings } from "lucide-react";
import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../hooks/reduxHooks";
import { selectCurrentUser } from "../../../features/auth/authSelectors";
import { logout } from "../../../features/auth/authSlice";
import { useData } from "../../context/DataContext";
import { useNavigate } from "react-router-dom";
import { NotificationPanel } from "../notifications/NotificationPanel";

interface Notification {
  id: number;
  type: "success" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: "success",
    title: "New Course Published",
    message: "React Advanced Patterns has been successfully published and is now available to learners.",
    time: "2 minutes ago",
    read: false,
  },
  {
    id: 2,
    type: "info",
    title: "New Learner Enrolled",
    message: "Sarah Johnson has enrolled in JavaScript Mastery course.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    type: "warning",
    title: "Course Review Pending",
    message: "Digital Marketing 101 is pending review before it can be published.",
    time: "3 hours ago",
    read: false,
  },
  {
    id: 4,
    type: "success",
    title: "Quiz Completed",
    message: "Michael Chen completed the React Quiz with a score of 95%.",
    time: "5 hours ago",
    read: true,
  },
  {
    id: 5,
    type: "info",
    title: "System Update",
    message: "Platform maintenance scheduled for tomorrow at 2:00 AM UTC.",
    time: "1 day ago",
    read: true,
  },
];

export function TopNav() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const user = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();
  const { adminProfile } = useData();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await dispatch(logout());
    setShowDropdown(false);
    navigate("/login");
  };

  const handleProfileSettings = () => {
    setShowDropdown(false);
    navigate("/settings");
  };

  const handleMarkAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleClearAll = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  // Close dropdowns when clicking outside
  const handleClickOutside = (e: React.MouseEvent) => {
    if (showDropdown) {
      setShowDropdown(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-16 md:left-[240px] right-0 h-16 md:h-[72px] bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-end shadow-sm z-50 transition-all duration-300">
        <div className="flex items-center gap-4">
          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
              className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                {adminProfile.avatar ? (
                  <img src={adminProfile.avatar} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  `${adminProfile.firstName[0]}${adminProfile.lastName[0]}`
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-gray-900">
                  {`${adminProfile.firstName} ${adminProfile.lastName}`}
                </div>
                <div className="text-xs text-gray-500">
                  {adminProfile.email}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    System Administrator
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleProfileSettings}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleProfileSettings}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                </div>

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onClearAll={handleClearAll}
      />

      {/* Backdrop for closing dropdowns and notifications */}
      {(showDropdown || showNotifications) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false);
            setShowNotifications(false);
          }}
        />
      )}
    </>
  );
}