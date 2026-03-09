import { useState } from "react";
import { Plus, MoreVertical, Search, Trash2, Edit, Eye } from "lucide-react";
import { AddLearnerModal } from "../components/learners/AddLearnerModal";
import { ViewLearnerModal } from "../components/learners/ViewLearnerModal";
import { EditLearnerModal } from "../components/learners/EditLearnerModal";
import { useData } from "../context/DataContext";

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

export function LearnersPage() {
  const { learners, addLearner, updateLearner, deleteLearner } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [viewLearnerId, setViewLearnerId] = useState<number | null>(null);
  const [editLearnerId, setEditLearnerId] = useState<number | null>(null);

  const filteredLearners = learners.filter(
    (learner) =>
      learner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddLearner = (newLearnerData: {
    name: string;
    email: string;
    enrolledCourses: number;
    status: string;
  }) => {
    addLearner({
      name: newLearnerData.name,
      email: newLearnerData.email,
      avatar: newLearnerData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
      enrolledCourses: 0,
      status: "active",
      lastLogin: "Just now",
      coursesTaken: [],
      accountStatus: "Active",
    });
  };

  const handleDelete = (id: number) => {
    deleteLearner(id);
    setDeleteConfirm(null);
    setOpenMenuId(null);
  };

  const handleSuspend = (id: number) => {
    const learner = learners.find(l => l.id === id);
    if (learner) {
      updateLearner(id, {
        status: learner.status === "suspended" ? "active" : "suspended",
        accountStatus: learner.status === "suspended" ? "Active" : "Suspended",
      });
    }
    setOpenMenuId(null);
  };

  const handleUpdateLearner = (id: number, updates: any) => {
    updateLearner(id, updates);
    setEditLearnerId(null);
  };

  const viewLearner = learners.find(l => l.id === viewLearnerId);
  const editLearner = learners.find(l => l.id === editLearnerId);

  return (
    <div className="max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Learners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and monitor all learners
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Learner
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Learner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Courses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {filteredLearners.map((learner) => {
                const statusStyle = statusConfig[learner.status as keyof typeof statusConfig];
                return (
                  <tr key={learner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-sm">
                          {learner.avatar}
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {learner.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{learner.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {learner.enrolledCourses}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${statusStyle.className}`}
                      >
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{learner.lastLogin}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setOpenMenuId(openMenuId === learner.id ? null : learner.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        {openMenuId === learner.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setViewLearnerId(learner.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                setEditLearnerId(learner.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleSuspend(learner.id)}
                              className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              {learner.status === "suspended" ? "Activate" : "Suspend"}
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={() => {
                                setDeleteConfirm(learner.id);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal with blurred background */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Learner
                </h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this learner? This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <AddLearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLearner}
      />

      <ViewLearnerModal
        isOpen={viewLearnerId !== null}
        onClose={() => setViewLearnerId(null)}
        learner={viewLearner || null}
      />

      <EditLearnerModal
        isOpen={editLearnerId !== null}
        onClose={() => setEditLearnerId(null)}
        learner={editLearner || null}
        onSave={handleUpdateLearner}
      />
    </div>
  );
}
