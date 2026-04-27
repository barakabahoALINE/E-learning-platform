import api from '../../services/api';
import { Course, CourseCreateData, CourseUpdateData, Lesson, LessonCreateData, Level, Category, LessonContentCreateUpdateData, LessonContent, LessonUpdateData, Enrollment, CourseProgress, LearningHoursKPI, CoursesKPI, LessonProgress, LessonContentProgress } from './types';

const courseAPI = {
  fetchCourses: async (isAdmin = false): Promise<Course[]> => {
    const response = await api.get(`courses/?admin=${isAdmin}`);
    return response.data;
  },

  fetchCourseDetails: async (id: number): Promise<Course> => {
    const response = await api.get(`courses/${id}/`);
    return response.data;
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

  updateCourse: async (id: number, data: CourseUpdateData): Promise<{ success: boolean; message: string; data: Course }> => {
    const mappedData = { ...data };
    if (mappedData.lessons) {
      mappedData.lessons = mappedData.lessons.map(lesson => ({
        ...lesson,
        contents: (lesson.blocks || []).map((block, index) => ({
          id: typeof block.id === 'number' ? block.id : undefined,
          title: block.title || (block.type.charAt(0).toUpperCase() + block.type.slice(1)),
          content_type: block.type === 'text' ? 'note' : (block.type as any),
          note_text: block.type === 'text' ? block.content : undefined,
          video_url: block.type === 'video' ? block.content : undefined,
          description: block.type === 'image' ? block.content : (block.settings?.caption || ''),
          file: block.type === 'file' ? block.content : (block.type === 'image' ? block.content : null),
          quiz: block.type === 'quiz' ? block.quiz : null,
          order: index,
          is_preview: false
        }))
      })) as Lesson[];
    }

     if (mappedData.thumbnail instanceof File) {
      const formData = new FormData();
      Object.entries(mappedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'lessons' || key === 'finalAssessment') {
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
    const response = await api.patch(`courses/${id}/update/`, mappedData);
    return response.data;
  },

  deleteCourse: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`courses/${id}/delete/`);
    return response.data;
  },

  publishCourse: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`courses/${id}/publish/`);
    return response.data;
  },

  unpublishCourse: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`courses/${id}/unpublish/`);
    return response.data;
  },

  fetchLessons: async (courseId: number): Promise<Lesson[]> => {
    const response = await api.get(`courses/${courseId}/lessons/`);
    return response.data;
  },

  createLesson: async (courseId: number, data: LessonCreateData): Promise<{ success: boolean; data: Lesson }> => {
    const response = await api.post(`courses/${courseId}/lessons/create/`, data);
    return response.data;
  },

  updateLesson: async (courseId: number, lessonId: number, data: LessonUpdateData): Promise<{ success: boolean; data: Lesson }> => {
    const response = await api.patch(`courses/${courseId}/lessons/${lessonId}/update/`, data);
    return response.data;
  },

  deleteLesson: async (courseId: number, lessonId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`courses/${courseId}/lessons/${lessonId}/delete/`);
    return response.data;
  },

  fetchLessonContents: async (courseId: number, lessonId: number): Promise<LessonContent[]> => {
    const response = await api.get(`courses/${courseId}/lessons/${lessonId}/contents/`);
    return response.data;
  },

  createLessonContent: async (courseId: number, lessonId: number, data: LessonContentCreateUpdateData): Promise<{ success: boolean; data: LessonContent }> => {
    const response = await api.post(`courses/${courseId}/lessons/${lessonId}/contents/create/`, data);
    return response.data;
  },

  updateLessonContent: async (courseId: number, lessonId: number, contentId: number, data: LessonContentCreateUpdateData): Promise<{ success: boolean; data: LessonContent }> => {
    const response = await api.patch(`courses/${courseId}/lessons/${lessonId}/contents/${contentId}/update/`, data);
    return response.data;
  },

  deleteLessonContent: async (courseId: number, lessonId: number, contentId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`courses/${courseId}/lessons/${lessonId}/contents/${contentId}/delete/`);
    return response.data;
  },

  fetchLevels: async (): Promise<Level[]> => {
    const response = await api.get('levels/');
    return response.data;
  },

  fetchCategories: async (): Promise<Category[]> => {
    const response = await api.get('categories/');
    return response.data;
  },

  uploadMedia: async (file: File): Promise<{ success: boolean; url: string; id: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('media/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  fetchMyEnrollments: async (): Promise<{ status: string; data: Enrollment[] }> => {
    const response = await api.get('my-courses/');
    return response.data;
  },

  enrollInCourse: async (courseId: number): Promise<{ status: string; data: Enrollment }> => {
    const response = await api.post('enroll/', { course: courseId });
    return response.data;
  },

  fetchCourseProgress: async (courseId: number): Promise<CourseProgress> => {
    const response = await api.get(`progress/courses/${courseId}/`);
    const data = response.data.data || response.data;
    return {
      ...data,
      completion_percentage: data.progress_percentage !== undefined ? data.progress_percentage : data.completion_percentage
    };
  },

  completeContent: async (courseId: number, lessonId: number, contentId: number): Promise<{ success: boolean }> => {
    const response = await api.post(`progress/courses/${courseId}/lessons/${lessonId}/contents/${contentId}/complete/`);
    return response.data;
  },

  fetchLearningHoursKPI: async (): Promise<LearningHoursKPI> => {
    const response = await api.get('progress/kpi/learning-hours/');
    return response.data.data;
  },

  fetchCoursesKPI: async (): Promise<CoursesKPI> => {
    const response = await api.get('progress/kpi/courses/');
    return response.data.data;
  },

  startLearning: async (courseId: number): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/start/`);
    return response.data;
  },

  continueLearning: async (courseId: number): Promise<any> => {
    const response = await api.get(`progress/courses/${courseId}/continue/`);
    return response.data;
  },

  endLearningSession: async (courseId: number): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/end-session/`);
    return response.data;
  },

  fetchLessonContentsProgress: async (courseId: number, lessonId: number): Promise<{ contents: LessonContentProgress[] }> => {
    const response = await api.get(`progress/courses/${courseId}/lessons/${lessonId}/contents/`);
    return response.data;
  },

  fetchCourseLessonsProgress: async (courseId: number): Promise<{ lessons: LessonProgress[] }> => {
    const response = await api.get(`progress/courses/${courseId}/lessons/`);
    return response.data;
  },

  completeFinalAssessment: async (courseId: number): Promise<any> => {
    const response = await api.post(`progress/courses/${courseId}/final/complete/`);
    return response.data;
  },
};

export default courseAPI;
