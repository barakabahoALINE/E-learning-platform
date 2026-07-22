import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  Pencil,
  Trash2,
  Check,
  X,
  Heart,
} from "lucide-react";
import { MainLayout } from "../components/MainLayout";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import {
  useCommunity,
  formatRelativeTime,
  getInitials,
  CommunityDiscussion,
  CommunityReply,
} from "../data/community-data";
import { LikeItemType, useLikeState } from "../data/like-data";

// ── Reply Item ─────────────────────────────────────────────────────────────────

interface ReplyItemProps {
  replyId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  currentUserId: string;
  likeCount: number;
  likedByCurrentUser: boolean;
  isLikeLoading: boolean;
  onToggleLike: (replyId: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

const ReplyItem: React.FC<ReplyItemProps> = ({
  replyId,
  authorId,
  authorName,
  content,
  createdAt,
  currentUserId,
  likeCount,
  likedByCurrentUser,
  isLikeLoading,
  onToggleLike,
  onEdit,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const isOwner = authorId === currentUserId;

  const handleSave = () => {
    if (draft.trim() && draft.trim() !== content) {
      onEdit(replyId, draft.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(content);
    setEditing(false);
  };

  return (
    <div className="flex gap-3 py-4">
      <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {getInitials(authorName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {authorName}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!draft.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs gap-1"
              >
                <Check className="w-3 h-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 px-3 text-xs gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <button
                type="button"
                onClick={() => onToggleLike(replyId)}
                disabled={isLikeLoading}
                aria-pressed={likedByCurrentUser}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 transition-colors ${
                  likedByCurrentUser
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                }`}
              >
                <Heart
                  className="w-3.5 h-3.5"
                  fill={likedByCurrentUser ? "currentColor" : "none"}
                />
                <span>{likeCount}</span>
              </button>
            </div>
            {isOwner && (
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => onDelete(replyId)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────

export const DiscussionDetailPage: React.FC = () => {
  const { discussionId } = useParams();
  const navigate = useNavigate();
  const reduxUser = useAppSelector(selectCurrentUser);
  const user = reduxUser
    ? {
        id: String(reduxUser.id),
        name: reduxUser.full_name || reduxUser.email?.split("@")[0] || "User",
      }
    : null;
  const {
    discussions,
    replies,
    editDiscussion,
    deleteDiscussion,
    addReply,
    editReply,
    deleteReply,
  } = useCommunity();

  const discussion = discussions.find(
    (d: CommunityDiscussion) => d.id === discussionId,
  );
  const threadReplies = replies
    .filter((r: CommunityReply) => r.discussionId === discussionId)
    .sort(
      (a: CommunityReply, b: CommunityReply) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  const [replyText, setReplyText] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editTitle, setEditTitle] = useState(discussion?.title ?? "");
  const [editDescription, setEditDescription] = useState(
    discussion?.description ?? "",
  );
  const [likeError, setLikeError] = useState<string | null>(null);
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
  const { getSummary, toggleLike } = useLikeState(user?.id);

  const discussionLike = discussion
    ? getSummary("discussion", discussion.id)
    : {
        itemType: "discussion" as const,
        itemId: "",
        likeCount: 0,
        likedByCurrentUser: false,
      };

  const handleToggleItemLike = async (
    itemType: LikeItemType,
    itemId: string,
  ) => {
    if (!user) {
      setLikeError("Sign in to like content.");
      return;
    }
    const key = `${itemType}:${itemId}`;
    setLikeError(null);
    setLikeLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await toggleLike(itemType, itemId);
    } catch (error) {
      setLikeError(
        error instanceof Error
          ? error.message
          : "Unable to update like. Please try again.",
      );
    } finally {
      setLikeLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (!discussion) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Discussion not found
          </h2>
          <Button onClick={() => navigate("/community")}>
            Back to Community
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isQuestionOwner = user?.id === discussion.authorId;

  const handleDeleteDiscussion = () => {
    if (window.confirm("Delete this discussion? This cannot be undone.")) {
      deleteDiscussion(discussion.id);
      navigate("/community");
    }
  };

  const handleSaveQuestion = () => {
    if (editTitle.trim() && editDescription.trim()) {
      editDiscussion(discussion.id, editTitle.trim(), editDescription.trim());
    }
    setEditingQuestion(false);
  };

  const handlePostReply = () => {
    if (!replyText.trim() || !user) return;
    addReply(discussion.id, replyText.trim(), user.id, user.name);
    setReplyText("");
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate("/community")}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </button>

        {/* Question card */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            {/* Course label */}
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
              {discussion.courseTitle}
            </span>

            {editingQuestion ? (
              <div className="mt-4 space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-base font-semibold rounded-lg border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveQuestion}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-8 text-xs"
                  >
                    <Check className="w-3 h-3" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingQuestion(false)}
                    className="h-8 text-xs gap-1"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-3 mb-3 leading-snug break-words">
                  {discussion.title}
                </h1>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                  {discussion.description}
                </p>
              </>
            )}

            {/* Author row */}
            <div className="flex flex-col gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {getInitials(discussion.authorName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {discussion.authorName}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(discussion.createdAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleItemLike("discussion", discussion.id)
                  }
                  disabled={likeLoading[`discussion:${discussion.id}`]}
                  aria-pressed={discussionLike.likedByCurrentUser}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    discussionLike.likedByCurrentUser
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                  }`}
                >
                  <Heart
                    className="w-4 h-4"
                    fill={
                      discussionLike.likedByCurrentUser
                        ? "currentColor"
                        : "none"
                    }
                  />
                  <span>{discussionLike.likeCount}</span>
                </button>

                {isQuestionOwner && !editingQuestion && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditTitle(discussion.title);
                        setEditDescription(discussion.description);
                        setEditingQuestion(true);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteDiscussion}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {likeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {likeError}
          </div>
        )}

        {/* Replies */}
        {threadReplies.length > 0 && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="px-6 py-2">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide py-3">
                {threadReplies.length}{" "}
                {threadReplies.length === 1 ? "Reply" : "Replies"}
              </h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {threadReplies.map((r: CommunityReply) => {
                  const replyLike = getSummary("reply", r.id);
                  return (
                    <ReplyItem
                      key={r.id}
                      replyId={r.id}
                      authorId={r.authorId}
                      authorName={r.authorName}
                      content={r.content}
                      createdAt={r.createdAt}
                      currentUserId={user?.id ?? ""}
                      likeCount={replyLike.likeCount}
                      likedByCurrentUser={replyLike.likedByCurrentUser}
                      isLikeLoading={Boolean(likeLoading[`reply:${r.id}`])}
                      onToggleLike={() => handleToggleItemLike("reply", r.id)}
                      onEdit={editReply}
                      onDelete={deleteReply}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reply composer */}
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Write a reply
            </h3>
            <textarea
              placeholder="Share your answer or thoughts..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <div className="flex justify-end">
              <Button
                onClick={handlePostReply}
                disabled={!replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
              >
                Post Reply
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};
