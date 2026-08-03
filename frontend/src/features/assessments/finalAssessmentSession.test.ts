/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAssessmentSessionData,
  getAssessmentSessionKey,
  loadAssessmentSessionData,
} from './finalAssessmentSession';

describe('final assessment session helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates an attempt-scoped storage key', () => {
    expect(getAssessmentSessionKey(7, 2)).toBe('final-assessment-session-7-2');
  });

  it('clears stale session data when starting a new attempt', () => {
    window.localStorage.setItem('final-assessment-session-7', 'stale');
    window.localStorage.setItem('final-assessment-session-7-2', 'fresh');

    clearAssessmentSessionData(7, 2);

    expect(window.localStorage.getItem('final-assessment-session-7')).toBeNull();
    expect(window.localStorage.getItem('final-assessment-session-7-2')).toBeNull();
  });

  it('does not restore a session that belongs to a different attempt', () => {
    window.localStorage.setItem('final-assessment-session-7-1', JSON.stringify({ attemptId: 1 }));

    expect(loadAssessmentSessionData(7, 2)).toBeNull();
  });
});
