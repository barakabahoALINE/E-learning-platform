import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser, selectIsAuthenticated } from "../../features/auth/authSelectors";
import { hasAnyPermission } from "../../features/auth/permissions";
import {
  addInstitution as addRBACInstitution,
  assignRBACRole,
  createRBACRole,
  createRBACUser,
  deleteRBACRole,
  deleteRBACUser,
  fetchRBACData,
  removeRBACRole,
  updateRBACRole,
  updateRBACRolePermissions,
  updateRBACUser,
} from "../../features/rbac/rbacSlice";
import {
  selectRBACAuditLogs,
  selectRBACInstitutions,
  selectRBACLastFetched,
  selectRBACPermissions,
  selectRBACRoles,
  selectRBACStatus,
  selectRBACUsers,
} from "../../features/rbac/rbacSelectors";

export interface Learner {
  id: number;
  name: string;
  email: string;
  avatar: string;
  enrolledCourses: number;
  status: "active" | "inactive" | "suspended";
  lastLogin: string;
  coursesTaken?: string[];
  accountStatus?: string;
  institution?: string;
  createdAt?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  lastModified: string;
  isSystemRole: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
  institution: string;
  department?: string;
  roles: string[];
  role?: string;
  status: "active" | "inactive";
  lastLogin: string;
  createdAt: string;
  recentActivity: string[];
  permissions?: string[];
  isSuperuser?: boolean;
  roleHistory?: { role: string; action: "assigned" | "removed"; date: string; by: string }[];
  activationHistory?: { action: "activated" | "deactivated"; date: string; by: string }[];
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  details: string;
  ipAddress: string;
  status: "success" | "warning" | "critical";
  severity: "info" | "warning" | "critical";
  module?: string;
  metadata?: Record<string, string>;
}

