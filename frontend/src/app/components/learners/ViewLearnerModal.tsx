import { X, Mail, BookOpen, Calendar, Shield } from "lucide-react";
import { Learner } from "../../context/DataContext";

interface ViewLearnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  learner: Learner | null;
}

export function ViewLearnerModal({ isOpen, onClose, learner }: ViewLearnerModalProps) {
  if (!isOpen || !learner) return null;

  const statusConfig = {
    active: {
      label: "Active",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    inactive: {
      label: "Inactive",
      className: "bg-gray-50 text-gray-700 border-gray-200",
    },
    suspended: {
      label: "Suspended",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const statusStyle = statusConfig[learner.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Learner Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-2xl">
              {learner.avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-gray-900">{learner.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-sm text-gray-600">{learner.email}</p>
              </div>
              <div className="mt-3">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusStyle.className}`}>
                  {statusStyle.label}
                </span>
              </div>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <BookOpen className="w-4 h-4" />
                <p className="text-xs font-medium uppercase">Enrolled Courses</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{learner.enrolledCourses}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Calendar className="w-4 h-4" />
                <p className="text-xs font-medium uppercase">Last Login</p>
              </div>
              <p className="text-sm font-medium text-gray-900">{learner.lastLogin}</p>
            </div>
          </div>

          {/* Courses Taken */}
          {learner.coursesTaken && learner.coursesTaken.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Courses Enrolled</h4>
              <div className="space-y-2">
                {learner.coursesTaken.map((course, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <p className="text-sm text-gray-700">{course}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h4 className="text-sm font-medium text-blue-900">Account Status</h4>
            </div>
            <p className="text-sm text-blue-800">
              {learner.accountStatus || statusStyle.label}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
