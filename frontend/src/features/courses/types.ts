export interface Level {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  level: number;
}

export type ContentType = "text" | "video" | "image" | "file";

export interface ContentBlock {
  id: string | number;
  type: ContentType;
  content: string;
}

export interface ContentItem {
  id: string | number;
  title: string;
  order: number;
  contents?: ContentBlock[];
  has_unpublished_changes?: boolean;
  pending_delete?: boolean;
}

export interface Section {
  id: string | number;
  title: string;
  order: number;
  contents: ContentItem[];
  has_unpublished_changes?: boolean;
  pending_delete?: boolean;
}

export interface QuizQuestion {
  id: number | string;
  question: string;
  question_text?: string;
  question_type?: string;
  marks?: number;
  options: string[];
  choices?: any[];
  correctAnswer: number;
}

export interface Quiz {
  id: string | number;
  title: string;
  questions: QuizQuestion[];
}

export interface Module {
  id: string | number;
  title: string;
  order: number;
  sections: Section[];
  quiz?: Quiz;
  quizEnabled?: boolean;
  has_unpublished_changes?: boolean;
  pending_delete?: boolean;
}

export interface Course {
  id: string | number;
  title: string;
  description: string;
  category: string | number;
  level: string | number;
  price: number;
  duration: number;
  thumbnail: string;
  enrolled_students_count?: number;
  admin?: string;
  instructor?: string;
  is_published?: boolean;
  modules_count?: number;
  status: "draft" | "published";
  modules: Module[];
  final_assessment?: Quiz;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  has_unpublished_changes?: boolean;
  pending_delete?: boolean;
}

export interface CourseCreateData {
  title: string;
  description: string;
  duration: string | number;
  price: number;
  level?: number | string;
  category?: number | string;
  thumbnail?: File | string | null;
}

export interface CourseUpdateData extends Partial<CourseCreateData> {
  status?: "draft" | "published";
  is_published?: boolean;
  modules?: Module[];
  final_assessment?: Quiz;
}

export interface Enrollment {
  id: number;
  course: number;
  course_title: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolled_at: string;
}

export interface CourseProgress {
  course_id: number;
  total_lessons: number;
  completed_lessons: number;
  completion_percentage: number;
}

export interface LearningHoursKPI {
  total_hours_learned: number;
  total_minutes_learned: number;
  completed_sessions_minutes: number;
  active_sessions_minutes: number;
  active_sessions_count: number;
}

export interface LessonContentProgress {
  content_id: number;
  content_title: string;
  completed: boolean;
  completed_at: string | null;
}

export interface LessonProgress {
  lesson_id: number;
  lesson_title: string;
  order: number;
  total_contents: number;
  completed_contents: number;
  completed_content_ids?: number[];
  progress_percentage: number;
  lesson_completed: boolean;
  completed_at: string | null;
}

export interface CoursesKPI {
  total_courses_enrolled: number;
  courses_in_progress: number;
  courses_completed: number;
}
