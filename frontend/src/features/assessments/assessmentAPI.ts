import api from '../../services/api';
import { 
  AssessmentCreateData, 
  QuestionCreateData 
} from './types';

const assessmentAPI = {
  createAssessment: async (data: AssessmentCreateData) => {
    const response = await api.post('/assessments/create/', data);
    return response.data;
  },

  createQuestion: async (data: QuestionCreateData) => {
    const response = await api.post('/assessments/questions/create/', data);
    return response.data;
  },

  updateQuestion: async (questionId: number | string, data: Partial<QuestionCreateData>) => {
    const response = await api.put(`/assessments/questions/${questionId}/update/`, data);
    return response.data;
  },

  deleteQuestion: async (questionId: number | string) => {
    const response = await api.delete(`/assessments/questions/${questionId}/delete/`);
    return response.data;
  },

  fetchAssessmentQuestions: async (assessmentId: number | string) => {
    const response = await api.get(`/assessments/${assessmentId}/questions/`);
    return response.data;
  },

  startAssessment: async (assessmentId: number | string) => {
    const response = await api.get(`/assessments/${assessmentId}/start/`);
    return response.data;
  },

  startAttempt: async (assessmentId: number | string) => {
    const response = await api.post(`/assessments/${assessmentId}/start-attempt/`);
    return response.data;
  },

  fetchAttemptDetails: async (attemptId: number | string) => {
    const response = await api.get(`/assessments/attempt-details/${attemptId}/`);
    return response.data;
  },

  lockAttempt: async (attemptId: number | string) => {
    const response = await api.post(`/assessments/lock-attempt/${attemptId}/`);
    return response.data;
  },

  unlockAttempt: async (attemptId: number | string) => {
    const response = await api.post(`/assessments/admin/unlock-attempt/${attemptId}/`);
    return response.data;
  },

  saveAnswer: async (data: { attempt_id: number | string; question_id: number | string; selected_choices?: Array<number | string>; text_answer?: string }) => {
    const response = await api.post('/assessments/attempts/save-answer/', data);
    return response.data;
  },

  submitAttempt: async (attemptId: number | string) => {
    const response = await api.post(`/assessments/attempts/${attemptId}/submit/`);
    return response.data;
  },

  fetchResult: async (attemptId: number | string) => {
    const response = await api.get(`/assessments/attempts/${attemptId}/result/`);
    return response.data;
  },

  deleteAssessment: async (assessmentId: number | string) => {
    const response = await api.delete('/assessments/create/', { data: { assessment_id: assessmentId } });
    return response.data;
  },

  updateAssessmentSettings: async (assessmentId: number | string, data: { duration?: number; max_attempts?: number; pass_mark?: number; instructions?: string }) => {
    const response = await api.patch('/assessments/create/', { assessment_id: assessmentId, ...data });
    return response.data;
  },
};

export default assessmentAPI;
