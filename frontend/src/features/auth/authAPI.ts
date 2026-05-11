import api from '../../services/api';
import {
  SignupData,
  LoginCredentials,
  ResetPasswordData,
  AuthResponse,
  LoginResponseData,
  SignupResponseData,
  UpdateNameResponseData,
  UpdateProfilePictureResponseData,
} from './types';

const authAPI = {
  signup: async (userData: SignupData): Promise<AuthResponse<SignupResponseData>> => {
    const response = await api.post<AuthResponse<SignupResponseData>>('auth/signup/', userData);
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse<LoginResponseData>> => {
    const response = await api.post<AuthResponse<LoginResponseData>>('auth/login/', credentials);
    return response.data;
  },

  googleLogin: async (token: string): Promise<AuthResponse<LoginResponseData>> => {
    const response = await api.post<AuthResponse<LoginResponseData>>('auth/google-login/', { token });
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

  updateName: async (fullName: string): Promise<{ status: string; message: string; data: UpdateNameResponseData }> => {
    const response = await api.patch('auth/profile/update-name/', { full_name: fullName });
    return response.data;
  },

  updateProfilePicture: async (file: File): Promise<{ status: string; message: string; data: UpdateProfilePictureResponseData }> => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    const response = await api.patch('auth/profile/update-picture/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default authAPI;
