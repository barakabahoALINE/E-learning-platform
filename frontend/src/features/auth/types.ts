export interface User {
  id?: number;
  email: string;
  full_name: string;
  institution: string;
  role?: string;
  groups?: string[];
  permissions?: string[];
  is_superuser?: boolean;
  avatar?: string;
  profile_picture?: string | null;
}

export interface SignupData {
  full_name: string;
  email: string;
  institution: string;
  password?: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface ResetPasswordData {
  new_password?: string;
  confirm_new_password?: string;
  [key: string]: string | undefined;
}

export interface CreatePasswordData {
  uidb64: string;
  token: string;
  password: string;
  confirm_password: string;
}

export interface AuthResponse<T = unknown> {
  success: string | boolean;
  message?: string;
  data: T;
}

export interface LoginResponseData {
  user: User;
  access: string;
  refresh: string;
}

export interface UpdateNameResponseData {
  full_name: string;
}

export interface UpdateProfilePictureResponseData {
  profile_picture: string;
}

export interface ErrorResponse {
  message?: string;
  non_field_errors?: string[];
  [key: string]: string | string[] | unknown;
}

export interface SignupResponseData {
  status: string;
  message: string;
  user: User;
}
