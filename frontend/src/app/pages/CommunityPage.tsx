import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  MessageSquare,
  Search,
  Plus,
  BookOpen,
  Clock,
  X,
  Eye,
  Heart,
} from "lucide-react";
import { MainLayout } from "../components/MainLayout";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import {
  useCommunity,
  formatRelativeTime,
  getInitials,
  normalizeCourseId,
  CommunityDiscussion,
} from "../data/community-data";
import { useLikeState } from "../data/like-data";
import AskDiscussionModal from "../components/AskDiscussionModal";

// ── Ask Question Modal ─────────────────────────────────────────────────────────

interface AskModalProps {
  enrolledCourses: { id: string; title: string }[];
  currentUserId: string;
  currentUserName: string;
  onPost: (
    courseId: string,
    courseTitle: string,
    title: string,
    description: string,
  ) => string;
  onClose: () => void;
}

// The shared AskDiscussionModal component is used instead of the inline modal

// ── Discussion Row ─────────────────────────────────────────────────────────────

interface DiscussionRowProps {
  id: string;
  courseTitle: string;
  title: string;
  description: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  isLikeLoading?: boolean;
  onToggleLike?: () => void;
  viewCount?: number;
  status?: string;
}

const DiscussionRow: React.FC<DiscussionRowProps> = ({
  id,
  courseTitle,
  title,
  description,
  authorName,
  createdAt,
  replyCount,
  likeCount,
  likedByCurrentUser,
  isLikeLoading,
  onToggleLike,
  viewCount,
  status,
}) => (
  <Link to={`/community/${id}`} className="block group">
    <div className="flex flex-col gap-4 p-5 rounded-[16px] border border-gray-200/80 bg-white dark:bg-slate-950 dark:border-gray-800/80 shadow-sm transition duration-200 hover:border-blue-200/70 dark:hover:border-blue-500/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {courseTitle}
          </span>
        </div>

        {status && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              status.toLowerCase().includes("solved")
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors leading-snug line-clamp-1">
          {title}
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400 line-clamp-2">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>{authorName}</span>
          <span aria-hidden="true">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{replyCount}</span>
          </span>
          {typeof viewCount === "number" && (
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{viewCount}</span>
            </span>
          )}
          {typeof likeCount === "number" && onToggleLike ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onToggleLike();
              }}
              disabled={isLikeLoading}
              aria-pressed={likedByCurrentUser}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                likedByCurrentUser
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"
              }`}
            >
              <Heart
                className="w-3.5 h-3.5"
                fill={likedByCurrentUser ? "currentColor" : "none"}
              />
              <span>{likeCount}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </Link>
);

// ── Main Page ──────────────────────────────────────────────────────────────────

export const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const reduxUser = useAppSelector(selectCurrentUser);
  const user = reduxUser
    ? {
        id: String(reduxUser.id),
        name: reduxUser.full_name || reduxUser.email?.split("@")[0] || "User",
      }
    : null;

  // Get enrolled courses from Redux
  const { myEnrollments } = useAppSelector((state) => state.enrollments);
  const { courses } = useAppSelector((state) => state.courses);

  const enrolledCourses = myEnrollments
    .filter((enrollment) => enrollment.status !== "cancelled")
    .map((enrollment) => {
      const course = courses.find((c) => c.id === enrollment.course);
      return {
        id: String(course?.id || enrollment.course),
        title: course?.title || `Course ${enrollment.course}`,
      };
    });

  const { discussions, addDiscussion } = useCommunity();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
  const [likeError, setLikeError] = useState<string | null>(null);
  const { getSummary, toggleLike } = useLikeState(user?.id);

  const enrolledIds = new Set(
    enrolledCourses.map((course) => normalizeCourseId(course.id)),
  );
  const enrolledCoursesSimple = enrolledCourses.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  const handleToggleDiscussionLike = async (discussionId: string) => {
    if (!user) {
      setLikeError("Sign in to like questions.");
      return;
    }

    const key = `discussion:${discussionId}`;
    setLikeError(null);
    setLikeLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await toggleLike("discussion", discussionId);
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

  const visibleDiscussions = useMemo<CommunityDiscussion[]>(() => {
    const query = search.trim().toLowerCase();
    let list = discussions.filter((discussion: CommunityDiscussion) =>
      enrolledIds.has(normalizeCourseId(discussion.courseId)),
    );

    if (query) {
      list = list.filter(
        (discussion: CommunityDiscussion) =>
          discussion.title.toLowerCase().includes(query) ||
          discussion.courseTitle.toLowerCase().includes(query) ||
          discussion.authorName.toLowerCase().includes(query),
      );
    }

    return list.sort(
      (a: CommunityDiscussion, b: CommunityDiscussion) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [discussions, enrolledIds, search]);

  const hasEnrolledCourses = enrolledCourses.length > 0;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-0 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Learning Community
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Discussions from your enrolled courses
            </p>
          </div>
          {hasEnrolledCourses && (
            <Button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Ask a Question
            </Button>
          )}
        </div>

        {likeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {likeError}
          </div>
        )}

        {/* No enrolled courses empty state */}
        {!hasEnrolledCourses ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                <BookOpen className="w-7 h-7 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                  Start learning to join discussions
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enroll in a course to ask questions and interact with other
                  learners.
                </p>
              </div>
              <Link to="/courses">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search discussions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Discussion list */}
            <Card>
              {visibleDiscussions.length === 0 ? (
                <CardContent className="py-14 text-center space-y-4">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {search.trim()
                        ? "No discussions match your search yet."
                        : "There are no questions for your enrolled courses yet."}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {search.trim()
                        ? "Try a different keyword or clear the search."
                        : "Start the conversation by asking the first question for one of your courses."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (search.trim()) {
                        setSearch("");
                        return;
                      }
                      setShowModal(true);
                    }}
                  >
                    {search.trim() ? "Clear search" : "Ask the first question"}
                  </Button>
                </CardContent>
              ) : (
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {visibleDiscussions.map((d) => {
                      const discussionLike = getSummary("discussion", d.id);
                      return (
                        <DiscussionRow
                          key={d.id}
                          id={d.id}
                          courseTitle={d.courseTitle}
                          title={d.title}
                          description={d.description}
                          authorName={d.authorName}
                          createdAt={d.createdAt}
                          replyCount={d.replyCount}
                          likeCount={discussionLike.likeCount}
                          likedByCurrentUser={discussionLike.likedByCurrentUser}
                          isLikeLoading={Boolean(
                            likeLoading[`discussion:${d.id}`],
                          )}
                          onToggleLike={() => handleToggleDiscussionLike(d.id)}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          </>
        )}
      </div>

      {showModal && user && (
        <AskDiscussionModal
          enrolledCourses={enrolledCoursesSimple}
          defaultCourseId={enrolledCoursesSimple[0]?.id}
          onPost={(cId, cTitle, title, desc) => {
            const newId = addDiscussion(
              cId,
              cTitle,
              title,
              desc,
              user.id,
              user.name,
            );
            // close modal and navigate to discussion
            setShowModal(false);
            navigate(`/community/${newId}`);
            return newId;
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </MainLayout>
  );
};
