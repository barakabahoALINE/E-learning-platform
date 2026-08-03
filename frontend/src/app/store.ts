import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import courseReducer from '../features/courses/courseSlice';
import enrollmentReducer from '../features/enrollments/enrollmentSlice';
import progressReducer from '../features/progress/progressSlice';
import assessmentReducer from '../features/assessments/assessmentSlice';
import certificateReducer from '../features/certificates/certificateSlice';
import rbacReducer from '../features/rbac/rbacSlice';
<<<<<<< HEAD
import searchReducer from '../features/search/searchSlice';
=======
import communityReducer from '../features/community/communitySlice';
>>>>>>> 064c8da (communityapp)

export const store = configureStore({
  reducer: {
    auth: authReducer,
    courses: courseReducer,
    enrollments: enrollmentReducer,
    progress: progressReducer,
    assessments: assessmentReducer,
    certificates: certificateReducer,
    rbac: rbacReducer,
<<<<<<< HEAD
    search: searchReducer,
=======
    community: communityReducer,
>>>>>>> 064c8da (communityapp)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
