import api from '../../services/api';

export type LikeItemType = 'discussion' | 'reply';

export interface CommunityDiscussionResponse {
  id: number;
  course_id: string | number;
  course_title: string;
  title: string;
  description: string;
  author: number | string;
  author_name: string;
  status?: string;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityReplyResponse {
  id: number;
  discussion: number | string;
  author: number | string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityLikeResponse {
  id: number;
  user: number | string;
  item_type: LikeItemType;
  item_id: string | number;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean | string;
  message?: string;
  data: T;
}

const communityAPI = {
  fetchDiscussions: async () => {
    const response = await api.get<ApiResponse<CommunityDiscussionResponse[]>>(
      'community/discussions/',
    );
    return response.data;
  },

  fetchDiscussion: async (discussionId: string) => {
    const response = await api.get<ApiResponse<CommunityDiscussionResponse>>(
      `community/discussions/${discussionId}/`,
    );
    return response.data;
  },

  createDiscussion: async (payload: {
    course_id: string;
    course_title: string;
    title: string;
    description: string;
  }) => {
    const response = await api.post<ApiResponse<CommunityDiscussionResponse>>(
      'community/discussions/create/',
      payload,
    );
    return response.data;
  },

  updateDiscussion: async (
    discussionId: string,
    payload: { title: string; description: string },
  ) => {
    const response = await api.patch<ApiResponse<CommunityDiscussionResponse>>(
      `community/discussions/${discussionId}/update/`,
      payload,
    );
    return response.data;
  },

  deleteDiscussion: async (discussionId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `community/discussions/${discussionId}/delete/`,
    );
    return response.data;
  },

  fetchReplies: async (discussionId: string) => {
    const response = await api.get<ApiResponse<CommunityReplyResponse[]>>(
      `community/discussions/${discussionId}/replies/`,
    );
    return response.data;
  },

  createReply: async (discussionId: string, payload: { content: string }) => {
    const response = await api.post<ApiResponse<CommunityReplyResponse>>(
      `community/discussions/${discussionId}/replies/create/`,
      payload,
    );
    return response.data;
  },

  updateReply: async (replyId: string, payload: { content: string }) => {
    const response = await api.put<ApiResponse<CommunityReplyResponse>>(
      `community/replies/${replyId}/update/`,
      payload,
    );
    return response.data;
  },

  deleteReply: async (replyId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `community/replies/${replyId}/delete/`,
    );
    return response.data;
  },

  fetchLikes: async () => {
    const response = await api.get<ApiResponse<CommunityLikeResponse[]>>(
      'community/likes/',
    );
    return response.data;
  },

  createLike: async (itemType: LikeItemType, itemId: string) => {
    const response = await api.post<ApiResponse<CommunityLikeResponse>>(
      'community/likes/create/',
      {
        item_type: itemType,
        item_id: itemId,
      },
    );
    return response.data;
  },

  deleteLike: async (likeId: string) => {
    const response = await api.delete<ApiResponse<null>>(
      `community/likes/${likeId}/delete/`,
    );
    return response.data;
  },
};

export default communityAPI;
