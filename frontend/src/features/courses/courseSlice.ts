import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import courseAPI from './courseAPI';
import { Course, CourseCreateData, CourseUpdateData, Lesson, LessonCreateData, Level, Category } from './types';

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  levels: Level[];
  categories: Category[];
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  unpublishedChanges: Record<number, boolean>;
}

const STORAGE_KEY = 'courses_unpublished_changes';

const loadUnpublishedChanges = (): Record<number, boolean> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveUnpublishedChanges = (data: Record<number, boolean>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save unpublished changes to localStorage', e);
  }
};

const initialState: CourseState = {
  courses: [],
  currentCourse: null,
  levels: [],
  categories: [],
  lessons: [],
  isLoading: false,
  error: null,
  status: 'idle',
  unpublishedChanges: loadUnpublishedChanges(),
};

export const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (isAdmin: boolean = false, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchCourses(isAdmin);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch courses');
    }
  }
);

export const fetchCourseDetails = createAsyncThunk(
  'courses/fetchCourseDetails',
  async (id: number, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchCourseDetails(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch course details');
    }
  }
);

export const createCourse = createAsyncThunk(
  'courses/createCourse',
  async (data: CourseCreateData, { rejectWithValue }) => {
    try {
      const response = await courseAPI.createCourse(data);
      if (response.success) {
        return response; // Return full response {success, message, data}
      }
      return rejectWithValue('Failed to create course');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create course');
    }
  }
);

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, data }: { id: number; data: CourseUpdateData }, { rejectWithValue }) => {
    try {
      return await courseAPI.updateCourse(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update course');
    }
  }
);

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await courseAPI.deleteCourse(id);
      return { id, message: response.message };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete course');
    }
  }
);

export const publishCourse = createAsyncThunk(
  'courses/publishCourse',
  async (id: number, { rejectWithValue }) => {
    try {
      await courseAPI.publishCourse(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish course');
    }
  }
);

export const unpublishCourse = createAsyncThunk(
  'courses/unpublishCourse',
  async (id: number, { rejectWithValue }) => {
    try {
      await courseAPI.unpublishCourse(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unpublish course');
    }
  }
);

export const createLesson = createAsyncThunk(
  'courses/createLesson',
  async ({ courseId, data }: { courseId: number; data: LessonCreateData & { contents: any[] } }, { rejectWithValue }) => {
    try {
      const response = await courseAPI.createLesson(courseId, data);
      if (response.success) {
        return response.data;
      }
      return rejectWithValue('Failed to create lesson');
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create lesson');
    }
  }
);

export const updateLesson = createAsyncThunk(
  'courses/updateLesson',
  async ({ lessonId, data }: { lessonId: number; data: Partial<LessonCreateData> & { contents: any[] } }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`lessons/${lessonId}/update/`, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update lesson');
    }
  }
);

export const fetchLevels = createAsyncThunk(
  'courses/fetchLevels',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchLevels();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch levels');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'courses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchCategories();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

const courseSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    clearCurrentCourse: (state) => {
      state.currentCourse = null;
    },
    resetStatus: (state) => {
      state.status = 'idle';
    },
    setUnpublishedChanges: (state, action: PayloadAction<{ id: number; hasChanges: boolean }>) => {
      state.unpublishedChanges[action.payload.id] = action.payload.hasChanges;
      saveUnpublishedChanges(state.unpublishedChanges);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Courses
      .addCase(fetchCourses.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
      })
      .addCase(fetchCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Fetch Course Details
      .addCase(fetchCourseDetails.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCourseDetails.fulfilled, (state, action: PayloadAction<Course>) => {
        state.isLoading = false;
        state.currentCourse = action.payload;
        const index = state.courses.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        } else {
          state.courses.push(action.payload);
        }
      })
      .addCase(fetchCourseDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Course
      .addCase(createCourse.fulfilled, (state, action: PayloadAction<any>) => {
        state.courses.unshift(action.payload.data);
        state.status = 'succeeded';
      })
      // Update Course
      .addCase(updateCourse.fulfilled, (state, action: PayloadAction<any>) => {
        const courseData = action.payload.data || action.payload; // fallback for legacy responses
        const index = state.courses.findIndex(c => c.id === courseData.id);
        if (index !== -1) {
          state.courses[index] = courseData;
        }
        state.status = 'succeeded';
      })
      // Delete Course
      .addCase(deleteCourse.fulfilled, (state, action: PayloadAction<{ id: number; message: string }>) => {
        state.courses = state.courses.filter(c => c.id !== action.payload.id);
        state.status = 'succeeded';
      })
      // Publish/Unpublish
      .addCase(publishCourse.fulfilled, (state, action: PayloadAction<number>) => {
        const course = state.courses.find(c => c.id === action.payload);
        if (course) course.is_published = true;
        state.unpublishedChanges[action.payload] = false;
        saveUnpublishedChanges(state.unpublishedChanges);
        state.status = 'succeeded';
      })
      .addCase(unpublishCourse.fulfilled, (state, action: PayloadAction<number>) => {
        const course = state.courses.find(c => c.id === action.payload);
        if (course) course.is_published = false;
        state.unpublishedChanges[action.payload] = false;
        saveUnpublishedChanges(state.unpublishedChanges);
        state.status = 'succeeded';
      })
      // Lessons
      .addCase(createLesson.fulfilled, (state, action: PayloadAction<Lesson>) => {
        state.lessons.push(action.payload);
        state.status = 'succeeded';
      })
      .addCase(updateLesson.fulfilled, (state, action: PayloadAction<Lesson>) => {
        const index = state.lessons.findIndex(l => l.id === action.payload.id);
        if (index !== -1) {
          state.lessons[index] = action.payload;
        }
        state.status = 'succeeded';
      })
      // Levels & Categories
      .addCase(fetchLevels.fulfilled, (state, action: PayloadAction<Level[]>) => {
        state.levels = action.payload;
      })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => {
        state.categories = action.payload;
      });
  },
});

export const { clearCurrentCourse, resetStatus, setUnpublishedChanges } = courseSlice.actions;
export default courseSlice.reducer;
