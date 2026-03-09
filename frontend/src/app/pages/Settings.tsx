import { useState } from "react";
import { User, Bell, Lock, Mail, Globe, Palette, Upload, Check } from "lucide-react";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useData } from "../context/DataContext";

type SettingsTab = "profile" | "notifications" | "security" | "email" | "platform" | "appearance";

export function SettingsPage() {
  const user = useAppSelector(selectCurrentUser);
  const { adminProfile, updateAdminProfile } = useData();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [showSuccess, setShowSuccess] = useState(false);

  // Profile State
  const [profileData, setProfileData] = useState({
    firstName: adminProfile.firstName,
    lastName: adminProfile.lastName,
    email: adminProfile.email,
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState({
    platformName: "LearnHub",
    supportEmail: "support@learnhub.com",
    timezone: "UTC+0 (GMT)",
    enableEnrollment: true,
    certificateGeneration: true,
    emailNotifications: true,
  });

  // Notification Preferences State
  const [notificationPrefs, setNotificationPrefs] = useState({
    courseUpdates: true,
    learnerActivity: true,
    systemAlerts: true,
    weeklyReports: false,
    marketingEmails: false,
  });

  const handleSaveProfile = () => {
    // Update global admin profile
    updateAdminProfile({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdatePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      alert("Please fill in all password fields");
      return;
    }
    if (passwordData.new !== passwordData.confirm) {
      alert("New passwords do not match");
      return;
    }
    if (passwordData.new.length < 8) {
      alert("Password must be at least 8 characters long");
      return;
    }
    
    setShowSuccess(true);
    setPasswordData({ current: "", new: "", confirm: "" });
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSavePlatformSettings = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleSaveNotificationPrefs = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size must be less than 2MB");
        return;
      }
      // Create object URL for the uploaded file
      const reader = new FileReader();
      reader.onloadend = () => {
        const avatarUrl = reader.result as string;
        updateAdminProfile({ avatar: avatarUrl });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Profile Settings
            </h2>

            <div className="space-y-5">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-medium overflow-hidden">
                  {adminProfile.avatar ? (
                    <img src={adminProfile.avatar} alt="Admin Avatar" className="w-full h-full object-cover" />
                  ) : (
                    `${adminProfile.firstName[0]}${adminProfile.lastName[0]}`
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    Change Avatar
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG or GIF. Max size 2MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) =>
                    setProfileData({ ...profileData, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value="System Administrator"
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() =>
                    setProfileData({
                      firstName: user?.full_name?.split(" ")[0] || "Admin",
                      lastName: user?.full_name?.split(" ")[1] || "User",
                      email: user?.email || "admin@learnhub.com",
                    })
                  }
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Password & Security
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, current: e.target.value })
                  }
                  placeholder="Enter current password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new: e.target.value })
                  }
                  placeholder="Enter new password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirm: e.target.value })
                  }
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Password Requirements
                </h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() =>
                    setPasswordData({ current: "", new: "", confirm: "" })
                  }
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePassword}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Notification Preferences
            </h2>

            <div className="space-y-4">
              {[
                {
                  key: "courseUpdates" as const,
                  title: "Course Updates",
                  description: "Notifications about new courses and course changes",
                },
                {
                  key: "learnerActivity" as const,
                  title: "Learner Activity",
                  description: "Get notified when learners enroll or complete courses",
                },
                {
                  key: "systemAlerts" as const,
                  title: "System Alerts",
                  description: "Important system notifications and updates",
                },
                {
                  key: "weeklyReports" as const,
                  title: "Weekly Reports",
                  description: "Receive weekly analytics and performance reports",
                },
                {
                  key: "marketingEmails" as const,
                  title: "Marketing Emails",
                  description: "Tips, best practices, and feature announcements",
                },
              ].map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {pref.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {pref.description}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setNotificationPrefs({
                        ...notificationPrefs,
                        [pref.key]: !notificationPrefs[pref.key],
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notificationPrefs[pref.key] ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notificationPrefs[pref.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={handleSaveNotificationPrefs}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        );

      case "platform":
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Platform Settings
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={platformSettings.platformName}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      platformName: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Support Email
                </label>
                <input
                  type="email"
                  value={platformSettings.supportEmail}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      supportEmail: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={platformSettings.timezone}
                  onChange={(e) =>
                    setPlatformSettings({
                      ...platformSettings,
                      timezone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>UTC-8 (Pacific Time)</option>
                  <option>UTC-5 (Eastern Time)</option>
                  <option>UTC+0 (GMT)</option>
                  <option>UTC+1 (CET)</option>
                  <option>UTC+8 (Singapore)</option>
                </select>
              </div>

              <div className="space-y-3 pt-4">
                {[
                  {
                    key: "enableEnrollment" as const,
                    title: "Enable Course Enrollment",
                    description: "Allow learners to enroll in courses",
                  },
                  {
                    key: "certificateGeneration" as const,
                    title: "Certificate Generation",
                    description: "Auto-generate certificates on course completion",
                  },
                  {
                    key: "emailNotifications" as const,
                    title: "Email Notifications",
                    description: "Send email updates to learners",
                  },
                ].map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {setting.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {setting.description}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setPlatformSettings({
                          ...platformSettings,
                          [setting.key]: !platformSettings[setting.key],
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        platformSettings[setting.key]
                          ? "bg-blue-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          platformSettings[setting.key]
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() =>
                    setPlatformSettings({
                      platformName: "LearnHub",
                      supportEmail: "support@learnhub.com",
                      timezone: "UTC+0 (GMT)",
                      enableEnrollment: true,
                      certificateGeneration: true,
                      emailNotifications: true,
                    })
                  }
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlatformSettings}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Coming Soon
            </h2>
            <p className="text-sm text-gray-600">
              This feature is currently under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">
              Changes saved successfully!
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              Your settings have been updated.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 h-fit">
          {[
            { id: "profile" as const, icon: User, label: "Profile" },
            { id: "notifications" as const, icon: Bell, label: "Notifications" },
            { id: "security" as const, icon: Lock, label: "Security" },
            { id: "email" as const, icon: Mail, label: "Email" },
            { id: "platform" as const, icon: Globe, label: "Platform" },
            { id: "appearance" as const, icon: Palette, label: "Appearance" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="col-span-2">{renderTabContent()}</div>
      </div>
    </div>
  );
}