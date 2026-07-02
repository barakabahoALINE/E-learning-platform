import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import certificateAPI from './certificateAPI';
import { Certificate, CertificateClaimResponse, FeedbackCreateData } from './types';

interface CertificateClaimState {
  loading: boolean;
  error: string | null;
  eligible: boolean | null;
  certificateExists: boolean | null;
  certificate: Certificate | null;
}

interface CertificateFeedbackState {
  loading: boolean;
  error: string | null;
  submitted: boolean;
  certificate: Certificate | null;
}

interface CertificateState {
  claim: CertificateClaimState;
  feedback: CertificateFeedbackState;
}

const initialState: CertificateState = {
  claim: {
    loading: false,
    error: null,
    eligible: null,
    certificateExists: null,
    certificate: null,
  },
  feedback: {
    loading: false,
    error: null,
    submitted: false,
    certificate: null,
  },
};

export const claimCertificate = createAsyncThunk<
  CertificateClaimResponse,
  number,
  { rejectValue: string }
>('certificates/claimCertificate', async (courseId, { rejectWithValue }) => {
  try {
    return await certificateAPI.claimCertificate(courseId);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.response?.data || error.message || 'Failed to load certificate claim status');
  }
});

export const submitCertificateFeedback = createAsyncThunk<
  Certificate,
  { courseId: number; payload: FeedbackCreateData },
  { rejectValue: string }
>('certificates/submitCertificateFeedback', async ({ courseId, payload }, { rejectWithValue }) => {
  try {
    return await certificateAPI.submitFeedback(courseId, payload);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || error.response?.data || error.message || 'Failed to submit feedback');
  }
});

const certificateSlice = createSlice({
  name: 'certificates',
  initialState,
  reducers: {
    resetCertificateState: (state) => {
      state.claim = { ...initialState.claim };
      state.feedback = { ...initialState.feedback };
    },
    clearCertificateClaim: (state) => {
      state.claim = { ...initialState.claim };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(claimCertificate.pending, (state) => {
        state.claim.loading = true;
        state.claim.error = null;
      })
      .addCase(claimCertificate.fulfilled, (state, action: PayloadAction<CertificateClaimResponse>) => {
        state.claim.loading = false;
        state.claim.error = null;
        state.claim.eligible = action.payload.eligible;
        state.claim.certificateExists = action.payload.certificate_exists;
        state.claim.certificate = action.payload.certificate || null;
      })
      .addCase(claimCertificate.rejected, (state, action) => {
        state.claim.loading = false;
        state.claim.error = action.payload as string;
      })
      .addCase(submitCertificateFeedback.pending, (state) => {
        state.feedback.loading = true;
        state.feedback.error = null;
      })
      .addCase(submitCertificateFeedback.fulfilled, (state, action: PayloadAction<Certificate>) => {
        state.feedback.loading = false;
        state.feedback.submitted = true;
        state.feedback.certificate = action.payload;
        state.claim.certificateExists = true;
        state.claim.certificate = action.payload;
      })
      .addCase(submitCertificateFeedback.rejected, (state, action) => {
        state.feedback.loading = false;
        state.feedback.error = action.payload as string;
      });
  },
});

export const { resetCertificateState, clearCertificateClaim } = certificateSlice.actions;
export default certificateSlice.reducer;
