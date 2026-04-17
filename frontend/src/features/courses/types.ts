export interface Level {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  level: number;
}

export interface LessonContent {
  id?: number;
  title: string;
  content_type: 'note' | 'video' | 'image' | 'file' | 'quiz';
  description?: string;
  video_url?: string;
  note_text?: string;
  file?: string | File | null;
  quiz?: any;
  order: number;
  is_preview?: boolean;
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
  rating?: number;
  final_assessment?: FinalAssessment;
  created_at: string;
  updated_at: string;
}

export interface LessonCreateData {
  title: string;
  order: number;
  contents?: LessonContentCreateUpdateData[];
}

export interface Lesson extends LessonCreateData {
  id: number;
  course: number;
  contents?: LessonContent[];
  blocks?: ContentBlock[];
  quiz?: {
    enabled: boolean;
    questions: QuizQuestion[];
  };
}

export interface LessonUpdateData extends Partial<LessonCreateData> {
  course_id?: number;
  contents?: LessonContentCreateUpdateData[];
}

export interface LessonContentCreateUpdateData {
  title?: string;
  content_type?: 'note' | 'video' | 'image' | 'file' | 'quiz';
  description?: string;
  video_url?: string;
  note_text?: string;
  file?: string | File | null;
  quiz?: any;
  order?: number;
  is_preview?: boolean;
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
  lesson_ids?: number[];
  finalAssessment?: FinalAssessment;
  final_assessment?: FinalAssessment;
}

export interface Enrollment {
  id: number;
  course: number;
  course_title: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolled_at: string;
}

export interface ContentProgress {
  id: number;
  student: number;
  content: number;
  enrollment: number;
  completed: boolean;
  completed_at: string | null;
}

export interface LessonProgress {
  id: number;
  student: number;
  lesson: number;
  enrollment: number;
  completed: boolean;
  completed_at: string | null;
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
