import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import courseAPI from '../courses/courseAPI';
import { Enrollment } from '../courses/types';

interface EnrollmentState {
  myEnrollments: Enrollment[];
  loading: boolean;
  error: string | null;
}

const initialState: EnrollmentState = {
  myEnrollments: [],
  loading: false,
  error: null,
};

export const fetchMyEnrollments = createAsyncThunk(
  'enrollments/fetchMyEnrollments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await courseAPI.fetchMyEnrollments();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch enrollments');
    }
  }
);

export const enrollInCourse = createAsyncThunk(
  'enrollments/enrollInCourse',
  async (courseId: number, { rejectWithValue }) => {
    try {
      const response = await courseAPI.enrollInCourse(courseId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to enroll in course');
    }
  }
);

const enrollmentSlice = createSlice({
  name: 'enrollments',
  initialState,
  reducers: {
    clearEnrollmentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Enrollments
      .addCase(fetchMyEnrollments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyEnrollments.fulfilled, (state, action) => {
        state.loading = false;
        state.myEnrollments = action.payload;
      })
      .addCase(fetchMyEnrollments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Enroll in Course
      .addCase(enrollInCourse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enrollInCourse.fulfilled, (state, action) => {
        state.loading = false;
        state.myEnrollments.push(action.payload);
      })
      .addCase(enrollInCourse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearEnrollmentError } = enrollmentSlice.actions;
export default enrollmentSlice.reducer;
