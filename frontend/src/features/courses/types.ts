export interface Level {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  level: number;
}

export interface ContentBlock {
  id: string | number;
  type: 'text' | 'video' | 'image' | 'quiz' | 'note' | 'file';
  title?: string;
  content: string;
  quiz?: any;
  settings?: {
    caption?: string;
  };
}

export interface QuizQuestion {
  id: number | string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface FinalAssessment {
  questions: QuizQuestion[];
}

export interface Course {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  price: string;
  is_published: boolean;
  is_preview: boolean;
  level: number | null;
  category: number | null;
  admin: string;
  instructor?: string;
  level_name?: string;
  category_name?: string;
  enrolledStudents?: number;
  enrolled_students_count?: number;
  lessons?: Lesson[];
  lessons_count?: number;
  finalAssessment?: FinalAssessment;
  final_assessment?: FinalAssessment;
  created_at: string;
  updated_at: string;
}

export interface LessonCreateData {
  title: string;
  order: number;
}

export interface Lesson extends LessonCreateData {
  id: number;
  course: number;
  contents?: any[];
  blocks?: ContentBlock[];
  quiz?: {
    enabled: boolean;
    questions: QuizQuestion[];
  };
}

export interface CourseCreateData {
  title: string;
  description: string;
  duration: string;
  price: number;
  level?: number;
  category?: number;
  thumbnail?: File | string | null;
}

export interface CourseUpdateData extends Partial<CourseCreateData> {
  is_published?: boolean;
  lessons?: Lesson[];
  finalAssessment?: FinalAssessment;
  final_assessment?: FinalAssessment;
}
