import { useEffect, useMemo, useState } from 'react';

export type LikeItemType = 'discussion' | 'reply';

interface LikeSummary {
  itemType: LikeItemType;
  itemId: string;
  likeCount: number;
  likedByCurrentUser: boolean;
}

interface LikeStateMap {
  [key: string]: { count: number; liked: boolean };
}

const STORAGE_KEY = 'community-likes-store';

const readLikes = (): LikeStateMap => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeLikes = (data: LikeStateMap) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

export const useLikeState = (currentUserId?: string) => {
  const [likes, setLikes] = useState<LikeStateMap>(() => readLikes());

  useEffect(() => {
    writeLikes(likes);
  }, [likes]);

  const getSummary = (itemType: LikeItemType, itemId: string): LikeSummary => {
    const key = `${itemType}:${itemId}`;
    const state = likes[key];
    return {
      itemType,
      itemId,
      likeCount: state?.count ?? 0,
      likedByCurrentUser: Boolean(state?.liked && currentUserId),
    };
  };

  const toggleLike = async (itemType: LikeItemType, itemId: string) => {
    const key = `${itemType}:${itemId}`;
    setLikes((prev) => {
      const current = prev[key];
      const next = {
        ...prev,
        [key]: {
          count: Math.max(0, (current?.count ?? 0) + (current?.liked ? -1 : 1)),
          liked: !current?.liked,
        },
      };
      return next;
    });
  };

  return useMemo(() => ({ getSummary, toggleLike }), [currentUserId, likes]);
};
