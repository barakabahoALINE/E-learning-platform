import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import courseReducer from '../features/courses/courseSlice';
import lessonReducer from '../features/courses/lessonSlice';
import enrollmentReducer from '../features/enrollments/enrollmentSlice';
import progressReducer from '../features/progress/progressSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: courseReducer,
    lessons: lessonReducer,
    enrollments: enrollmentReducer,
    progress: progressReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
