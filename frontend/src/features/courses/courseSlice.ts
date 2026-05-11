import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import courseAPI from './courseAPI';
import { 
  Course, 
  CourseCreateData, 
  CourseUpdateData, 
  Module, 
  Section, 
  ContentItem, 
  Level, 
  Category 
} from './types';

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  levels: Level[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: CourseState = {
  courses: [],
  currentCourse: null,
  levels: [],
  categories: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

// --- Thunks ---

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
  async (id: number | string, { rejectWithValue }) => {
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
      return await courseAPI.createCourse(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create course');
    }
  }
);

export const updateCourse = createAsyncThunk(
  'courses/updateCourse',
  async ({ id, data }: { id: number | string; data: CourseUpdateData }, { rejectWithValue }) => {
    try {
      return await courseAPI.updateCourse(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update course');
    }
  }
);

export const deleteCourse = createAsyncThunk(
  'courses/deleteCourse',
  async (id: number | string, { rejectWithValue }) => {
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
  async (id: number | string, { rejectWithValue }) => {
    try {
      await courseAPI.publishCourse(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish course');
    }
  }
);

export const publishCourseChanges = createAsyncThunk(
  'courses/publishCourseChanges',
  async (id: number | string, { rejectWithValue }) => {
    try {
      const response = await courseAPI.publishCourseChanges(id);
      return { id, message: response.message };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish changes');
    }
  }
);

export const unpublishCourse = createAsyncThunk(
  'courses/unpublishCourse',
  async (id: number | string, { rejectWithValue }) => {
    try {
      await courseAPI.unpublishCourse(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to unpublish course');
    }
  }
);

// --- Module Thunks ---
export const createModule = createAsyncThunk(
  'courses/createModule',
  async ({ courseId, data }: { courseId: number | string; data: Partial<Module> }, { rejectWithValue }) => {
    try {
      return await courseAPI.createModule(courseId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create module');
    }
  }
);

export const updateModule = createAsyncThunk(
  'courses/updateModule',
  async ({ courseId, moduleId, data }: { courseId: number | string; moduleId: number | string; data: Partial<Module> }, { rejectWithValue }) => {
    try {
      return await courseAPI.updateModule(courseId, moduleId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update module');
    }
  }
);

export const deleteModule = createAsyncThunk(
  'courses/deleteModule',
  async ({ courseId, moduleId }: { courseId: number | string; moduleId: number | string }, { rejectWithValue }) => {
    try {
      const res = await courseAPI.deleteModule(courseId, moduleId);
      return { moduleId, hardDeleted: res.hard_deleted };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete module');
    }
  }
);

// --- Section Thunks ---
export const createSection = createAsyncThunk(
  'courses/createSection',
  async ({ moduleId, data }: { moduleId: number | string; data: Partial<Section> }, { rejectWithValue }) => {
    try {
      return await courseAPI.createSection(moduleId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create section');
    }
  }
);

export const updateSection = createAsyncThunk(
  'courses/updateSection',
  async ({ courseId, moduleId, sectionId, data }: { courseId: number | string; moduleId: number | string; sectionId: number | string; data: Partial<Section> }, { rejectWithValue }) => {
    try {
      return await courseAPI.updateSection(courseId, moduleId, sectionId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update section');
    }
  }
);

export const deleteSection = createAsyncThunk(
  'courses/deleteSection',
  async ({ courseId, moduleId, sectionId }: { courseId: number | string; moduleId: number | string; sectionId: number | string }, { rejectWithValue }) => {
    try {
      const res = await courseAPI.deleteSection(courseId, moduleId, sectionId);
      return { sectionId, hardDeleted: res.hard_deleted };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete section');
    }
  }
);

// --- Content Thunks ---
export const createContent = createAsyncThunk(
  'courses/createContent',
  async ({ courseId, moduleId, sectionId, data }: { courseId: number | string; moduleId: number | string; sectionId: number | string; data: Partial<ContentItem> }, { rejectWithValue }) => {
    try {
      const result = await courseAPI.createContent(courseId, moduleId, sectionId, data);
      return { ...result, _sectionId: sectionId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create content');
    }
  }
);

export const updateContent = createAsyncThunk(
  'courses/updateContent',
  async ({ courseId, moduleId, sectionId, contentId, data }: { courseId: number | string; moduleId: number | string; sectionId: number | string; contentId: number | string; data: Partial<ContentItem> }, { rejectWithValue }) => {
    try {
      const result = await courseAPI.updateContent(courseId, moduleId, sectionId, contentId, data);
      return { ...result, _sectionId: sectionId };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update content');
    }
  }
);

export const deleteContent = createAsyncThunk(
  'courses/deleteContent',
  async ({ courseId, moduleId, sectionId, contentId }: { courseId: number | string; moduleId: number | string; sectionId: number | string; contentId: number | string }, { rejectWithValue }) => {
    try {
      const res = await courseAPI.deleteContent(courseId, moduleId, sectionId, contentId);
      return { contentId, hardDeleted: res.hard_deleted };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete content');
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
  },
  extraReducers: (builder) => {
    builder
      // Courses
      .addCase(fetchCourses.pending, (state) => { state.isLoading = true; state.status = 'loading'; })
      .addCase(fetchCourses.fulfilled, (state, action: PayloadAction<Course[]>) => {
        state.isLoading = false; state.status = 'succeeded'; state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false; state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(fetchCourseDetails.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCourseDetails.fulfilled, (state, action: PayloadAction<Course>) => {
        state.isLoading = false; state.status = 'succeeded'; state.currentCourse = action.payload;
      })
      .addCase(fetchCourseDetails.rejected, (state, action) => {
        state.isLoading = false; state.status = 'failed'; state.error = action.payload as string;
      })
      .addCase(createCourse.fulfilled, (state, action: PayloadAction<any>) => {
        state.courses.unshift(action.payload.data); state.status = 'succeeded';
      })
      .addCase(updateCourse.fulfilled, (state, action: PayloadAction<any>) => {
        const courseData = action.payload.data || action.payload;
        state.currentCourse = courseData;
        const index = state.courses.findIndex(c => c.id === courseData.id);
        if (index !== -1) state.courses[index] = courseData;
        state.status = 'succeeded';
      })
      .addCase(deleteCourse.fulfilled, (state, action: PayloadAction<{ id: number | string; message: string }>) => {
        state.courses = state.courses.filter(c => c.id !== action.payload.id);
        state.status = 'succeeded';
      })
      .addCase(publishCourse.fulfilled, (state, action: PayloadAction<number | string>) => {
        if (state.currentCourse && String(state.currentCourse.id) === String(action.payload)) {
          state.currentCourse.is_published = true;
          state.currentCourse.has_unpublished_changes = false;
          // Clear draft/changes status on all children instantly
          state.currentCourse.modules.forEach(m => {
            m.has_unpublished_changes = false;
            m.sections.forEach(s => {
              s.has_unpublished_changes = false;
              s.contents?.forEach(c => {
                c.has_unpublished_changes = false;
              });
            });
          });
        }
        state.status = 'succeeded';
      })
      .addCase(publishCourseChanges.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
      })
      .addCase(publishCourseChanges.fulfilled, (state, action: PayloadAction<{ id: number | string; message: string }>) => {
        if (state.currentCourse && String(state.currentCourse.id) === String(action.payload.id)) {
          state.currentCourse.has_unpublished_changes = false;
          // Clear draft/changes status on all children instantly
          state.currentCourse.modules.forEach(m => {
            m.has_unpublished_changes = false;
            m.sections.forEach(s => {
              s.has_unpublished_changes = false;
              s.contents?.forEach(c => {
                c.has_unpublished_changes = false;
              });
            });
          });
        }
        state.isLoading = false;
        state.status = 'succeeded';
      })
      .addCase(publishCourseChanges.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      // Modules
      .addCase(createModule.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          state.currentCourse.modules.push(action.payload.data);
          state.currentCourse.has_unpublished_changes = true;
        }
      })
      .addCase(updateModule.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          const index = state.currentCourse.modules.findIndex(m => String(m.id) === String(action.payload.data.id));
          if (index !== -1) state.currentCourse.modules[index] = action.payload.data;
          state.currentCourse.has_unpublished_changes = true;
        }
      })
      .addCase(deleteModule.fulfilled, (state, action: PayloadAction<{ moduleId: number | string; hardDeleted?: boolean }>) => {
        if (state.currentCourse) {
          if (action.payload.hardDeleted) {
            state.currentCourse.modules = state.currentCourse.modules.filter(m => String(m.id) !== String(action.payload.moduleId));
          } else {
            const module = state.currentCourse.modules.find(m => String(m.id) === String(action.payload.moduleId));
            if (module) {
              module.pending_delete = true;
              module.has_unpublished_changes = true;
              state.currentCourse.has_unpublished_changes = true;
            }
          }
        }
      })
      .addCase(createSection.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          const module = state.currentCourse.modules.find(m => String(m.id) === String(action.payload.data.module));
          if (module) {
            module.sections.push(action.payload.data);
            module.has_unpublished_changes = true;
            state.currentCourse.has_unpublished_changes = true;
          }
        }
      })
      .addCase(updateSection.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          const module = state.currentCourse.modules.find(m => String(m.id) === String(action.payload.data.module));
          if (module) {
            const index = module.sections.findIndex(s => String(s.id) === String(action.payload.data.id));
            if (index !== -1) module.sections[index] = action.payload.data;
            module.has_unpublished_changes = true;
            state.currentCourse.has_unpublished_changes = true;
          }
        }
      })
      .addCase(deleteSection.fulfilled, (state, action: PayloadAction<{ sectionId: number | string; hardDeleted?: boolean }>) => {
        if (state.currentCourse) {
          state.currentCourse.modules.forEach(m => {
            if (action.payload.hardDeleted) {
              m.sections = m.sections.filter(s => String(s.id) !== String(action.payload.sectionId));
            } else {
              const section = m.sections.find(s => String(s.id) === String(action.payload.sectionId));
              if (section) {
                section.pending_delete = true;
                section.has_unpublished_changes = true;
                m.has_unpublished_changes = true;
                state.currentCourse!.has_unpublished_changes = true;
              }
            }
          });
        }
      })
      .addCase(createContent.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          const content = action.payload.data;
          const sectionId = action.payload._sectionId;
          state.currentCourse.modules.forEach(m => {
            const section = m.sections.find(s => String(s.id) === String(sectionId));
            if (section) {
              if (!section.contents) section.contents = [];
              section.contents.push(content);
              section.has_unpublished_changes = true;
              m.has_unpublished_changes = true;
              state.currentCourse!.has_unpublished_changes = true;
            }
          });
        }
      })
      .addCase(updateContent.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentCourse) {
          const content = action.payload.data;
          const sectionId = action.payload._sectionId;
          state.currentCourse.modules.forEach(m => {
            const section = m.sections.find(s => String(s.id) === String(sectionId));
            if (section) {
              const idx = section.contents.findIndex(c => String(c.id) === String(content.id));
              if (idx !== -1) section.contents[idx] = content;
              section.has_unpublished_changes = true;
              m.has_unpublished_changes = true;
              state.currentCourse!.has_unpublished_changes = true;
            }
          });
        }
      })
      .addCase(deleteContent.fulfilled, (state, action: PayloadAction<{ contentId: number | string; hardDeleted?: boolean }>) => {
        if (state.currentCourse) {
          state.currentCourse.modules.forEach(m => {
            m.sections.forEach(s => {
              if (action.payload.hardDeleted) {
                s.contents = s.contents.filter(c => String(c.id) !== String(action.payload.contentId));
              } else {
                const content = s.contents.find(c => String(c.id) === String(action.payload.contentId));
                if (content) {
                  content.pending_delete = true;
                  content.has_unpublished_changes = true;
                  s.has_unpublished_changes = true;
                  m.has_unpublished_changes = true;
                  state.currentCourse!.has_unpublished_changes = true;
                }
              }
            });
          });
        }
      })
      // Metadata
      .addCase(fetchLevels.fulfilled, (state, action: PayloadAction<Level[]>) => { state.levels = action.payload; })
      .addCase(fetchCategories.fulfilled, (state, action: PayloadAction<Category[]>) => { state.categories = action.payload; });
  },
});

export const { clearCurrentCourse, resetStatus, } = courseSlice.actions;
export default courseSlice.reducer;
