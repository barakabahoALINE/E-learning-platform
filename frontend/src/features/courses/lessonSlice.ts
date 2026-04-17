import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import courseAPI from './courseAPI';
import { fetchCourseDetails } from './courseSlice';
import { Lesson, LessonContent, LessonCreateData, LessonUpdateData, LessonContentCreateUpdateData } from './types';

interface LessonState {
  lessons: Lesson[];
  contents: Record<number, LessonContent[]>;
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: LessonState = {
  lessons: [],
  contents: {},
  isLoading: false,
  error: null,
  status: 'idle',
};

export const fetchLessons = createAsyncThunk(
  'lessons/fetchLessons',
  async (courseId: number, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchLessons(courseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lessons');
    }
  }
);

export const createLesson = createAsyncThunk(
  'lessons/createLesson',
  async ({ courseId, data }: { courseId: number; data: LessonCreateData }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.createLesson(courseId, data);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue('Failed to create lesson');
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to create lesson');
    }
  }
);

export const updateLesson = createAsyncThunk(
  'lessons/updateLesson',
  async ({ courseId, lessonId, data }: { courseId: number; lessonId: number; data: LessonUpdateData }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.updateLesson(courseId, lessonId, data);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue('Failed to update lesson');
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Failed to update lesson');
    }
  }
);

export const deleteLesson = createAsyncThunk(
  'lessons/deleteLesson',
  async ({ courseId, lessonId }: { courseId: number; lessonId: number }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.deleteLesson(courseId, lessonId);
      if (response.success) {
        return lessonId;
      }
      return rejectWithValue('Failed to delete lesson');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete lesson');
    }
  }
);

export const fetchLessonContents = createAsyncThunk(
  'lessons/fetchLessonContents',
  async ({ courseId, lessonId }: { courseId: number; lessonId: number }, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchLessonContents(courseId, lessonId);
      return { lessonId, contents: data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lesson contents');
    }
  }
);

export const createContent = createAsyncThunk(
  'lessons/createContent',
  async ({ courseId, lessonId, data }: { courseId: number; lessonId: number; data: LessonContentCreateUpdateData }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.createLessonContent(courseId, lessonId, data);
      if (response.success) {
        return { lessonId, content: response.data };
      }
      return rejectWithValue('Failed to create content');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create content');
    }
  }
);

export const updateContent = createAsyncThunk(
  'lessons/updateContent',
  async ({ courseId, lessonId, contentId, data }: { courseId: number; lessonId: number; contentId: number; data: LessonContentCreateUpdateData }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.updateLessonContent(courseId, lessonId, contentId, data);
      if (response.success) {
        return { lessonId, content: response.data };
      }
      return rejectWithValue('Failed to update content');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update content');
    }
  }
);

export const deleteContent = createAsyncThunk(
  'lessons/deleteContent',
  async ({ courseId, lessonId, contentId }: { courseId: number; lessonId: number; contentId: number }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.deleteLessonContent(courseId, lessonId, contentId);
      if (response.success) {
        return { lessonId, contentId };
      }
      return rejectWithValue('Failed to delete content');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete content');
    }
  }
);

const lessonSlice = createSlice({
  name: 'lessons',
  initialState,
  reducers: {
    clearLessons: (state) => {
      state.lessons = [];
      state.contents = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLessons.fulfilled, (state, action: PayloadAction<Lesson[]>) => {
        state.lessons = action.payload;
        action.payload.forEach(lesson => {
          if (lesson.contents) {
            state.contents[lesson.id] = lesson.contents;
          }
        });
        state.status = 'succeeded';
      })
      // Create Lesson
      .addCase(createLesson.fulfilled, (state, action: PayloadAction<Lesson>) => {
        state.lessons.push(action.payload);
      })
      // Update Lesson
      .addCase(updateLesson.fulfilled, (state, action: PayloadAction<Lesson>) => {
        const index = state.lessons.findIndex(l => l.id === action.payload.id);
        if (index !== -1) {
          state.lessons[index] = action.payload;
        }
      })
      // Delete Lesson
      .addCase(deleteLesson.fulfilled, (state, action: PayloadAction<number>) => {
        state.lessons = state.lessons.filter(l => l.id !== action.payload);
        delete state.contents[action.payload];
      })
      // Fetch Contents
      .addCase(fetchLessonContents.fulfilled, (state, action: PayloadAction<{ lessonId: number; contents: LessonContent[] }>) => {
        state.contents[action.payload.lessonId] = action.payload.contents;
      })
      // Create Content
      .addCase(createContent.fulfilled, (state, action: PayloadAction<{ lessonId: number; content: LessonContent }>) => {
        if (!state.contents[action.payload.lessonId]) {
          state.contents[action.payload.lessonId] = [];
        }
        state.contents[action.payload.lessonId].push(action.payload.content);
        state.contents[action.payload.lessonId].sort((a, b) => a.order - b.order);
      })
      // Update Content
      .addCase(updateContent.fulfilled, (state, action: PayloadAction<{ lessonId: number; content: LessonContent }>) => {
        const lessonContents = state.contents[action.payload.lessonId];
        if (lessonContents) {
          const index = lessonContents.findIndex(c => c.id === action.payload.content.id);
          if (index !== -1) {
            lessonContents[index] = action.payload.content;
            lessonContents.sort((a, b) => a.order - b.order);
          }
        }
      })
      // Delete Content
      .addCase(deleteContent.fulfilled, (state, action: PayloadAction<{ lessonId: number; contentId: number }>) => {
        const lessonContents = state.contents[action.payload.lessonId];
        if (lessonContents) {
          state.contents[action.payload.lessonId] = lessonContents.filter(c => c.id !== action.payload.contentId);
        }
      })
      // Sync with Course Details (handled in courseSlice)
      .addCase(fetchCourseDetails.fulfilled, (state, action: any) => {
        const lessons = action.payload.lessons || [];
        state.lessons = lessons;
        lessons.forEach((lesson: any) => {
          if (lesson.contents) {
            state.contents[lesson.id] = lesson.contents;
          }
        });
      });
  },
});

export const { clearLessons } = lessonSlice.actions;
export default lessonSlice.reducer;
