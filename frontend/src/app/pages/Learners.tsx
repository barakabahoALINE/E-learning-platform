import { useEffect, useMemo, useState } from "react";
import { Loader2, MoreVertical, Search, Trash2, Edit, Eye, Mail, BookOpen, Shield, Plus } from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { AddLearnerModal } from "../components/learners/AddLearnerModal";

type LearnerStatus = "active" | "inactive";

interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  institution?: string;
  role?: string;
  is_verified?: boolean;
}

interface ApiEnrollment {
  id: number;
  student: number;
  student_email: string;
  course: number;
  course_title: string;
  status: string;
  enrolled_at: string;
  updated_at?: string;
}

interface LearnerRow extends ApiUser {
  status: LearnerStatus;
  enrolledCourses: ApiEnrollment[];
}

const statusConfig = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-50 text-gray-700 border-gray-200",
  },
};

const getInitials = (name: string, email: string) => {
  const source = name || email;
  return source
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export function LearnersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewLearnerId, setViewLearnerId] = useState<number | null>(null);
  const [editLearnerId, setEditLearnerId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstitution, setEditInstitution] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadLearners = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, enrollmentsResponse] = await Promise.all([
        api.get("auth/users/"),
        api.get("enrollments/"),
      ]);

      setUsers(usersResponse.data.data || usersResponse.data || []);
      setEnrollments(enrollmentsResponse.data.data || enrollmentsResponse.data || []);
    } catch (error) {
      toast.error("Failed to load learners.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLearners();
  }, []);

  const learners: LearnerRow[] = useMemo(() => {
    return users
      .filter(user => user.role !== "admin")
      .map(user => ({
        ...user,
        status: user.is_verified === false ? "inactive" : "active",
        enrolledCourses: enrollments.filter(enrollment => enrollment.student === user.id),
      }));
  }, [users, enrollments]);

  const filteredLearners = learners.filter(
    (learner) =>
      learner.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewLearner = learners.find(l => l.id === viewLearnerId) || null;
  const editLearner = learners.find(l => l.id === editLearnerId) || null;

  useEffect(() => {
    if (!editLearner) return;
    setEditName(editLearner.full_name);
    setEditInstitution(editLearner.institution || "");
    setEditIsActive(editLearner.status === "active");
  }, [editLearner]);

  const handleDelete = async (id: number) => {
    setIsSaving(true);
    try {
      await api.delete(`auth/users/${id}/delete/`);
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success("Learner deleted.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete learner.");
    } finally {
      setDeleteConfirm(null);
      setOpenMenuId(null);
      setIsSaving(false);
    }
  };

  const handleAddLearner = async (learner: {
    full_name: string;
    email: string;
    institution: string;
    password: string;
  }) => {
    setIsSaving(true);
    try {
      await api.post("auth/signup/", learner);
      toast.success("Learner added. They may need to verify their email before logging in.");
      setIsAddModalOpen(false);
      await loadLearners();
    } catch (error: any) {
      const detail = error.response?.data?.message || error.response?.data?.error || error.response?.data;
      toast.error(typeof detail === "string" ? detail : "Failed to add learner.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLearner = async () => {
    if (!editLearner) return;
    setIsSaving(true);
    try {
      const response = await api.patch(`auth/users/${editLearner.id}/update/`, {
        full_name: editName,
        institution: editInstitution,
        role: editLearner.role || "student",
        is_active: editIsActive,
      });
      const updated = response.data.data || response.data;
      setUsers(prev => prev.map(user => user.id === editLearner.id ? { ...user, ...updated, is_verified: editIsActive } : user));
      toast.success("Learner updated.");
      setEditLearnerId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update learner.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (learner: LearnerRow) => {
    setIsSaving(true);
    try {
      const nextIsActive = learner.status !== "active";
      const response = await api.patch(`auth/users/${learner.id}/update/`, {
        full_name: learner.full_name,
        institution: learner.institution || "",
        role: learner.role || "student",
        is_active: nextIsActive,
      });
      const updated = response.data.data || response.data;
      setUsers(prev => prev.map(user => user.id === learner.id ? { ...user, ...updated, is_verified: nextIsActive } : user));
      toast.success(nextIsActive ? "Learner activated." : "Learner deactivated.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update learner.");
    } finally {
      setOpenMenuId(null);
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Learners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all learners</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Learner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Courses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                    Loading learners...
                  </td>
                </tr>
              ) : filteredLearners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No learners found.</td>
                </tr>
              ) : filteredLearners.map((learner) => {
                const statusStyle = statusConfig[learner.status];
                return (
                  <tr key={learner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-sm">
                          {getInitials(learner.full_name, learner.email)}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{learner.full_name || "Unnamed learner"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">{learner.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{learner.enrolledCourses.length}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusStyle.className}`}>{statusStyle.label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{learner.institution || "Not provided"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative">
                        <button onClick={() => setOpenMenuId(openMenuId === learner.id ? null : learner.id)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        </button>
                        {openMenuId === learner.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button onClick={() => { setViewLearnerId(learner.id); setOpenMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <Eye className="w-4 h-4" /> View Details
                            </button>
                            <button onClick={() => { setEditLearnerId(learner.id); setOpenMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <Edit className="w-4 h-4" /> Edit
                            </button>
                            <button onClick={() => handleToggleActive(learner)} className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-gray-50">
                              {learner.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => { setDeleteConfirm(learner.id); setOpenMenuId(null); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
                              <Trash2 className="w-4 h-4" /> Delete
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

      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Delete Learner</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this learner? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isSaving} onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                {isSaving ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Learner Details</h2>
              <button onClick={() => setViewLearnerId(null)} className="text-gray-500 hover:text-gray-900">Close</button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium text-2xl">
                  {getInitials(viewLearner.full_name, viewLearner.email)}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-gray-900">{viewLearner.full_name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-sm text-gray-600">{viewLearner.email}</p>
                  </div>
                  <span className={`inline-flex mt-3 px-3 py-1 text-xs font-medium rounded-full border ${statusConfig[viewLearner.status].className}`}>
                    {statusConfig[viewLearner.status].label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <BookOpen className="w-4 h-4" />
                    <p className="text-xs font-medium uppercase">Enrolled Courses</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{viewLearner.enrolledCourses.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 mb-2">
                    <Shield className="w-4 h-4" />
                    <p className="text-xs font-medium uppercase">Verified</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{viewLearner.is_verified ? "Yes" : "No"}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Courses Enrolled</h4>
                <div className="space-y-2">
                  {viewLearner.enrolledCourses.length === 0 ? (
                    <p className="text-sm text-gray-500">No course enrollments found.</p>
                  ) : viewLearner.enrolledCourses.map(enrollment => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{enrollment.course_title}</p>
                      <span className="text-xs uppercase text-gray-500">{enrollment.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Learner</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                <input value={editInstitution} onChange={(e) => setEditInstitution(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                Active account
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setEditLearnerId(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button disabled={isSaving} onClick={handleUpdateLearner} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddLearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLearner}
        isSaving={isSaving}
      />
    </div>
  );
}
