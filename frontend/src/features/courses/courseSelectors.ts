import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import { Course, Category, Level } from './types';

export const selectCourseState = (state: RootState) => state.courses;

// Select all courses
export const selectAllCourses = createSelector(
  [selectCourseState],
  (courseState): Course[] => courseState.courses
);

// Select loading status
export const selectCoursesLoading = createSelector(
  [selectCourseState],
  (courseState): boolean => courseState.isLoading
);

// Select error
export const selectCoursesError = createSelector(
  [selectCourseState],
  (courseState): string | null => courseState.error
);

// Select status ('idle', 'loading', etc)
export const selectCoursesStatus = createSelector(
  [selectCourseState],
  (courseState): 'idle' | 'loading' | 'succeeded' | 'failed' => courseState.status
);

// Select categories
export const selectCourseCategories = createSelector(
  [selectCourseState],
  (courseState): Category[] => courseState.categories
);

// Select levels
export const selectCourseLevels = createSelector(
  [selectCourseState],
  (courseState): Level[] => courseState.levels
);

// Parameterized selector to get a course by ID
export const selectCourseById = (state: RootState, courseId: number | null) => {
  if (!courseId) return null;
  return state.courses.courses.find((course) => course.id === courseId) || null;
};

// Parameterized selector to check for unpublished changes
export const selectHasUnpublishedChanges = (state: RootState, courseId: number | null) => {
  if (!courseId) return false;
  return state.courses.unpublishedChanges[courseId] || false;
};
