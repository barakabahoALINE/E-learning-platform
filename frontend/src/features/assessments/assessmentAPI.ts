import api from '../../services/api';
import { 
  AssessmentCreateData, 
  QuestionCreateData 
} from './types';

const assessmentAPI = {
  createAssessment: async (data: AssessmentCreateData) => {
    const response = await api.post('assessments/create/', data);
    return response.data;
  },

  listAssessments: async (params?: { assessment_type?: string; course_id?: number | string; module_id?: number | string; unassigned?: boolean }) => {
    const query = new URLSearchParams();
    if (params) {
      if (params.assessment_type) query.append('assessment_type', params.assessment_type);
      if (params.course_id !== undefined && params.course_id !== null) query.append('course_id', String(params.course_id));
      if (params.module_id !== undefined && params.module_id !== null) query.append('module_id', String(params.module_id));
      if (params.unassigned) query.append('unassigned', 'true');
    }
    const response = await api.get(`assessments/list/${query.toString() ? `?${query.toString()}` : ''}`);
    return response.data;
  },

  createQuestion: async (data: QuestionCreateData) => {
    const response = await api.post('assessments/questions/create/', data);
    return response.data;
  },

  updateQuestion: async (questionId: number | string, data: Partial<QuestionCreateData>) => {
    const response = await api.put(`assessments/questions/${questionId}/update/`, data);
    return response.data;
  },

  deleteQuestion: async (questionId: number | string) => {
    const response = await api.delete(`assessments/questions/${questionId}/delete/`);
    return response.data;
  },

  fetchAssessmentQuestions: async (assessmentId: number | string) => {
    const response = await api.get(`assessments/${assessmentId}/questions/`);
    return response.data;
  },

  startAssessment: async (assessmentId: number | string, courseId?: number | string) => {
    const response = await api.get(`assessments/${assessmentId}/start/`, {
      params: courseId !== undefined && courseId !== null ? { course_id: courseId } : {},
    });
    return response.data;
  },

  startAttempt: async (assessmentId: number | string, courseId?: number | string) => {
    const response = await api.post(`assessments/${assessmentId}/start-attempt/`, courseId !== undefined && courseId !== null ? { course_id: courseId } : {});
    return response.data;
  },

  tabSwitchEvent: async (attemptId: number | string) => {
    const response = await api.post(`assessments/attempts/tab-switch/`, { attempt_id: attemptId });
    return response.data;
  },

  fetchAttemptDetails: async (attemptId: number | string) => {
    const response = await api.get(`assessments/attempt-details/${attemptId}/`);
    return response.data;
  },

  lockAttempt: async (attemptId: number | string) => {
    const response = await api.post(`assessments/lock-attempt/${attemptId}/`);
    return response.data;
  },

  unlockAttempt: async (attemptId: number | string) => {
    const response = await api.post(`assessments/admin/unlock-attempt/${attemptId}/`);
    return response.data;
  },

  saveAnswer: async (data: { attempt_id: number | string; question_id: number | string; selected_choices?: Array<number | string>; matching_pairs?: Array<{ left: string; right: string }>; text_answer?: string }) => {
    const response = await api.post('assessments/attempts/save-answer/', data);
    return response.data;
  },

  submitAttempt: async (attemptId: number | string) => {
    const response = await api.post(`assessments/attempts/${attemptId}/submit/`);
    return response.data;
  },

  fetchResult: async (attemptId: number | string) => {
    const response = await api.get(`assessments/attempts/${attemptId}/result/`);
    return response.data;
  },

  deleteAssessment: async (assessmentId: number | string) => {
    const response = await api.delete(`assessments/${assessmentId}/delete/`);
    return response.data;
  },

  updateAssessmentSettings: async (
    assessmentId: number | string,
    data: { duration?: number; max_attempts?: number; pass_mark?: number; instructions?: string; tab_switch_enabled?: boolean; tab_switch_limit?: number }
  ) => {
    const response = await api.patch(`assessments/${assessmentId}/update/`, data);
    return response.data;
  },

  fetchAssessmentDetail: async (assessmentId: number | string) => {
    const response = await api.get(`assessments/${assessmentId}/`);
    return response.data.data || response.data;
  },

  attachAssessment: async (
    assessmentId: number | string,
    payload: { module_id?: number | string; course_id?: number | string; module_ids?: Array<number | string>; course_ids?: Array<number | string> }
  ) => {
    const response = await api.post(`assessments/${assessmentId}/attach/`, payload);
    return response.data;
  },

  detachAssessment: async (assessmentId: number | string, payload?: { module_id?: number | string; course_id?: number | string }) => {
    const response = await api.post(`assessments/${assessmentId}/detach/`, payload || {});
    return response.data;
  },
};

export default assessmentAPI;
