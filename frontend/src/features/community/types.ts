export type LikeItemType = 'discussion' | 'reply';

export interface CommunityDiscussion {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReply {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityLike {
  id: string;
  user: string;
  itemType: LikeItemType;
  itemId: string;
  createdAt: string;
}
