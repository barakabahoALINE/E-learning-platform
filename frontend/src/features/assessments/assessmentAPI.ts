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

  deleteAssessment: async (assessmentId: number | string) => {
    const response = await api.delete('/assessments/create/', { data: { assessment_id: assessmentId } });
    return response.data;
  }
};

export default assessmentAPI;
