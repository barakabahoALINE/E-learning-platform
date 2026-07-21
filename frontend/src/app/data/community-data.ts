import { useEffect, useMemo, useState } from 'react';

export interface CommunityDiscussion {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  status?: string;
}

export interface CommunityReply {
  id: string;
  discussionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface CommunityStore {
  discussions: CommunityDiscussion[];
  replies: CommunityReply[];
}

const STORAGE_KEY = 'community-data-store';

export const normalizeCourseId = (value?: string | null) => {
  if (!value) return '';
  return String(value).trim().toLowerCase().replace(/^course[-_]?/, '');
};

const initialDiscussions: CommunityDiscussion[] = [];

const initialReplies: CommunityReply[] = [];

const readStore = (): CommunityStore => {
  if (typeof window === 'undefined') {
    return { discussions: initialDiscussions, replies: initialReplies };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { discussions: initialDiscussions, replies: initialReplies };
    }
    const parsed = JSON.parse(raw) as Partial<CommunityStore>;
    const discussions = (parsed.discussions ?? initialDiscussions).map((discussion) => ({
      ...discussion,
      courseId: normalizeCourseId(discussion.courseId),
    }));

    return {
      discussions,
      replies: parsed.replies ?? initialReplies,
    };
  } catch {
    return { discussions: initialDiscussions, replies: initialReplies };
  }
};

const writeStore = (store: CommunityStore) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
};

export const useCommunity = () => {
  const [store, setStore] = useState<CommunityStore>(() => readStore());

  useEffect(() => {
    writeStore(store);
  }, [store]);

  const addDiscussion = (
    courseId: string,
    courseTitle: string,
    title: string,
    description: string,
    authorId: string,
    authorName: string,
  ) => {
    const newDiscussion: CommunityDiscussion = {
      id: `d-${Date.now()}`,
      courseId,
      courseTitle,
      title,
      description,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
      replyCount: 0,
      status: 'Open',
    };

    setStore((prev) => ({
      ...prev,
      discussions: [newDiscussion, ...prev.discussions],
    }));

    return newDiscussion.id;
  };

  const editDiscussion = (discussionId: string, title: string, description: string) => {
    setStore((prev) => ({
      ...prev,
      discussions: prev.discussions.map((discussion) =>
        discussion.id === discussionId
          ? { ...discussion, title, description }
          : discussion,
      ),
    }));
  };

  const deleteDiscussion = (discussionId: string) => {
    setStore((prev) => ({
      ...prev,
      discussions: prev.discussions.filter((discussion) => discussion.id !== discussionId),
      replies: prev.replies.filter((reply) => reply.discussionId !== discussionId),
    }));
  };

  const addReply = (
    discussionId: string,
    content: string,
    authorId: string,
    authorName: string,
  ) => {
    const reply: CommunityReply = {
      id: `r-${Date.now()}`,
      discussionId,
      authorId,
      authorName,
      content,
      createdAt: new Date().toISOString(),
    };

    setStore((prev) => ({
      ...prev,
      replies: [...prev.replies, reply],
      discussions: prev.discussions.map((discussion) =>
        discussion.id === discussionId
          ? { ...discussion, replyCount: discussion.replyCount + 1 }
          : discussion,
      ),
    }));
  };

  const editReply = (replyId: string, content: string) => {
    setStore((prev) => ({
      ...prev,
      replies: prev.replies.map((reply) =>
        reply.id === replyId ? { ...reply, content } : reply,
      ),
    }));
  };

  const deleteReply = (replyId: string) => {
    setStore((prev) => ({
      ...prev,
      replies: prev.replies.filter((reply) => reply.id !== replyId),
      discussions: prev.discussions.map((discussion) => {
        const replyCount = prev.replies.filter(
          (reply) => reply.discussionId === discussion.id && reply.id !== replyId,
        ).length;
        return { ...discussion, replyCount };
      }),
    }));
  };

  return useMemo(
    () => ({
      discussions: store.discussions,
      replies: store.replies,
      addDiscussion,
      editDiscussion,
      deleteDiscussion,
      addReply,
      editReply,
      deleteReply,
    }),
    [store.discussions, store.replies],
  );
};

export const formatRelativeTime = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const getInitials = (name?: string | null, email?: string | null) => {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return 'U';
};
