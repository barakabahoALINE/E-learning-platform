import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import api from "../../../services/api";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface CourseSummary {
  id: number | string;
  title: string;
  is_published?: boolean;
}

interface ApiUser {
  id: number;
  email: string;
  full_name: string;
  role?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

interface ApiEnrollment {
  id: number;
  student: number | ApiUser;
  course: number | { id: number; title?: string };
  status: string;
}

interface CourseLearnerEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseSummary | null;
  onEnrolled?: () => void;
}

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data?.data || payload?.data || payload || [];
  return Array.isArray(data) ? data : [];
};

const getEnrollmentCourseId = (enrollment: ApiEnrollment) => {
  return typeof enrollment.course === "object" ? enrollment.course.id : enrollment.course;
};

const getEnrollmentStudentId = (enrollment: ApiEnrollment) => {
  return typeof enrollment.student === "object" ? enrollment.student.id : enrollment.student;
};

const isLearnerUser = (user: ApiUser) => {
  return String(user.role || "").toLowerCase() === "student";
};

export function CourseLearnerEnrollmentModal({
  isOpen,
  onClose,
  course,
  onEnrolled,
}: CourseLearnerEnrollmentModalProps) {
  const [learners, setLearners] = useState<ApiUser[]>([]);
  const [enrollments, setEnrollments] = useState<ApiEnrollment[]>([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const courseId = course?.id;

  const loadLearners = async () => {
    if (!courseId) return;

    setIsLoading(true);
    try {
      const [usersResponse, enrollmentsResponse] = await Promise.all([
        api.get("auth/users/"),
        api.get("enrollments/").catch(() => api.get("instructor/course-enrollments/")),
      ]);

      setLearners(unwrapList<ApiUser>(usersResponse).filter(isLearnerUser));
      setEnrollments(unwrapList<ApiEnrollment>(enrollmentsResponse));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load learners for this course.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedLearnerIds(new Set());
      setSearchQuery("");
      loadLearners();
    }
  }, [isOpen, courseId]);

  const enrolledLearnerIds = useMemo(() => {
    return new Set(
      enrollments
        .filter((enrollment) => String(getEnrollmentCourseId(enrollment)) === String(courseId))
        .map((enrollment) => Number(getEnrollmentStudentId(enrollment)))
    );
  }, [enrollments, courseId]);

  const availableLearners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return learners
      .filter((learner) => learner.is_active !== false)
      .filter((learner) => !enrolledLearnerIds.has(learner.id))
      .filter((learner) => {
        if (!query) return true;
        return (
          (learner.full_name || "").toLowerCase().includes(query) ||
          (learner.email || "").toLowerCase().includes(query)
        );
      });
  }, [learners, enrolledLearnerIds, searchQuery]);

  const toggleLearner = (learnerId: number) => {
    setSelectedLearnerIds((current) => {
      const next = new Set(current);
      if (next.has(learnerId)) {
        next.delete(learnerId);
      } else {
        next.add(learnerId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!courseId || selectedLearnerIds.size === 0) return;
    if (course?.is_published === false) {
      toast.error("Publish this course before adding learners.");
      return;
    }

    setIsSaving(true);
    try {
      const learnerIds = Array.from(selectedLearnerIds);
      await Promise.all(
        learnerIds.map((student) =>
          api.post("enrollments/create/", {
            course: courseId,
            student,
          })
        )
      );

      toast.success(
        learnerIds.length === 1
          ? "Learner enrolled in this course."
          : `${learnerIds.length} learners enrolled in this course.`
      );
      setSelectedLearnerIds(new Set());
      await loadLearners();
      onEnrolled?.();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Failed to enroll selected learners.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Add Learners
          </DialogTitle>
          <DialogDescription>
            Choose existing learners to enroll in {course?.title || "this course"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search learners..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4" />
                Available Learners
              </div>
              <span className="text-xs text-gray-500">{selectedLearnerIds.size} selected</span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {isLoading ? (
                <div className="px-4 py-10 text-center text-gray-500">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-blue-600" />
                  Loading learners...
                </div>
              ) : availableLearners.length === 0 ? (
                <div className="px-4 py-10 text-center text-gray-500">
                  <p className="text-sm font-medium">No learners available</p>
                  <p className="text-xs mt-1">Everyone shown to you is already enrolled or no learner matches your search.</p>
                </div>
              ) : (
                availableLearners.map((learner) => {
                  const isSelected = selectedLearnerIds.has(learner.id);

                  return (
                    <button
                      key={learner.id}
                      type="button"
                      onClick={() => toggleLearner(learner.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-blue-50 transition-colors"
                    >
                      <span className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"}`}>
                        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                      </span>
                      <span className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold">
                        {(learner.full_name || learner.email).slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">
                          {learner.full_name || "Unnamed learner"}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">{learner.email}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || selectedLearnerIds.size === 0}>
            {isSaving ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling...
              </span>
            ) : (
              `Enroll ${selectedLearnerIds.size || ""}`.trim()
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
