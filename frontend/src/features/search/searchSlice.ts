import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Course, Category, Level } from '../courses/types';
import { fetchCategories, fetchCourses, fetchLevels } from '../courses/courseSlice';
import type { RootState } from '../../app/store';
import { searchCourses as searchCoursesInMemory } from './searchService';

interface SearchState {
  query: string;
  suggestions: Course[];
  results: Course[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  recentQueries: string[];
}

const initialState: SearchState = {
  query: '',
  suggestions: [],
  results: [],
  status: 'idle',
  error: null,
  recentQueries: [],
};

export const runGlobalSearch = createAsyncThunk<
  Course[],
  string,
  { state: RootState }
>('search/runGlobalSearch', async (query, { dispatch, getState, rejectWithValue }) => {
  try {
    const normalizedQuery = query.trim();
    const courseState = getState().courses;
    let courses = courseState.courses;
    let categories = courseState.categories;
    let levels = courseState.levels;

    if (courses.length === 0) {
      courses = await dispatch(fetchCourses(false)).unwrap();
    }
    if (categories.length === 0) {
      categories = await dispatch(fetchCategories()).unwrap();
    }
    if (levels.length === 0) {
      levels = await dispatch(fetchLevels()).unwrap();
    }

    if (!normalizedQuery) {
      return [];
    }

    return searchCoursesInMemory(courses, categories, levels, normalizedQuery, 20);
  } catch (error: any) {
    return rejectWithValue(error?.message || 'Failed to run global search');
  }
});

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    clearSearchQuery: (state) => {
      state.query = '';
      state.suggestions = [];
      state.results = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runGlobalSearch.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(runGlobalSearch.fulfilled, (state, action) => {
        if (action.meta.arg !== state.query.trim()) {
          return;
        }
        state.status = 'succeeded';
        state.results = action.payload;
        state.suggestions = action.payload.slice(0, 6);
        state.error = null;
        const queryText = state.query.trim();
        if (queryText && !state.recentQueries.includes(queryText)) {
          state.recentQueries = [queryText, ...state.recentQueries].slice(0, 8);
        }
      })
      .addCase(runGlobalSearch.rejected, (state, action) => {
        if (action.meta.arg !== state.query.trim()) {
          return;
        }
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { setSearchQuery, clearSearchQuery } = searchSlice.actions;
export default searchSlice.reducer;