export interface Institution {
  id: number;
  name: string;
  domain: string;
  status: "active" | "disabled";
  createdAt: string;
  userCount: number;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  instructor: string;
  category: string;
  status: "published" | "draft";
  enrolledStudents: number;
  lessons: Lesson[];
  finalAssessment: FinalAssessment;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface LessonQuiz {
  enabled: boolean;
  questions: QuizQuestion[];
}

export interface Lesson {
  id: number;
  title: string;
  type: "video" | "text" | "image";
  content: string;
  videoUrl?: string;
  imageUrl?: string;
  quiz: LessonQuiz;
}

export interface FinalAssessment {
  questions: QuizQuestion[];
}

interface DataContextType {
  adminProfile: {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  users: User[];
  roles: Role[];
  permissions: Permission[];
  auditLogs: AuditLog[];
  institutions: Institution[];
  updateAdminProfile: (updates: { firstName?: string; lastName?: string; email?: string; avatar?: string | null }) => void;
  addUser: (user: Omit<User, "id" | "createdAt">) => Promise<any>;
  updateUser: (id: number, updates: Partial<User>) => Promise<any>;
  deleteUser: (id: number) => Promise<any>;
  assignRole: (userId: number, roleName: string) => Promise<any>;
  removeRole: (userId: number, roleName: string) => Promise<any>;
  getUserById: (id: number) => User | undefined;
  addRole: (role: Omit<Role, "id" | "userCount" | "lastModified">) => Promise<any>;
  updateRole: (id: number, updates: Partial<Role>) => Promise<any>;
  deleteRole: (id: number) => Promise<any>;
  getRoleByName: (name: string) => Role | undefined;
  updateRolePermissions: (roleId: number, permissions: string[]) => Promise<any>;
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  hasPermission: (userId: number, permission: string) => boolean;
  getUserPermissions: (userId: number) => string[];
  addInstitution: (institution: Omit<Institution, "id" | "createdAt" | "userCount">) => Promise<any>;
  updateInstitution: (id: number, updates: Partial<Institution>) => void;
  learners: Learner[];
  getSuspendedLearners: () => Learner[];
  updateLearner: (id: number, updates: Partial<Learner>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialLearners: Learner[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    avatar: "SJ",
    enrolledCourses: 5,
    status: "active",
    lastLogin: "2 hours ago",
    coursesTaken: ["React Advanced Patterns", "JavaScript Mastery", "UI/UX Design Fundamentals"],
    accountStatus: "Active",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "m.chen@example.com",
    avatar: "MC",
    enrolledCourses: 3,
    status: "active",
    lastLogin: "1 day ago",
    coursesTaken: ["Python for Data Science", "Digital Marketing 101"],
    accountStatus: "Active",
  },
  {
    id: 3,
    name: "Emma Williams",
    email: "emma.w@example.com",
    avatar: "EW",
    enrolledCourses: 8,
    status: "active",
    lastLogin: "3 hours ago",
    coursesTaken: ["React Advanced Patterns", "Node.js Backend Development", "SQL Databases"],
    accountStatus: "Active",
  },
  {
    id: 4,
    name: "James Brown",
    email: "james.b@example.com",
    avatar: "JB",
    enrolledCourses: 2,
    status: "inactive",
    lastLogin: "2 weeks ago",
    coursesTaken: ["Business Analytics"],
    accountStatus: "Inactive",
  },
  {
    id: 5,
    name: "Olivia Davis",
    email: "olivia.d@example.com",
    avatar: "OD",
    enrolledCourses: 6,
    status: "active",
    lastLogin: "5 minutes ago",
    coursesTaken: ["React Advanced Patterns", "JavaScript Mastery", "CSS Grid & Flexbox"],
    accountStatus: "Active",
  },
  {
    id: 6,
    name: "William Garcia",
    email: "w.garcia@example.com",
    avatar: "WG",
    enrolledCourses: 4,
    status: "suspended",
    lastLogin: "1 month ago",
    coursesTaken: ["Python Basics", "Machine Learning 101"],
    accountStatus: "Suspended",
  },
  {
    id: 7,
    name: "Sophia Martinez",
    email: "sophia.m@example.com",
    avatar: "SM",
    enrolledCourses: 7,
    status: "active",
    lastLogin: "1 hour ago",
    coursesTaken: ["React Advanced Patterns", "Vue.js Essentials", "Angular Masterclass"],
    accountStatus: "Active",
  },
  {
    id: 8,
    name: "Liam Anderson",
    email: "liam.a@example.com",
    avatar: "LA",
    enrolledCourses: 3,
    status: "active",
    lastLogin: "Yesterday",
    coursesTaken: ["JavaScript Fundamentals", "HTML & CSS Basics"],
    accountStatus: "Active",
  },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const rbacUsers = useAppSelector(selectRBACUsers);
  const rbacRoles = useAppSelector(selectRBACRoles);
  const rbacPermissions = useAppSelector(selectRBACPermissions);
  const rbacInstitutions = useAppSelector(selectRBACInstitutions);
  const rbacAuditLogs = useAppSelector(selectRBACAuditLogs);
  const rbacStatus = useAppSelector(selectRBACStatus);
  const rbacLastFetched = useAppSelector(selectRBACLastFetched);

  const [adminProfile, setAdminProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  }>(() => {
    const saved = localStorage.getItem("adminProfile");
    return saved ? JSON.parse(saved) : {
      firstName: "Admin",
      lastName: "User",
      email: "admin@learnhub.com",
      avatar: null,
    };
  });

  const [learners, setLearners] = useState<Learner[]>(() => {
    const saved = localStorage.getItem("learners");
    return saved ? JSON.parse(saved) : initialLearners;
  });

  useEffect(() => {
    localStorage.setItem("learners", JSON.stringify(learners));
  }, [learners]);

  const getSuspendedLearners = () => {
    return learners.filter(learner => learner.status === "suspended");
  };

  const updateLearner = (id: number, updates: Partial<Learner>) => {
    setLearners(prev => prev.map(learner => learner.id === id ? { ...learner, ...updates } : learner));
  };

  // Persist admin profile to localStorage
  useEffect(() => {
    localStorage.setItem("adminProfile", JSON.stringify(adminProfile));
  }, [adminProfile]);

  const canLoadRBAC = hasAnyPermission(currentUser, [
    "users_app.view_user",
    "auth.view_group",
    "auth.view_permission",
    "users_app.modify_permission",
  ]);

  useEffect(() => {
    if (!isAuthenticated || !canLoadRBAC) return;
    if (rbacStatus === "idle" || !rbacLastFetched) {
      void dispatch(fetchRBACData());
    }
  }, [canLoadRBAC, dispatch, isAuthenticated, rbacLastFetched, rbacStatus, currentUser]);

  const updateAdminProfile = (updates: { firstName?: string; lastName?: string; email?: string; avatar?: string | null }) => {
    setAdminProfile(prev => ({ ...prev, ...updates }));
  };

  // Audit Log Management
  const addAuditLog = (_log: Omit<AuditLog, "id" | "timestamp">) => {
    // Audit logs are managed through Redux RBAC actions and persisted centrally in the RBAC slice.
  };

  const updateInstitution = (_id: number, _updates: Partial<Institution>) => {
    // Institution updates are not managed through DataContext at the moment.
  };

  const contextUsers = rbacUsers.filter((u: User) => u.id !== currentUser?.id);
  const contextRoles = rbacRoles;
  const contextPermissions = rbacPermissions;
  const contextAuditLogs = rbacAuditLogs;
  const contextInstitutions = rbacInstitutions;

  const addUserFromRBAC = (user: Omit<User, "id" | "createdAt">) => {
    return dispatch(
      createRBACUser({
        name: user.name,
        email: user.email,
        institution: user.institution,
        department: user.department,
        role: user.roles[0],
      }),
    ).unwrap();
  };

  const updateUserFromRBAC = (id: number, updates: Partial<User>) => {
    return dispatch(updateRBACUser({ id, updates })).unwrap();
  };

  const deleteUserFromRBAC = (id: number) => {
    return dispatch(deleteRBACUser(id)).unwrap();
  };

  const assignRoleFromRBAC = (userId: number, roleName: string) => {
    return dispatch(assignRBACRole({ userId, roleName })).unwrap();
  };

  const removeRoleFromRBAC = (userId: number, roleName: string) => {
    return dispatch(removeRBACRole({ userId, roleName })).unwrap();
  };

  const getUserByIdFromRBAC = (id: number) => {
    return contextUsers.find((user: User) => user.id === id);
  };

  const addRoleFromRBAC = (role: Omit<Role, "id" | "userCount" | "lastModified">) => {
    return dispatch(createRBACRole({ name: role.name, description: role.description, permissions: role.permissions })).unwrap();
  };

  const updateRoleFromRBAC = (id: number, updates: Partial<Role>) => {
    return dispatch(updateRBACRole({ id, updates })).unwrap();
  };

  const deleteRoleFromRBAC = (id: number) => {
    return dispatch(deleteRBACRole(id)).unwrap();
  };

  const getRoleByNameFromRBAC = (name: string) => {
    return contextRoles.find((role: Role) => role.name === name);
  };

  const updateRolePermissionsFromRBAC = (roleId: number, rolePermissions: string[]) => {
    return dispatch(updateRBACRolePermissions({ roleId, permissions: rolePermissions })).unwrap();
  };

  const getUserPermissionsFromRBAC = (userId: number): string[] => {
    const user = contextUsers.find((item: User) => item.id === userId);
    if (!user) return [];
    if (user.permissions?.length) return user.permissions;

    const userPermissions = new Set<string>();
    user.roles.forEach((roleName: string) => {
      const role = contextRoles.find((item: Role) => item.name === roleName);
      role?.permissions.forEach((permission: string) => userPermissions.add(permission));
    });

    return Array.from(userPermissions);
  };

  const hasPermissionFromRBAC = (userId: number, permission: string): boolean => {
    return getUserPermissionsFromRBAC(userId).includes(permission);
  };

  const addInstitutionFromRBAC = (institution: Omit<Institution, "id" | "createdAt" | "userCount">) => {
    dispatch(addRBACInstitution(institution));
    return Promise.resolve();
  };

  return (
    <DataContext.Provider value={{
      adminProfile,
      users: contextUsers,
      roles: contextRoles,
      permissions: contextPermissions,
      auditLogs: contextAuditLogs,
      institutions: contextInstitutions,
      updateAdminProfile,
      addUser: addUserFromRBAC,
      updateUser: updateUserFromRBAC,
      deleteUser: deleteUserFromRBAC,
      assignRole: assignRoleFromRBAC,
      removeRole: removeRoleFromRBAC,
      getUserById: getUserByIdFromRBAC,
      addRole: addRoleFromRBAC,
      updateRole: updateRoleFromRBAC,
      deleteRole: deleteRoleFromRBAC,
      getRoleByName: getRoleByNameFromRBAC,
      updateRolePermissions: updateRolePermissionsFromRBAC,
      addAuditLog,
      hasPermission: hasPermissionFromRBAC,
      getUserPermissions: getUserPermissionsFromRBAC,
      addInstitution: addInstitutionFromRBAC,
      updateInstitution,
      learners,
      getSuspendedLearners,
      updateLearner,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
