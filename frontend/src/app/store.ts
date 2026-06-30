import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import courseReducer from '../features/courses/courseSlice';
import enrollmentReducer from '../features/enrollments/enrollmentSlice';
import progressReducer from '../features/progress/progressSlice';
import assessmentReducer from '../features/assessments/assessmentSlice';
import certificateReducer from '../features/certificates/certificateSlice';
import rbacReducer from '../features/rbac/rbacSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: courseReducer,
    enrollments: enrollmentReducer,
    progress: progressReducer,
    assessments: assessmentReducer,
    certificates: certificateReducer,
    rbac: rbacReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
