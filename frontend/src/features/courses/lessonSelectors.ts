import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export const selectLessonState = (state: RootState) => state.lessons;

export const selectAllLessons = createSelector(
  [selectLessonState],
  (lessonState) => lessonState.lessons
);

export const selectLessonContents = (state: RootState, lessonId: number) => 
  state.lessons.contents[lessonId] || [];

export const selectLessonsLoading = createSelector(
  [selectLessonState],
  (lessonState) => lessonState.isLoading
);
