import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Course, mockUser, mockCourses, CourseFeedback } from '../data/mock-data';

interface AppContextType {
  user: User | null;
  isAuthenticated: boolean;
  courses: Course[];
  enrolledCourses: Course[];
  login: (email: string, password: string) => void;
  logout: () => void;
  signup: (name: string, email: string, password: string) => void;
  enrollInCourse: (courseId: string) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  completeLesson: (courseId: string, lessonId: string) => void;
  completeCourse: (courseId: string) => void;
  submitCourseFeedback: (courseId: string, feedback: CourseFeedback) => void;
  hasSubmittedFeedback: (courseId: string) => boolean;
  hasCompletedFinalAssessment: (courseId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [courses] = useState<Course[]>(mockCourses);

  const login = (email: string, password: string) => {
    // Mock login - in real app, this would call an API
    setUser(mockUser);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const signup = (name: string, email: string, password: string) => {
    // Mock signup - in real app, this would call an API
    const newUser: User = {
      ...mockUser,
      id: Date.now().toString(),
      name,
      email,
      enrolledCourses: [],
      completedCourses: [],
      achievements: [],
      completedLessons: [],
    };
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const enrollInCourse = (courseId: string) => {
    if (user) {
      setUser({
        ...user,
        enrolledCourses: [...user.enrolledCourses, courseId],
      });
    }
  };

  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const completeLesson = (courseId: string, lessonId: string) => {
    if (user) {
      // Check if lesson is already completed
      const isAlreadyCompleted = user.completedLessons.some(
        cl => cl.courseId === courseId && cl.lessonId === lessonId
      );

      if (!isAlreadyCompleted) {
        setUser({
          ...user,
          completedLessons: [...user.completedLessons, { courseId, lessonId }],
        });
      }
    }
  };

  const completeCourse = (courseId: string) => {
    if (user) {
      setUser({
        ...user,
        completedCourses: [...user.completedCourses, courseId],
        enrolledCourses: user.enrolledCourses.filter(id => id !== courseId),
      });
    }
  };

  const submitCourseFeedback = (courseId: string, feedback: CourseFeedback) => {
    if (user) {
      // Remove existing feedback for this course if any
      const updatedFeedback = user.courseFeedback.filter(
        (f: any) => String(f.courseId) !== String(courseId)
      );

      setUser({
        ...user,
        courseFeedback: [...updatedFeedback, { courseId, feedback }],
      });
    }
  };

  const hasSubmittedFeedback = (courseId: string): boolean => {
    return user?.courseFeedback.some((f: any) => String(f.courseId) === String(courseId)) || false;
  };

  const hasCompletedFinalAssessment = (courseId: string): boolean => {
    return user?.completedFinalAssessments?.includes(courseId) || false;
  };

  const enrolledCourses = courses.filter(course =>
    user?.enrolledCourses.includes(course.id)
  );

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        courses,
        enrolledCourses,
        login,
        logout,
        signup,
        enrollInCourse,
        updateUserProfile,
        completeLesson,
        completeCourse,
        submitCourseFeedback,
        hasSubmittedFeedback,
        hasCompletedFinalAssessment
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};