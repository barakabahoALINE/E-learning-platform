import { createContext, useContext, useState, ReactNode, useEffect } from "react";

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

export interface ContentBlock {
  id: string;
  type: "text" | "video" | "image";
  content: string; // text content, video URL, or image URL
  settings?: {
    caption?: string;
    aspectRatio?: string;
  };
}

export interface Lesson {
  id: number;
  title: string;
  blocks: ContentBlock[];
  quiz: LessonQuiz;
}

export interface FinalAssessment {
  questions: QuizQuestion[];
}

interface DataContextType {
  learners: Learner[];
  courses: Course[];
  adminProfile: {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  addLearner: (learner: Omit<Learner, "id">) => void;
  updateLearner: (id: number, updates: Partial<Learner>) => void;
  deleteLearner: (id: number) => void;
  getSuspendedLearners: () => Learner[];
  addCourse: (course: Omit<Course, "id" | "createdAt" | "updatedAt">) => number;
  updateCourse: (id: number, updates: Partial<Course>) => void;
  deleteCourse: (id: number) => void;
  getCourseById: (id: number) => Course | undefined;
  updateAdminProfile: (updates: { firstName?: string; lastName?: string; email?: string; avatar?: string | null }) => void;
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

const initialCourses: Course[] = [
  {
    id: 1,
    title: "React Advanced Patterns",
    description: "Master advanced React patterns and best practices for building scalable applications.",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
    instructor: "John Doe",
    category: "Web Development",
    status: "published",
    enrolledStudents: 234,
    lessons: [],
    finalAssessment: { questions: [] },
    createdAt: "2024-02-01",
    updatedAt: "2024-02-18",
  },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [learners, setLearners] = useState<Learner[]>(() => {
    const saved = localStorage.getItem("learners");
    return saved ? JSON.parse(saved) : initialLearners;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem("courses");
    return saved ? JSON.parse(saved) : initialCourses;
  });

  const [adminProfile, setAdminProfile] = useState(() => {
    const saved = localStorage.getItem("adminProfile");
    return saved ? JSON.parse(saved) : {
      firstName: "Admin",
      lastName: "User",
      email: "admin@learnhub.com",
      avatar: null,
    };
  });

  // Persist learners to localStorage
  useEffect(() => {
    localStorage.setItem("learners", JSON.stringify(learners));
  }, [learners]);

  // Persist courses to localStorage
  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses));
  }, [courses]);

  // Persist admin profile to localStorage
  useEffect(() => {
    localStorage.setItem("adminProfile", JSON.stringify(adminProfile));
  }, [adminProfile]);

  const addLearner = (learner: Omit<Learner, "id">) => {
    const newId = Math.max(...learners.map(l => l.id), 0) + 1;
    setLearners([{ ...learner, id: newId }, ...learners]);
  };

  const updateLearner = (id: number, updates: Partial<Learner>) => {
    setLearners(learners.map(learner => 
      learner.id === id ? { ...learner, ...updates } : learner
    ));
  };

  const deleteLearner = (id: number) => {
    setLearners(learners.filter(learner => learner.id !== id));
  };

  const getSuspendedLearners = () => {
    return learners.filter(learner => learner.status === "suspended");
  };

  const addCourse = (course: Omit<Course, "id" | "createdAt" | "updatedAt">) => {
    const newId = Math.max(...courses.map(c => c.id), 0) + 1;
    const now = new Date().toISOString().split('T')[0];
    const newCourse = {
      ...course,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    setCourses([...courses, newCourse]);
    return newId;
  };

  const updateCourse = (id: number, updates: Partial<Course>) => {
    setCourses(courses.map(course => 
      course.id === id ? { ...course, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : course
    ));
  };

  const deleteCourse = (id: number) => {
    setCourses(courses.filter(course => course.id !== id));
  };

  const getCourseById = (id: number) => {
    return courses.find(course => course.id === id);
  };

  const updateAdminProfile = (updates: { firstName?: string; lastName?: string; email?: string; avatar?: string | null }) => {
    setAdminProfile(prev => ({ ...prev, ...updates }));
  };

  return (
    <DataContext.Provider value={{
      learners,
      courses,
      adminProfile,
      addLearner,
      updateLearner,
      deleteLearner,
      getSuspendedLearners,
      addCourse,
      updateCourse,
      deleteCourse,
      getCourseById,
      updateAdminProfile,
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