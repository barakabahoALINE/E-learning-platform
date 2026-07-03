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

  // Download the generated certificate file. Returns either a blob (file) or a redirect URL
  downloadCertificateFile: async (certificateId: number | string): Promise<{ blob?: Blob; filename?: string; redirectUrl?: string }> => {
    const response = await api.get(`certificates/${certificateId}/download/`, { responseType: 'blob' as const });
    const contentType = response.headers['content-type'] || '';

    // If server returned JSON (e.g., { download_url: '...' }) as blob, parse and return redirectUrl
    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      try {
        const parsed = JSON.parse(text);
        const redirectUrl = parsed?.data?.download_url || parsed?.download_url;
        return { redirectUrl };
      } catch (err) {
        throw new Error('Invalid JSON response from download endpoint');
      }
    }

    // Otherwise assume binary (PDF) and extract filename if provided
    const disposition = response.headers['content-disposition'] || response.headers['Content-Disposition'] || '';
    let filename = `certificate-${certificateId}.pdf`;
    const filenameMatch = /filename\*?=(?:UTF-8'')?"?([^;\"]+)"?/i.exec(disposition);
    if (filenameMatch && filenameMatch[1]) {
      filename = decodeURIComponent(filenameMatch[1]);
    }

    return { blob: response.data as Blob, filename };
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
