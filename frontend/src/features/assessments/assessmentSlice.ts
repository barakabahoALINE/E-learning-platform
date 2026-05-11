import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import assessmentAPI from './assessmentAPI';
import { 
  Assessment, 
  AssessmentCreateData, 
  QuestionCreateData 
} from './types';

interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AssessmentState = {
  assessments: [],
  currentAssessment: null,
  isLoading: false,
  error: null,
  status: 'idle',
};

export const createAssessment = createAsyncThunk(
  'assessments/createAssessment',
  async (data: AssessmentCreateData, { rejectWithValue }) => {
    try {
      return await assessmentAPI.createAssessment(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create assessment');
    }
  }
);

export const addQuestion = createAsyncThunk(
  'assessments/addQuestion',
  async (data: QuestionCreateData, { rejectWithValue }) => {
    try {
      return await assessmentAPI.createQuestion(data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.errors || 'Failed to add question');
    }
  }
);

export const updateQuestion = createAsyncThunk(
  'assessments/updateQuestion',
  async ({ questionId, data }: { questionId: number | string; data: Partial<QuestionCreateData> }, { rejectWithValue }) => {
    try {
      return await assessmentAPI.updateQuestion(questionId, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.errors || 'Failed to update question');
    }
  }
);

export const deleteQuestionAction = createAsyncThunk(
  'assessments/deleteQuestion',
  async (questionId: number | string, { rejectWithValue }) => {
    try {
      return await assessmentAPI.deleteQuestion(questionId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete question');
    }
  }
);

export const deleteAssessmentAction = createAsyncThunk(
  'assessments/deleteAssessment',
  async (assessmentId: number | string, { rejectWithValue }) => {
    try {
      return await assessmentAPI.deleteAssessment(assessmentId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete assessment');
    }
  }
);

export const fetchAssessmentQuestions = createAsyncThunk(
  'assessments/fetchQuestions',
  async (assessmentId: number | string, { rejectWithValue }) => {
    try {
      return await assessmentAPI.fetchAssessmentQuestions(assessmentId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch questions');
    }
  }
);

const assessmentSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {
    clearCurrentAssessment: (state) => {
      state.currentAssessment = null;
    },
    resetAssessmentStatus: (state) => {
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createAssessment.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
      })
      .addCase(createAssessment.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.assessments.push(action.payload.data);
        state.currentAssessment = action.payload.data;
      })
      .addCase(createAssessment.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(addQuestion.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentAssessment) {
          if (!state.currentAssessment.questions) {
            state.currentAssessment.questions = [];
          }
          state.currentAssessment.questions.push(action.payload.data);
        }
        state.status = 'succeeded';
      })
      .addCase(fetchAssessmentQuestions.fulfilled, (state, action: PayloadAction<any>) => {
        if (state.currentAssessment) {
          state.currentAssessment.questions = action.payload.data;
        }
        state.isLoading = false;
      });
  },
});

export const { clearCurrentAssessment, resetAssessmentStatus } = assessmentSlice.actions;
export default assessmentSlice.reducer;
