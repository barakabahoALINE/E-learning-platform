import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseAPI from '../courses/courseAPI';
import {
  CourseProgress,
  CompletionRateKPI,
  LearningHoursKPI,
  CoursesKPI,
  LearningActivityKPI,
  LessonContentProgress,
  LessonProgress,
  ModuleProgress,
  SectionProgress,
} from '../courses/types';

interface ProgressState {
  courseProgress: Record<number, CourseProgress>;
  lessonContentProgress: Record<number, LessonContentProgress[]>;
  courseLessonsProgress: Record<number, LessonProgress[]>;
  sectionContentProgress: Record<number, LessonContentProgress[]>;
  courseSectionsProgress: Record<number, SectionProgress[]>;
  courseModulesProgress: Record<number, ModuleProgress[]>;
  moduleContentsProgress: Record<number, ModuleProgress>;
  learningHours: LearningHoursKPI | null;
  learningActivity: LearningActivityKPI | null;
  coursesKPI: CoursesKPI | null;
  completionRateKPI: CompletionRateKPI | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProgressState = {
  courseProgress: {},
  lessonContentProgress: {},
  courseLessonsProgress: {},
  sectionContentProgress: {},
  courseSectionsProgress: {},
  courseModulesProgress: {},
  moduleContentsProgress: {},
  learningHours: null,
  learningActivity: null,
  coursesKPI: null,
  completionRateKPI: null,
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
  async ({ courseId, sectionId, contentId }: { courseId: number; sectionId: number; contentId: number }, { rejectWithValue, dispatch }) => {
    try {
      const response = await courseAPI.completeContent(courseId, sectionId, contentId);
      dispatch(fetchCourseModulesProgress(courseId));
      return { courseId, sectionId, contentId, data: response };
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

export const fetchLearningActivityKPI = createAsyncThunk(
  'progress/fetchLearningActivityKPI',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchLearningActivityKPI();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch learning activity');
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

export const fetchCompletionRateKPI = createAsyncThunk(
  'progress/fetchCompletionRateKPI',
  async (_, { rejectWithValue }) => {
    try {
      return await courseAPI.fetchCompletionRateKPI();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch completion rate KPI');
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

export const fetchSectionContentsProgress = createAsyncThunk(
  'progress/fetchSectionContentsProgress',
  async ({ courseId, sectionId }: { courseId: number; sectionId: number }, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchSectionContentsProgress(courseId, sectionId);
      return { sectionId, contents: data.contents };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch section content progress');
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

export const fetchCourseSectionsProgress = createAsyncThunk(
  'progress/fetchCourseSectionsProgress',
  async (courseId: number, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchCourseSectionsProgress(courseId);
      return { courseId, sections: data.sections };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch course sections progress');
    }
  }
);

export const fetchCourseModulesProgress = createAsyncThunk(
  'progress/fetchCourseModulesProgress',
  async (courseId: number, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchCourseModulesProgress(courseId);
      return { courseId, modules: data.modules };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch course modules progress');
    }
  }
);

export const fetchModuleContentsProgress = createAsyncThunk(
  'progress/fetchModuleContentsProgress',
  async ({ courseId, moduleId }: { courseId: number; moduleId: number }, { rejectWithValue }) => {
    try {
      const data = await courseAPI.fetchModuleContentsProgress(courseId, moduleId);
      return { moduleId, progress: data.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch module content progress');
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
      .addCase(fetchLearningActivityKPI.fulfilled, (state, action) => {
        state.learningActivity = action.payload;
      })
      .addCase(fetchCoursesKPI.fulfilled, (state, action) => {
        state.coursesKPI = action.payload;
      })
      .addCase(fetchCompletionRateKPI.fulfilled, (state, action) => {
        state.completionRateKPI = action.payload;
      })
      .addCase(markContentComplete.fulfilled, (state, action) => {
        const { courseId, sectionId, contentId, data } = action.payload;
        const courseProgress = data.course_progress;
        state.courseProgress[courseId] = {
          ...courseProgress,
          completion_percentage: courseProgress.progress_percentage ?? courseProgress.completion_percentage ?? 0,
        };

        const sectionContents = state.sectionContentProgress[sectionId] || state.lessonContentProgress[sectionId] || [];
        const updatedContents = sectionContents.map((content) =>
          Number(content.id ?? content.content_id) === contentId
            ? {
              ...content,
              completed: true,
              completed_at: data.content_progress.completed_at,
              progress_percentage: 100,
            }
            : content
        );
        state.sectionContentProgress[sectionId] = updatedContents;
        state.lessonContentProgress[sectionId] = updatedContents;

        const moduleId = data.module_progress.module_id;
        const moduleContents = state.moduleContentsProgress[moduleId];
        if (moduleContents?.sections) {
          moduleContents.completed_contents = moduleContents.sections.reduce((total, section) => {
            if (section.section_id !== sectionId) {
              return total + section.contents.filter((content) => content.completed).length;
            }

            section.contents = section.contents.map((content) =>
              Number(content.id ?? content.content_id) === contentId
                ? {
                  ...content,
                  completed: true,
                  completed_at: data.content_progress.completed_at,
                  progress_percentage: 100,
                }
                : content
            );
            return total + section.contents.filter((content) => content.completed).length;
          }, 0);
          moduleContents.progress_percentage = data.module_progress.progress_percentage;
        }
      })
      .addCase(fetchLessonContentsProgress.fulfilled, (state, action) => {
        state.lessonContentProgress[action.payload.lessonId] = action.payload.contents;
        state.sectionContentProgress[action.payload.lessonId] = action.payload.contents;
      })
      .addCase(fetchCourseLessonsProgress.fulfilled, (state, action) => {
        state.courseLessonsProgress[action.payload.courseId] = action.payload.lessons;
        state.courseSectionsProgress[action.payload.courseId] = action.payload.lessons;
      })
      .addCase(fetchSectionContentsProgress.fulfilled, (state, action) => {
        state.sectionContentProgress[action.payload.sectionId] = action.payload.contents;
        state.lessonContentProgress[action.payload.sectionId] = action.payload.contents;
      })
      .addCase(fetchCourseSectionsProgress.fulfilled, (state, action) => {
        state.courseSectionsProgress[action.payload.courseId] = action.payload.sections;
        state.courseLessonsProgress[action.payload.courseId] = action.payload.sections;
      })
      .addCase(fetchCourseModulesProgress.fulfilled, (state, action) => {
        state.courseModulesProgress[action.payload.courseId] = action.payload.modules;
      })
      .addCase(fetchModuleContentsProgress.fulfilled, (state, action) => {
        state.moduleContentsProgress[action.payload.moduleId] = action.payload.progress;
      });
  },
});

export default progressSlice.reducer;
