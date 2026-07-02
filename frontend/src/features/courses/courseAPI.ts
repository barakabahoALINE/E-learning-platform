import api from '../../services/api';
import {
  Course,
  CourseCreateData,
  CourseUpdateData,
  Module,
  Section,
  ContentItem,
  Level,
  Category,
  Enrollment,
  CourseProgress,
  CompleteContentResponse,
  CourseModulesProgressResponse,
  CourseSectionsProgressResponse,
  LearningHoursKPI,
  LearningActivityKPI,
  ModuleContentsProgressResponse,
  ModuleProgress,
  CompletionRateKPI,
  CoursesKPI,
  SectionContentsProgressResponse,
  SectionProgress,
  LessonProgress,
  LessonContentProgress
} from './types';

const courseAPI = {
  // COURSE API
  fetchCourses: async (isAdmin = false): Promise<Course[]> => {
    const response = await api.get(`courses/?admin=${isAdmin}`);
    return response.data;
  },

  fetchCourseDetails: async (id: number | string): Promise<Course> => {
    const response = await api.get(`courses/${id}/`);
    return response.data.data || response.data;
  },

  createCourse: async (data: CourseCreateData): Promise<{ success: boolean; data: Course }> => {
    if (data.thumbnail instanceof File) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value as string | Blob);
        }
      });
      const response = await api.post('courses/create/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    const response = await api.post('courses/create/', data);
    return response.data;
  },

  updateCourse: async (id: number | string, data: CourseUpdateData): Promise<{ success: boolean; message: string; data: Course }> => {
    if (data.thumbnail instanceof File) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !(value instanceof File)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value as string | Blob);
          }
        }
      });
      const response = await api.patch(`courses/${id}/update/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    const response = await api.patch(`courses/${id}/update/`, data);
    return response.data;
  },

  deleteCourse: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`courses/${id}/delete/`);
    return response.data;
  },

  publishCourse: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`courses/${id}/publish/`);
    return response.data;
  },

  publishCourseChanges: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`courses/${id}/publish-changes/`, { confirm: true });
    return response.data;
  },

  unpublishCourse: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`courses/${id}/unpublish/`);
    return response.data;
  },

  // MODULE API
  fetchModules: async (courseId: number | string): Promise<Module[]> => {
    const response = await api.get(`courses/${courseId}/modules/`);
    return response.data;
  },

  createModule: async (courseId: number | string, data: Partial<Module>): Promise<{ success: boolean; data: Module }> => {
    const response = await api.post(`courses/${courseId}/modules/create/`, data);
    return response.data;
  },

  updateModule: async (courseId: number | string, moduleId: number | string, data: Partial<Module>): Promise<{ success: boolean; data: Module }> => {
    const response = await api.patch(`courses/${courseId}/modules/${moduleId}/update/`, data);
    return response.data;
  },

  deleteModule: async (courseId: number | string, moduleId: number | string): Promise<{ success: boolean; message: string; hard_deleted?: boolean }> => {
    const response = await api.delete(`courses/${courseId}/modules/${moduleId}/delete/`);
    return response.data;
  },

  // SECTION API
  fetchSections: async (moduleId: number | string): Promise<Section[]> => {
    const response = await api.get(`courses/modules/${moduleId}/sections/`);
    return response.data;
  },

  createSection: async (moduleId: number | string, data: Partial<Section>): Promise<{ success: boolean; data: Section }> => {
    const response = await api.post(`courses/modules/${moduleId}/sections/create/`, data);
    return response.data;
  },

  updateSection: async (courseId: number | string, moduleId: number | string, sectionId: number | string, data: Partial<Section>): Promise<{ success: boolean; data: Section }> => {
    const response = await api.patch(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/update/`, data);
    return response.data;
  },

  deleteSection: async (courseId: number | string, moduleId: number | string, sectionId: number | string): Promise<{ success: boolean; message: string; hard_deleted?: boolean }> => {
    const response = await api.delete(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/delete/`);
    return response.data;
  },

  fetchModuleContents: async (moduleId: number | string): Promise<any> => {
    const response = await api.get(`courses/modules/${moduleId}/all-contents/`);
    return response.data;
  },

  // CONTENT API
  fetchContents: async (courseId: number | string, moduleId: number | string, sectionId: number | string): Promise<ContentItem[]> => {
    const response = await api.get(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/contents/`);
    return response.data;
  },

  createContent: async (courseId: number | string, moduleId: number | string, sectionId: number | string, data: Partial<ContentItem>): Promise<{ success: boolean; data: ContentItem }> => {
    const response = await api.post(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/contents/create/`, data);
    return response.data;
  },

  fetchContentDetail: async (courseId: number | string, moduleId: number | string, sectionId: number | string, contentId: number | string): Promise<ContentItem> => {
    const response = await api.get(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/contents/${contentId}/`);
    return response.data;
  },

  updateContent: async (courseId: number | string, moduleId: number | string, sectionId: number | string, contentId: number | string, data: Partial<ContentItem>): Promise<{ success: boolean; data: ContentItem }> => {
    const response = await api.patch(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/contents/${contentId}/update/`, data);
    return response.data;
  },

  deleteContent: async (courseId: number | string, moduleId: number | string, sectionId: number | string, contentId: number | string): Promise<{ success: boolean; message: string; hard_deleted?: boolean }> => {
    const response = await api.delete(`courses/${courseId}/modules/${moduleId}/sections/${sectionId}/contents/${contentId}/delete/`);
    return response.data;
  },

  // METADATA API
  fetchLevels: async (): Promise<Level[]> => {
    const response = await api.get('levels/');
    return response.data.data || response.data;
  },

  fetchCategories: async (): Promise<Category[]> => {
    const response = await api.get('categories/');
    return response.data.data || response.data;
  },

  createCategory: async (name: string): Promise<{ success: boolean; data: Category }> => {
    const response = await api.post('categories/create/', { name });
    return response.data;
  },

  uploadMedia: async (file: File): Promise<{ success: boolean; message: string; data: { id: number; file: string; uploaded_at: string } }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('media/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // STUDENT PROGRESS API
  fetchMyEnrollments: async (): Promise<{ status: string; data: Enrollment[] }> => {
    const response = await api.get('my-courses/');
    return response.data;
  },

  enrollInCourse: async (courseId: number | string): Promise<{ status: string; data: Enrollment }> => {
    const response = await api.post('enroll/', { course: courseId });
    return response.data;
  },

  fetchCourseProgress: async (course_id: number | string): Promise<CourseProgress> => {
    const response = await api.get(`progress/courses/${course_id}/`);
    const data = response.data.data || response.data;
    return {
      ...data,
      completion_percentage: data.progress_percentage !== undefined ? data.progress_percentage : data.completion_percentage
    };
  },

  completeContent: async (courseId: number | string, sectionId: number | string, contentId: number | string): Promise<CompleteContentResponse> => {
    const response = await api.post(`progress/courses/${courseId}/sections/${sectionId}/contents/${contentId}/complete/`);
    return response.data;
  },

  fetchSectionContentsProgress: async (courseId: number | string, sectionId: number | string): Promise<SectionContentsProgressResponse> => {
    const response = await api.get(`progress/courses/${courseId}/sections/${sectionId}/contents/`);
    return response.data;
  },

  fetchSectionProgress: async (courseId: number | string, sectionId: number | string): Promise<{ status: string; section: any; progress: SectionProgress }> => {
    const response = await api.get(`progress/courses/${courseId}/sections/${sectionId}/`);
    return response.data;
  },

  fetchCourseSectionsProgress: async (courseId: number | string): Promise<CourseSectionsProgressResponse> => {
    const response = await api.get(`progress/courses/${courseId}/sections/`);
    return response.data;
  },

  fetchCompletedSections: async (): Promise<{ status: string; total_completed: number; data: SectionProgress[] }> => {
    const response = await api.get('progress/courses/sections/completed/');
    return response.data;
  },

  fetchCompletedCourseSections: async (courseId: number | string): Promise<{ status: string; course_id: number; total_completed: number; data: SectionProgress[] }> => {
    const response = await api.get(`progress/courses/${courseId}/sections/completed/`);
    return response.data;
  },

  fetchModuleProgress: async (courseId: number | string, moduleId: number | string): Promise<{ status: string; module: any; progress: ModuleProgress; sections: SectionProgress[] }> => {
    const response = await api.get(`progress/courses/${courseId}/modules/${moduleId}/`);
    return response.data;
  },

  fetchCourseModulesProgress: async (courseId: number | string): Promise<CourseModulesProgressResponse> => {
    const response = await api.get(`progress/courses/${courseId}/modules/`);
    return response.data;
  },

  fetchCompletedCourseModules: async (courseId: number | string): Promise<{ status: string; course_id: number; total_completed: number; data: ModuleProgress[] }> => {
    const response = await api.get(`progress/courses/${courseId}/modules/completed/`);
    return response.data;
  },

  fetchModuleContentsProgress: async (courseId: number | string, moduleId: number | string): Promise<ModuleContentsProgressResponse> => {
    const response = await api.get(`progress/courses/${courseId}/modules/${moduleId}/contents/`);
    return response.data;
  },

  fetchLearningHoursKPI: async (): Promise<LearningHoursKPI> => {
    const response = await api.get('progress/kpi/learning-hours/');
    return response.data.data;
  },

  fetchLearningActivityKPI: async (): Promise<LearningActivityKPI> => {
    const response = await api.get('progress/kpi/learning-activity/');
    return response.data.data;
  },

  fetchCoursesKPI: async (): Promise<CoursesKPI> => {
    const response = await api.get('progress/kpi/courses/');
    return response.data.data || response.data.statistics;
  },

  fetchCompletionRateKPI: async (): Promise<CompletionRateKPI> => {
    const response = await api.get('progress/kpi/completion-rate/');
    return response.data.data || response.data;
  },

  startLearning: async (courseId: number | string): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/start/`);
    return response.data;
  },

  continueLearning: async (courseId: number | string): Promise<any> => {
    const response = await api.get(`progress/courses/${courseId}/continue/`);
    return response.data;
  },

  endLearningSession: async (courseId: number | string): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/end-session/`);
    return response.data;
  },

  fetchLessonContentsProgress: async (courseId: number | string, lessonId: number | string): Promise<{ contents: LessonContentProgress[] }> => {
    const response = await courseAPI.fetchSectionContentsProgress(courseId, lessonId);
    return { contents: response.contents };
  },

  fetchCourseLessonsProgress: async (courseId: number | string): Promise<{ lessons: LessonProgress[] }> => {
    const response = await courseAPI.fetchCourseSectionsProgress(courseId);
    return { lessons: response.sections };
  },

  completeFinalAssessment: async (courseId: number | string): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/final/complete/`);
    return response.data;
  },
};

export default courseAPI;
