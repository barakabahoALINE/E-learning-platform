import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import communityAPI, {
  CommunityDiscussionResponse,
  CommunityReplyResponse,
  CommunityLikeResponse,
  LikeItemType,
} from './communityAPI';
import {
  CommunityDiscussion,
  CommunityReply,
  CommunityLike,
} from './types';

interface CommunityState {
  discussions: CommunityDiscussion[];
  discussionById: Record<string, CommunityDiscussion | undefined>;
  replies: CommunityReply[];
  likes: CommunityLike[];
  isLoading: boolean;
  error: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: CommunityState = {
  discussions: [],
  discussionById: {},
  replies: [],
  likes: [],
  isLoading: false,
  error: null,
  status: 'idle',
};

const normalizeDiscussion = (discussion: CommunityDiscussionResponse): CommunityDiscussion => ({
  id: String(discussion.id),
  courseId: String(discussion.course_id),
  courseTitle: discussion.course_title,
  title: discussion.title,
  description: discussion.description,
  authorId: String(discussion.author),
  authorName: discussion.author_name || 'Anonymous',
  status: discussion.status || 'Open',
  replyCount: discussion.reply_count,
  createdAt: discussion.created_at,
  updatedAt: discussion.updated_at,
});

const normalizeReply = (reply: CommunityReplyResponse): CommunityReply => ({
  id: String(reply.id),
  discussionId: String(reply.discussion),
  authorId: String(reply.author),
  authorName: reply.author_name || 'Anonymous',
  content: reply.content,
  createdAt: reply.created_at,
  updatedAt: reply.updated_at,
});

const normalizeLike = (like: CommunityLikeResponse): CommunityLike => ({
  id: String(like.id),
  user: String(like.user),
  itemType: like.item_type,
  itemId: String(like.item_id),
  createdAt: like.created_at,
});

export const fetchCommunityDiscussions = createAsyncThunk(
  'community/fetchDiscussions',
  async (_, { rejectWithValue }) => {
    try {
      return await communityAPI.fetchDiscussions();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch discussions');
    }
  },
);

export const fetchCommunityDiscussion = createAsyncThunk(
  'community/fetchDiscussion',
  async (discussionId: string, { rejectWithValue }) => {
    try {
      return await communityAPI.fetchDiscussion(discussionId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch discussion');
    }
  },
);

export const createCommunityDiscussion = createAsyncThunk(
  'community/createDiscussion',
  async (
    payload: {
      course_id: string;
      course_title: string;
      title: string;
      description: string;
    },
    { rejectWithValue },
  ) => {
    try {
      return await communityAPI.createDiscussion(payload);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create discussion');
    }
  },
);

export const updateCommunityDiscussion = createAsyncThunk(
  'community/updateDiscussion',
  async (
    payload: { discussionId: string; title: string; description: string },
    { rejectWithValue },
  ) => {
    try {
      return await communityAPI.updateDiscussion(payload.discussionId, {
        title: payload.title,
        description: payload.description,
      });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update discussion');
    }
  },
);

export const deleteCommunityDiscussion = createAsyncThunk(
  'community/deleteDiscussion',
  async (discussionId: string, { rejectWithValue }) => {
    try {
      return await communityAPI.deleteDiscussion(discussionId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete discussion');
    }
  },
);

export const fetchCommunityReplies = createAsyncThunk(
  'community/fetchReplies',
  async (discussionId: string, { rejectWithValue }) => {
    try {
      return await communityAPI.fetchReplies(discussionId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch replies');
    }
  },
);

export const createCommunityReply = createAsyncThunk(
  'community/createReply',
  async (
    payload: { discussionId: string; content: string },
    { rejectWithValue },
  ) => {
    try {
      return await communityAPI.createReply(payload.discussionId, {
        content: payload.content,
      });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to post reply');
    }
  },
);

export const updateCommunityReply = createAsyncThunk(
  'community/updateReply',
  async (
    payload: { replyId: string; content: string },
    { rejectWithValue },
  ) => {
    try {
      return await communityAPI.updateReply(payload.replyId, {
        content: payload.content,
      });
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update reply');
    }
  },
);

export const deleteCommunityReply = createAsyncThunk(
  'community/deleteReply',
  async (replyId: string, { rejectWithValue }) => {
    try {
      return await communityAPI.deleteReply(replyId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete reply');
    }
  },
);

export const fetchCommunityLikes = createAsyncThunk(
  'community/fetchLikes',
  async (_, { rejectWithValue }) => {
    try {
      return await communityAPI.fetchLikes();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch likes');
    }
  },
);

export const createCommunityLike = createAsyncThunk(
  'community/createLike',
  async (
    payload: { itemType: LikeItemType; itemId: string },
    { rejectWithValue },
  ) => {
    try {
      return await communityAPI.createLike(payload.itemType, payload.itemId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to like item');
    }
  },
);

export const deleteCommunityLike = createAsyncThunk(
  'community/deleteLike',
  async (likeId: string, { rejectWithValue }) => {
    try {
      return await communityAPI.deleteLike(likeId);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to unlike item');
    }
  },
);

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    clearCommunityError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCommunityDiscussions.pending, (state) => {
        state.isLoading = true;
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCommunityDiscussions.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.status = 'succeeded';
        state.discussions = action.payload.data.map(normalizeDiscussion);
        state.discussionById = action.payload.data.reduce(
          (acc: Record<string, CommunityDiscussion>, discussion: CommunityDiscussionResponse) => {
            const normalized = normalizeDiscussion(discussion);
            acc[String(discussion.id)] = normalized;
            return acc;
          },
          {},
        );
      })
      .addCase(fetchCommunityDiscussions.rejected, (state, action) => {
        state.isLoading = false;
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(fetchCommunityDiscussion.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeDiscussion(action.payload.data);
        state.discussionById[normalized.id] = normalized;
        if (!state.discussions.some((d) => d.id === normalized.id)) {
          state.discussions.unshift(normalized);
        }
      })
      .addCase(createCommunityDiscussion.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeDiscussion(action.payload.data);
        state.discussions.unshift(normalized);
        state.discussionById[normalized.id] = normalized;
      })
      .addCase(updateCommunityDiscussion.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeDiscussion(action.payload.data);
        state.discussions = state.discussions.map((discussion) =>
          discussion.id === normalized.id ? normalized : discussion,
        );
        state.discussionById[normalized.id] = normalized;
      })
      .addCase(deleteCommunityDiscussion.fulfilled, (state, action: PayloadAction<any>) => {
        const deletedId = action.meta.arg as string;
        state.discussions = state.discussions.filter((discussion) => discussion.id !== deletedId);
        delete state.discussionById[deletedId];
        state.replies = state.replies.filter((reply) => reply.discussionId !== deletedId);
      })
      .addCase(fetchCommunityReplies.fulfilled, (state, action: PayloadAction<any>) => {
        state.replies = action.payload.data.map(normalizeReply);
      })
      .addCase(createCommunityReply.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeReply(action.payload.data);
        state.replies.push(normalized);
        const discussion = state.discussionById[normalized.discussionId];
        if (discussion) {
          discussion.replyCount += 1;
          state.discussions = state.discussions.map((item) =>
            item.id === normalized.discussionId ? { ...item, replyCount: item.replyCount + 1 } : item,
          );
        }
      })
      .addCase(updateCommunityReply.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeReply(action.payload.data);
        state.replies = state.replies.map((reply) =>
          reply.id === normalized.id ? normalized : reply,
        );
      })
      .addCase(deleteCommunityReply.fulfilled, (state, action: PayloadAction<any>) => {
        const deletedId = action.meta.arg as string;
        const reply = state.replies.find((replyItem) => replyItem.id === deletedId);
        if (reply) {
          state.replies = state.replies.filter((item) => item.id !== deletedId);
          const discussion = state.discussionById[reply.discussionId];
          if (discussion) {
            discussion.replyCount = Math.max(0, discussion.replyCount - 1);
            state.discussions = state.discussions.map((item) =>
              item.id === discussion.id ? { ...item, replyCount: discussion.replyCount } : item,
            );
          }
        }
      })
      .addCase(fetchCommunityLikes.fulfilled, (state, action: PayloadAction<any>) => {
        state.likes = action.payload.data.map(normalizeLike);
      })
      .addCase(createCommunityLike.fulfilled, (state, action: PayloadAction<any>) => {
        const normalized = normalizeLike(action.payload.data);
        if (!state.likes.some((like) => like.id === normalized.id)) {
          state.likes.push(normalized);
        }
      })
      .addCase(deleteCommunityLike.fulfilled, (state, action: PayloadAction<any>) => {
        const deletedId = action.meta.arg as string;
        state.likes = state.likes.filter((like) => like.id !== deletedId);
      })
      .addMatcher(
        (action) => action.type.startsWith('community/') && action.type.endsWith('/pending'),
        (state) => {
          state.isLoading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('community/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.isLoading = false;
          state.status = 'failed';
          state.error = action.payload as string;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('community/') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.isLoading = false;
          state.status = 'succeeded';
        },
      );
  },
});

export const { clearCommunityError } = communitySlice.actions;
export default communitySlice.reducer;
