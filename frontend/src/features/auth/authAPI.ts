import api from '../../services/api';
import { SignupData, LoginCredentials, ResetPasswordData, AuthResponse, LoginResponseData, SignupResponseData } from './types';

const authAPI = {
  signup: async (userData: SignupData): Promise<AuthResponse<SignupResponseData>> => {
    const response = await api.post<AuthResponse<SignupResponseData>>('auth/signup/', userData);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse<LoginResponseData>> => {
    const response = await api.post<AuthResponse<LoginResponseData>>('auth/login/', credentials);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<AuthResponse<null>> => {
    const response = await api.post<AuthResponse<null>>('auth/logout/', { refresh: refreshToken });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<AuthResponse<null>> => {
    const response = await api.post<AuthResponse<null>>('auth/forgot-password/', { email });
    return response.data;
  },

  verifyEmail: async (uid: string, token: string): Promise<AuthResponse<null>> => {
    const response = await api.get<AuthResponse<null>>(`auth/verify-email/${uid}/${token}/`);
    return response.data;
  },

  resetPassword: async (uid: string, token: string, data: ResetPasswordData): Promise<AuthResponse<null>> => {
    const response = await api.post<AuthResponse<null>>(`auth/reset-password/${uid}/${token}/`, data);
    return response.data;
  },
};

export default authAPI;
