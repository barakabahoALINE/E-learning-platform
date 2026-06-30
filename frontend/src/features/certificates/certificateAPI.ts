import api from '../../services/api';
import { CertificateClaimResponse, FeedbackCreateData, Certificate } from './types';

const certificateAPI = {
  claimCertificate: async (courseId: number | string): Promise<CertificateClaimResponse> => {
    const response = await api.get(`certificates/claim/${courseId}/`);
    return response.data.data;
  },

  submitFeedback: async (courseId: number | string, payload: FeedbackCreateData): Promise<Certificate> => {
    const response = await api.post(`certificates/feedback/${courseId}/`, payload);
    return response.data.data;
  },

  downloadCertificate: async (certificateId: number | string): Promise<string> => {
    const response = await api.get(`certificates/${certificateId}/download/`);
    return response.data.data?.download_url || response.data.download_url;
  },

  shareCertificate: async (certificateId: number | string, accessToken: string): Promise<Certificate> => {
    const response = await api.post(`certificates/${certificateId}/share/`, {
      platform: 'linkedin',
      access_token: accessToken,
    });
    return response.data.data;
  },
};

export default certificateAPI;
