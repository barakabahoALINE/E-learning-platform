export const getAssessmentSessionKey = (courseId: string | number, attemptId: number | null) => {
  if (attemptId === null || attemptId === undefined) {
    return `final-assessment-session-${courseId}`;
  }

  return `final-assessment-session-${courseId}-${attemptId}`;
};

export const clearAssessmentSessionData = (courseId: string | number, attemptId: number | null) => {
  const currentKey = getAssessmentSessionKey(courseId, attemptId);
  const legacyKey = `final-assessment-session-${courseId}`;

  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(currentKey);
  window.localStorage.removeItem(legacyKey);
};

export const loadAssessmentSessionData = (courseId: string | number, attemptId: number | null) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = getAssessmentSessionKey(courseId, attemptId);
  const storedSession = window.localStorage.getItem(key);

  if (!storedSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedSession);
    if (parsed?.attemptId != null && Number(parsed.attemptId) !== Number(attemptId)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

export const saveAssessmentSessionData = (
  courseId: string | number,
  attemptId: number | null,
  payload: Record<string, unknown>
) => {
  if (typeof window === 'undefined') {
    return;
  }

  const key = getAssessmentSessionKey(courseId, attemptId);
  const data = {
    ...payload,
    attemptId: attemptId ?? null,
  };

  window.localStorage.setItem(key, JSON.stringify(data));
};
