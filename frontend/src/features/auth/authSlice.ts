import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import authAPI from './authAPI';
import { User, SignupData, LoginCredentials, ResetPasswordData, ErrorResponse, LoginResponseData } from './types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const extractErrorMessage = (errorData: ErrorResponse | string | unknown): string => {
  if (typeof errorData === 'string') return errorData;
  if (!errorData) return 'An unknown error occurred';
  
  const err = errorData as ErrorResponse;
  
  // DRF returns { non_field_errors: [...] }
  if (err.non_field_errors && Array.isArray(err.non_field_errors)) {
    return err.non_field_errors[0];
  }
  
  // Handle other field errors
  if (typeof err === 'object') {
    const firstKey = Object.keys(err)[0];
    const firstValue = err[firstKey];
    if (Array.isArray(firstValue)) {
      return `${firstKey}: ${firstValue[0]}`;
    }
    if (typeof firstValue === 'string') {
      return firstValue;
    }
    return JSON.stringify(err);
  }
  
  return String(errorData);
};

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem('e-learning-user') || 'null'),
  accessToken: localStorage.getItem('e-learning-access_token'),
  refreshToken: localStorage.getItem('e-learning-refresh_token'),
  isLoading: false,
  error: null,
  status: 'idle',
};

export const signup = createAsyncThunk<any, SignupData>(
  'auth/signup',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authAPI.signup(userData);
      return response;
    } catch (error: any) {
      const message = extractErrorMessage(error.response?.data?.message || error.response?.data || error.message);
      return rejectWithValue(message || 'Signup failed');
    }
  }
);

export const login = createAsyncThunk<LoginResponseData, LoginCredentials>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      if (response.success === "True") {
        const { user, access, refresh } = response.data;
        localStorage.setItem('e-learning-user', JSON.stringify(user));
        localStorage.setItem('e-learning-access_token', access);
        localStorage.setItem('e-learning-refresh_token', refresh);
        return { user, access, refresh };
      }
      const message = extractErrorMessage(response.message || 'Login failed');
      return rejectWithValue(message);
    } catch (error: any) {
      const message = extractErrorMessage(error.response?.data?.message || error.response?.data || error.message);
      return rejectWithValue(message || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk<null, void>(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (state.auth.refreshToken) {
        await authAPI.logout(state.auth.refreshToken);
      }
      localStorage.removeItem('e-learning-user');
      localStorage.removeItem('e-learning-access_token');
      localStorage.removeItem('e-learning-refresh_token');
      return null;
    } catch (error: any) {
      localStorage.removeItem('e-learning-user');
      localStorage.removeItem('e-learning-access_token');
      localStorage.removeItem('e-learning-refresh_token');
      return rejectWithValue(error.response?.data?.message || 'Logout error');
    }
  }
);

export const forgotPassword = createAsyncThunk<any, string>(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authAPI.forgotPassword(email);
      return response;
    } catch (error: any) {
      const message = extractErrorMessage(error.response?.data?.message || error.response?.data || error.message);
      return rejectWithValue(message || 'Forgot password request failed');
    }
  }
);

export const verifyEmail = createAsyncThunk<any, { uid: string; token: string }>(
  'auth/verifyEmail',
  async ({ uid, token }, { rejectWithValue }) => {
    try {
      const response = await authAPI.verifyEmail(uid, token);
      return response;
    } catch (error: any) {
      const message = extractErrorMessage(error.response?.data?.message || error.response?.data || error.message);
      return rejectWithValue(message || 'Verification failed');
    }
  }
);

export const resetPassword = createAsyncThunk<any, { uid: string; token: string; data: ResetPasswordData }>(
  'auth/resetPassword',
  async ({ uid, token, data }, { rejectWithValue }) => {
    try {
      const response = await authAPI.resetPassword(uid, token, data);
      return response;
    } catch (error: any) {
      const message = extractErrorMessage(error.response?.data?.message || error.response?.data || error.message);
      return rejectWithValue(message || 'Password reset failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetStatus: (state) => {
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(signup.fulfilled, (state) => {
        state.isLoading = false;
        state.status = 'succeeded';
      })
      .addCase(signup.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<LoginResponseData>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.accessToken = action.payload.access;
        state.refreshToken = action.payload.refresh;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.status = 'idle';
      })
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.status = 'succeeded';
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.isLoading = false;
        state.status = 'succeeded';
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.status = 'succeeded';
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetStatus } = authSlice.actions;
export default authSlice.reducer;
