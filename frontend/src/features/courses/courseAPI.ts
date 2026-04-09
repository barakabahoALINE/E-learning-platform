import api from '../../services/api';
import { Course, CourseCreateData, CourseUpdateData, Lesson, LessonCreateData, Level, Category } from './types';

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
        contents: lesson.blocks?.map((block, index) => ({
          title: block.title || (block.type.charAt(0).toUpperCase() + block.type.slice(1)),
          content_type: block.type === 'text' ? 'note' : block.type,
          text_content: block.type === 'text' ? block.content : undefined,
          video_url: block.type === 'video' ? block.content : undefined,
          description: block.type === 'image' ? block.content : (block.settings?.caption || ''),
          file: block.type === 'file' ? block.content : (block.type === 'image' ? block.content : null),
          quiz: block.type === 'quiz' ? block.quiz : null,
          order: index,
        })) || []
      }));
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
};

export default courseAPI;
