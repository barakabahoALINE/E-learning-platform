import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseAPI from '../courses/courseAPI';
import { CourseProgress, LearningHoursKPI, CoursesKPI, LessonContentProgress, LessonProgress } from '../courses/types';

interface ProgressState {
  courseProgress: Record<number, CourseProgress>;
  lessonContentProgress: Record<number, LessonContentProgress[]>;
  courseLessonsProgress: Record<number, LessonProgress[]>;
  learningHours: LearningHoursKPI | null;
  coursesKPI: CoursesKPI | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProgressState = {
  courseProgress: {},
  lessonContentProgress: {},
  courseLessonsProgress: {},
  learningHours: null,
  coursesKPI: null,
  loading: false,
  error: null,
};

export const fetchCourseProgress = createAsyncThunk(
  'progress/fetchCourseProgress',
  async (courseId: number, { rejectWithValue }) => {
    try {
      const response = await courseAPI.fetchCourseProgress(courseId);
      return { courseId, data: response };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch progress');
    }
  }
);

export const markContentComplete = createAsyncThunk(
  'progress/markContentComplete',
  async ({ courseId, lessonId, contentId }: { courseId: number; lessonId: number; contentId: number }, { rejectWithValue, dispatch }) => {
    try {
      await courseAPI.completeContent(courseId, lessonId, contentId);
      // Refresh progress after marking complete
      await dispatch(fetchCourseProgress(courseId)).unwrap();
      return { courseId, contentId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark content complete');
    }
  }
);

export const fetchLearningHoursKPI = createAsyncThunk(
  'progress/fetchLearningHoursKPI',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchLearningHoursKPI();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch learning hours');
    }
  }
);

export const fetchCoursesKPI = createAsyncThunk(
  'progress/fetchCoursesKPI',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchCoursesKPI();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch courses KPI');
    }
  }
);

export const startLearning = createAsyncThunk(
  'progress/startLearning',
  async (courseId: number, { rejectWithValue }) => {
    try {
      return await courseAPI.startLearning(courseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start learning session');
    }
  }
);

export const continueLearning = createAsyncThunk(
  'progress/continueLearning',
  async (courseId: number, { rejectWithValue }) => {
    try {
      return await courseAPI.continueLearning(courseId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to continue learning session');
    }
  }
);

export const endLearningSession = createAsyncThunk(
  'progress/endLearningSession',
  async (courseId: number, { rejectWithValue, dispatch }) => {
    try {
      const response = await courseAPI.endLearningSession(courseId);
      dispatch(fetchLearningHoursKPI());
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to end learning session');
    }
  }
);

export const fetchLessonContentsProgress = createAsyncThunk(
  'progress/fetchLessonContentsProgress',
  async ({ courseId, lessonId }: { courseId: number; lessonId: number }, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchLessonContentsProgress(courseId, lessonId);
      return { lessonId, contents: data.contents };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch lesson content progress');
    }
  }
);

export const fetchCourseLessonsProgress = createAsyncThunk(
  'progress/fetchCourseLessonsProgress',
  async (courseId: number, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchCourseLessonsProgress(courseId);
      return { courseId, lessons: data.lessons };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch course lessons progress');
    }
  }
);

export const completeFinalAssessment = createAsyncThunk(
  'progress/completeFinalAssessment',
  async (courseId: number, { rejectWithValue, dispatch }) => {
    try {
      const response = await courseAPI.completeFinalAssessment(courseId);
      dispatch(fetchCourseProgress(courseId));
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete final assessment');
    }
  }
);

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseProgress.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCourseProgress.fulfilled, (state, action) => {
        state.loading = false;
        state.courseProgress[action.payload.courseId] = action.payload.data;
      })
      .addCase(fetchCourseProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchLearningHoursKPI.fulfilled, (state, action) => {
        state.learningHours = action.payload;
      })
      .addCase(fetchCoursesKPI.fulfilled, (state, action) => {
        state.coursesKPI = action.payload;
      })
      .addCase(fetchLessonContentsProgress.fulfilled, (state, action) => {
        state.lessonContentProgress[action.payload.lessonId] = action.payload.contents;
      })
      .addCase(fetchCourseLessonsProgress.fulfilled, (state, action) => {
        state.courseLessonsProgress[action.payload.courseId] = action.payload.lessons;
      });
  },
});

export default progressSlice.reducer;
