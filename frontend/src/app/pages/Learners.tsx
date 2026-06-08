import { useEffect, useMemo, useState } from "react";
import { Loader2, MoreVertical, Search, Trash2, Edit, Eye, Mail, BookOpen, Shield, Plus, AlertTriangle } from "lucide-react";
import api from "../../services/api";
import { toast } from "sonner";
import { AddLearnerModal } from "../components/learners/AddLearnerModal";
import { EditLearnerModal } from "../components/learners/EditLearnerModal";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectRBACUsers } from "../../features/rbac/rbacSelectors";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { hasPermission } from "../../features/auth/permissions";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type LearnerStatus = "active" | "inactive";

interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  institution?: string;
  role?: string;
  is_verified?: boolean;
  is_active?: boolean;
  status?: string;
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
  const rbacUsers = useAppSelector(selectRBACUsers);
  const currentUser = useAppSelector(selectCurrentUser);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewLearnerId, setViewLearnerId] = useState<number | null>(null);
  const [editLearnerId, setEditLearnerId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Instructor sees only students enrolled in their own courses.
  const isInstructor = currentUser?.role === 'instructor' || currentUser?.groups?.includes('Instructor');
  const canAddLearner = hasPermission(currentUser, 'users_app.add_user');
  const canManageLearner = hasPermission(currentUser, 'users_app.change_user');
  const canDeleteLearner = hasPermission(currentUser, 'users_app.delete_user');

  const loadLearners = async () => {
    setIsLoading(true);
    try {
      if (isInstructor) {
        // Fetch only students enrolled in this instructor's courses.
        const enrollmentsRes = await api.get('instructor/course-enrollments/');
        const instructorEnrollments: any[] = enrollmentsRes.data.data || enrollmentsRes.data || [];

        const studentMap = new Map<number, ApiUser>();
        const normalizedEnrollments: ApiEnrollment[] = [];

        instructorEnrollments.forEach((e: any) => {
          const student = e.student;
          const studentId = typeof student === 'object' ? student.id : student;

          if (typeof student === 'object' && !studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              email: student.email || '',
              full_name: student.full_name || student.email || '',
              institution: student.institution || '',
              role: 'student',
              is_active: true,
              is_verified: true,
            });
          }

          const courseId = typeof e.course === 'object' ? e.course.id : e.course;
          const courseTitle = typeof e.course === 'object' ? e.course.title : String(e.course || '');

          normalizedEnrollments.push({
            id: e.id,
            student: studentId,
            student_email: typeof student === 'object' ? (student.email || '') : '',
            course: courseId,
            course_title: courseTitle,
            status: e.status,
            enrolled_at: e.enrolled_at,
          });
        });

        setUsers(Array.from(studentMap.values()));
        setEnrollments(normalizedEnrollments);
      } else {
        const [usersResponse, enrollmentsResponse] = await Promise.all([
          api.get("auth/users/"),
          api.get("enrollments/"),
        ]);

        const allUsers: ApiUser[] = usersResponse.data.data || usersResponse.data || [];
        setUsers(allUsers);
        setEnrollments(enrollmentsResponse.data.data || enrollmentsResponse.data || []);
      }
    } catch (error) {
      toast.error("Failed to load learners.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLearners();
  }, []);

  // Sync learners with updated RBAC users (when status changes in UsersManagement)
  useEffect(() => {
    if (rbacUsers && rbacUsers.length > 0) {
      setUsers(prev => {
        return prev.map(user => {
          const updated = rbacUsers.find((u: any) => u.id === user.id);
          if (updated) {
            return {
              ...user,
              is_active: updated.status === 'active',
              status: updated.status === 'active' ? 'active' : 'inactive',
            };
          }
          return user;
        });
      });
    }
  }, [rbacUsers]);

  const learners: LearnerRow[] = useMemo(() => {
    return users
      .filter((user) => String(user.role).toLowerCase() === "student")
      .map((user) => ({
        ...user,
        status: (user.status as LearnerStatus) || (user.is_active === false ? "inactive" : user.is_verified === false ? "inactive" : "active"),
        enrolledCourses: enrollments.filter((enrollment) => enrollment.student === user.id),
      }));
  }, [users, enrollments]);

  const filteredLearners = learners.filter(
    (learner) =>
      learner.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewLearner = learners.find(l => l.id === viewLearnerId) || null;
  const editLearner = learners.find(l => l.id === editLearnerId) || null;

  const mappedEditLearner = useMemo(() => {
    return editLearner ? {
      id: editLearner.id,
      name: editLearner.full_name,
      email: editLearner.email,
      avatar: getInitials(editLearner.full_name, editLearner.email),
      enrolledCourses: editLearner.enrolledCourses.length,
      status: editLearner.status as "active" | "inactive" | "suspended",
      lastLogin: "",
      institution: editLearner.institution,
    } : null;
  }, [editLearner]);

  const handleDelete = async (id: number) => {
    const learner = users.find(u => u.id === id);
    if (!learner) {
      toast.error("Learner not found.");
      return;
    }

    setIsSaving(true);
    try {
      await api.delete(`auth/users/${id}/delete/`);
      setUsers(prev => prev.filter(user => user.id !== id));
      toast.success("Learner deleted.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete learner.");
    } finally {
      setDeleteConfirm(null);
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

  const handleEditSave = async (id: number, updates: any) => {
    const learnerToUpdate = users.find(u => u.id === id);
    if (!learnerToUpdate) return;

    setIsSaving(true);
    try {
      const response = await api.patch(`auth/users/${id}/update/`, {
        full_name: updates.name,
        email: updates.email,
        institution: updates.institution || learnerToUpdate.institution || "",
        role: learnerToUpdate.role || "student",
        is_active: updates.status === "active",
      });
      const updated = response.data.data || response.data;
      setUsers(prev => prev.map(user => user.id === id ? { ...user, ...updated, is_verified: updates.status === "active" } : user));
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
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Learners</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor all learners</p>
        </div>
        {canAddLearner && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Learner
          </button>
        )}
      </div>

      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
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
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
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
                  <tr key={learner.id} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setViewLearnerId(learner.id)} className="gap-2 cursor-pointer">
                            <Eye className="w-4 h-4" /> View Details
                          </DropdownMenuItem>
                          {canManageLearner && (
                            <DropdownMenuItem onClick={() => setEditLearnerId(learner.id)} className="gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canManageLearner && (
                            <DropdownMenuItem onClick={() => handleToggleActive(learner)} className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600">
                              <Shield className="w-4 h-4" /> {learner.status === "active" ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          )}
                          {canDeleteLearner && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteConfirm(learner.id)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Learner
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this learner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button disabled={isSaving} variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              {isSaving ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewLearner !== null} onOpenChange={(open) => { if (!open) setViewLearnerId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Learner Details</DialogTitle>
          </DialogHeader>
          {viewLearner && (
            <div className="space-y-6 mt-4">
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
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
          )}
        </DialogContent>
      </Dialog>

      <EditLearnerModal
        isOpen={editLearnerId !== null}
        onClose={() => setEditLearnerId(null)}
        learner={mappedEditLearner}
        onSave={handleEditSave}
      />

      <AddLearnerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddLearner}
        isSaving={isSaving}
      />
    </div>
  );
}
