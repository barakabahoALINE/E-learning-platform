export interface Level {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

export type ContentType = "text" | "video" | "image" | "file";

export interface ContentBlock {
  id: string | number;
  type: ContentType;
  content: string;
  link?: string;
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
  assessment_type?: "QUIZ" | "FINAL";
  pass_mark?: number;
  max_attempts?: number;
  duration?: number;
  descriptions?: string;
  instructions?: string;
  questions: QuizQuestion[];
  is_published?: boolean;
  has_unpublished_changes?: boolean;
  pending_delete?: boolean;
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
  category_id?: number;
  level: string | number;
  level_id?: number;
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
  skills?: string[];
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
  course_title?: string;
  total_lessons?: number;
  completed_lessons?: number;
  total_items?: number;
  completed_items?: number;
  total_modules?: number;
  completed_modules?: number;
  total_sections?: number;
  completed_sections?: number;
  has_final_assessment?: boolean;
  final_passed?: boolean;
  progress_percentage?: number;
  completion_percentage: number;
  course_completed?: boolean;
  completed_at?: string | null;
}

export interface ContentProgress {
  content_id: number;
  id?: number;
  title?: string;
  content_title?: string;
  content_type?: string;
  order?: number;
  completed: boolean;
  progress_percentage: number;
  completed_at?: string | null;
  is_new?: boolean;
}

export interface SectionProgress {
  section_id: number;
  section_title: string;
  module_id?: number;
  module_title?: string;
  order?: number;
  total_contents: number;
  completed_contents: number;
  progress_percentage: number;
  section_completed: boolean;
  completed_at?: string | null;
}

export interface ModuleProgress {
  module_id: number;
  module_title: string;
  order?: number;
  total_sections?: number;
  completed_sections?: number;
  total_contents?: number;
  completed_contents?: number;
  progress_percentage: number;
  module_completed?: boolean;
  quiz_passed?: boolean;
  completed_at?: string | null;
  sections?: ModuleContentsSectionProgress[];
}

export interface ModuleContentsSectionProgress {
  section_id: number;
  section_title: string;
  order: number;
  total_contents: number;
  contents: ContentProgress[];
}

export interface SectionContentsProgressResponse {
  status: string;
  section: {
    course_id: number;
    course_title: string;
    module_id: number;
    module_title: string;
    section_id: number;
    section_title: string;
  };
  summary: {
    total_contents: number;
    completed_contents: number;
    progress_percentage: number;
  };
  contents: ContentProgress[];
}

export interface CourseSectionsProgressResponse {
  status: string;
  course_id: number;
  summary: {
    total_sections: number;
    completed_sections: number;
    total_modules: number;
    completed_modules: number;
    has_final_assessment: boolean;
    final_passed: boolean;
    course_progress_percentage: number;
  };
  sections: SectionProgress[];
}

export interface CourseModulesProgressResponse {
  status: string;
  course_id: number;
  summary: {
    total_modules: number;
    completed_modules: number;
    has_final_assessment: boolean;
    final_passed: boolean;
    course_progress_percentage: number;
  };
  modules: ModuleProgress[];
}

export interface ModuleContentsProgressResponse {
  status: string;
  message: string;
  data: ModuleProgress & {
    order: number;
    total_contents: number;
    completed_contents: number;
    sections: ModuleContentsSectionProgress[];
  };
}

export interface CompleteContentResponse {
  status: string;
  message: string;
  content_progress: ContentProgress;
  section_progress: SectionProgress;
  module_progress: ModuleProgress;
  course_progress: CourseProgress;
}

export interface LearningHoursKPI {
  total_hours_learned: number;
  total_minutes_learned: number;
  completed_sessions_minutes: number;
  active_sessions_minutes: number;
  active_sessions_count: number;
}

export interface CoursesKPI {
  total_courses_enrolled: number;
  courses_in_progress: number;
  courses_completed: number;
}

export interface CompletionRateKPI {
  completion_rate: number;
  previous_completion_rate?: number;
  change_percentage?: number;
  month_over_month_change?: number;
}

export interface LearningActivityDay {
  day: string;
  hours: number;
  minutes: number;
  date: string;
}

export interface LearningActivityKPI {
  current_streak: number;
  weekly_activity: LearningActivityDay[];
  week_start: string;
  week_end: string;
}

export type LessonContentProgress = ContentProgress;
export type LessonProgress = SectionProgress;
