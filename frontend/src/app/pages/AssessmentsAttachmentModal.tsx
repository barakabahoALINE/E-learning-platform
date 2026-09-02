import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, FileQuestion, Link2, RefreshCw, Search, Unlink2, X } from "lucide-react";
import { toast } from "sonner";
import assessmentAPI from "../../features/assessments/assessmentAPI";
import courseAPI from "../../features/courses/courseAPI";
import type { AssessmentLibraryItem } from "../../features/assessments/assessmentLibraryAdapter";
import type { Course, Module } from "../../features/courses/types";

interface AssessmentsAttachmentModalProps {
  item: AssessmentLibraryItem;
  onClose: () => void;
  onAttach: (payload: { module_ids?: Array<number | string>; course_ids?: Array<number | string> }) => Promise<void>;
  onDetach: (payload: { module_id?: number | string; course_id?: number | string }) => Promise<void>;
}

interface AssessmentDetail {
  id: string | number;
  title: string;
  assessment_type: "QUIZ" | "FINAL";
  course_attachments: Array<{ id: number | string; title: string }>;
  module_attachments: Array<{ id: number | string; title: string; course_id?: number | string; course_title?: string }>;
}

export function AssessmentsAttachmentModal({ item, onClose, onAttach, onDetach }: AssessmentsAttachmentModalProps) {
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Array<number | string>>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Array<number | string>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCourseIds, setExpandedCourseIds] = useState<Array<number | string>>([]);
  const [expandedCurrentCourseIds, setExpandedCurrentCourseIds] = useState<Array<number | string>>([]);

  const isQuiz = item.assessment_type === "QUIZ";

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [assessmentResponse, courseSummaries] = await Promise.all([
          assessmentAPI.fetchAssessmentDetail(item.id),
          courseAPI.fetchCourses(true),
        ]);

        const detailedCourses = await Promise.all(
          courseSummaries.map(async (course) => {
            try {
              const detail = await courseAPI.fetchCourseDetails(course.id);
              const modules = Array.isArray(detail.modules) && detail.modules.length > 0
                ? detail.modules
                : await courseAPI.fetchModules(course.id).catch(() => []);

              return {
                ...detail,
                modules,
              } as Course;
            } catch {
              try {
                const fallbackModules = await courseAPI.fetchModules(course.id);
                return {
                  ...course,
                  modules: fallbackModules,
                } as Course;
              } catch {
                return {
                  ...course,
                  modules: [],
                } as Course;
              }
            }
          })
        );

        if (!active) return;
        setDetail(assessmentResponse);
        setCourses(detailedCourses);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Failed to load attach targets");
      } finally {
        if (!active) return;
        setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [item.id]);

  const currentCourseIds = useMemo(() => detail?.course_attachments.map((course) => course.id) || [], [detail]);
  const currentModuleIds = useMemo(() => detail?.module_attachments.map((module) => module.id) || [], [detail]);

  useEffect(() => {
    if (!detail) return;
    setSelectedCourseIds(detail.course_attachments.map((course) => course.id));
    setSelectedModuleIds(detail.module_attachments.map((module) => module.id));
  }, [detail]);

  const availableCourses = useMemo(() => {
    if (!courses.length) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return courses
      .map((course) => ({
        ...course,
        modules: course.modules || [],
      }))
      .filter((course) => {
        if (!normalizedQuery) return true;

        const titleMatch = String(course.title || "").toLowerCase().includes(normalizedQuery);
        const moduleMatch = (course.modules || []).some((module) =>
          String(module.title || "").toLowerCase().includes(normalizedQuery)
        );

        return titleMatch || moduleMatch;
      });
  }, [courses, searchQuery]);

  const hasCurrentAttachments = Boolean(currentCourseIds.length || currentModuleIds.length);

  const handleToggleCourse = (courseId: number | string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => String(id) !== String(courseId)) : [...prev, courseId]
    );
  };

  const handleToggleModule = (moduleId: number | string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => String(id) !== String(moduleId)) : [...prev, moduleId]
    );
  };

  const handleSave = async () => {
    if (!detail) return;
    if (isQuiz && selectedModuleIds.length === 0) {
      toast.error("Select one or more modules to attach this quiz to.");
      return;
    }
    if (!isQuiz && selectedCourseIds.length === 0) {
      toast.error("Select one or more courses to attach this final assessment to.");
      return;
    }

    setIsSaving(true);
    try {
      await onAttach({
        module_ids: isQuiz ? selectedModuleIds : undefined,
        course_ids: isQuiz ? undefined : selectedCourseIds,
      });
      setSelectedCourseIds([]);
      setSelectedModuleIds([]);
      toast.success("Attachments updated successfully.");
      onClose();
    } catch (err: any) {
      const message = typeof err === "string" ? err : err?.message;
      setConflictMessage(message || "Failed to attach assessment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetachItem = async (payload: { module_id?: number | string; course_id?: number | string }) => {
    try {
      await onDetach(payload);
      setSelectedCourseIds((prev) =>
        payload.course_id !== undefined ? prev.filter((id) => String(id) !== String(payload.course_id)) : prev
      );
      setSelectedModuleIds((prev) =>
        payload.module_id !== undefined ? prev.filter((id) => String(id) !== String(payload.module_id)) : prev
      );
      toast.success("Attachment removed successfully.");
      const refreshed = await assessmentAPI.fetchAssessmentDetail(item.id);
      setDetail(refreshed);
    } catch (err: any) {
      toast.error(err?.message || "Failed to detach attachment");
    }
  };

  const toggleCourseExpansion = (courseId: number | string) => {
    setExpandedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => String(id) !== String(courseId)) : [...prev, courseId]
    );
  };

  const toggleCurrentCourseExpansion = (courseId: number | string) => {
    setExpandedCurrentCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => String(id) !== String(courseId)) : [...prev, courseId]
    );
  };

  const currentAttachedGroups = useMemo(() => {
    if (!detail) return [];

    if (isQuiz) {
      const grouped = new Map<string, { id: string; title: string; modules: typeof detail.module_attachments }>();

      detail.module_attachments.forEach((module) => {
        const key = String(module.course_title || "Course");
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            title: key,
            modules: [],
          });
        }

        grouped.get(key)!.modules.push(module);
      });

      return Array.from(grouped.values());
    }

    return detail.course_attachments.map((course) => ({
      id: String(course.id),
      title: course.title,
      modules: [] as Array<{ id: number | string; title: string; course_id?: number | string; course_title?: string }>,
    }));
  }, [detail, isQuiz]);

  useEffect(() => {
    if (!detail || !currentAttachedGroups.length) {
      setExpandedCurrentCourseIds([]);
      return;
    }

    if (currentAttachedGroups.length === 1 && expandedCurrentCourseIds.length === 0) {
      setExpandedCurrentCourseIds([currentAttachedGroups[0].id]);
    }

    if (currentAttachedGroups.length > 1) {
      setExpandedCurrentCourseIds((prev) => prev.filter((id) => currentAttachedGroups.some((group) => group.id === id)));
    }
  }, [currentAttachedGroups, detail]);

  const quizAvailableCourses = useMemo(
    () =>
      availableCourses
        .map((course) => ({
          ...course,
          modules: (course.modules || []).filter(
            (module) => !currentModuleIds.some((id) => String(id) === String(module.id))
          ),
        }))
        .filter((course) => course.modules.length > 0),
    [availableCourses, currentModuleIds]
  );

  const finalAvailableCourses = useMemo(
    () => availableCourses.filter((course) => !currentCourseIds.some((id) => String(id) === String(course.id))),
    [availableCourses, currentCourseIds]
  );

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-[760px] rounded-[24px] bg-[#f3f3f3] border border-[#dfe3e8] shadow-[0_18px_34px_rgba(15,23,42,0.14)] overflow-hidden">
        <div className="px-6 pt-6 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[28px] font-bold tracking-[-0.04em] text-gray-900">Manage attachments</h3>
              <p className="mt-2 text-[15px] text-gray-600">
                {isQuiz
                  ? "Attach this quiz to a course or module, or detach it from a current binding."
                  : "Attach this assessment to a course or module, or detach it from a current binding."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[74vh] overflow-y-auto px-5 pb-4">
          {isLoading ? (
            <div className="py-14 text-center text-sm text-gray-500">Loading available attachments...</div>
          ) : error ? (
            <div className="py-14 text-center text-sm text-red-600">{error}</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-[18px] border border-[#dfe3e8] bg-[#f7f7f7] px-4 py-3">
                <div className="mb-3 pt-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Currently attached</p>
                </div>

                {hasCurrentAttachments ? (
                  <div className="space-y-3">
                    {currentAttachedGroups.map((group) => {
                      const isExpanded = expandedCurrentCourseIds.includes(group.id);

                      if (isQuiz) {
                        return (
                          <div key={group.id} className="rounded-[12px] border border-[#dfe3e8] bg-[#f5f5f5] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => toggleCurrentCourseExpansion(group.id)}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold text-gray-800">{group.title}</p>
                                <p className="text-xs text-gray-500">Attached modules</p>
                              </div>
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-2 border-t border-[#dfe3e8] pt-3">
                                {group.modules.map((module) => (
                                  <div key={`module-${module.id}`} className="flex items-center justify-between gap-3 rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2.5">
                                    <div>
                                      <p className="text-[14px] font-medium text-gray-800">{module.title}</p>
                                      <p className="text-xs text-gray-500">Module</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDetachItem({ module_id: module.id })}
                                      className="inline-flex items-center gap-2 rounded-[10px] border border-[#ef9b9b] bg-transparent px-3 py-2 text-[14px] font-semibold text-[#d94b4b] hover:bg-white transition-colors"
                                    >
                                      <Unlink2 className="h-4 w-4" />
                                      Detach
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={group.id} className="rounded-[12px] border border-[#dfe3e8] bg-[#f5f5f5] px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => toggleCurrentCourseExpansion(group.id)}
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold text-gray-800">{group.title}</p>
                                <p className="text-xs text-gray-500">Attached course</p>
                              </div>
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDetachItem({ course_id: group.id })}
                              className="inline-flex items-center gap-2 rounded-[10px] border border-[#ef9b9b] bg-transparent px-3 py-2 text-[14px] font-semibold text-[#d94b4b] hover:bg-white transition-colors"
                            >
                              <Unlink2 className="h-4 w-4" />
                              Detach
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-dashed border-[#dfe3e8] bg-[#fafafa] px-4 py-5 text-center text-sm text-gray-500">
                    No attachments are currently set for this assessment.
                  </div>
                )}
              </div>

              <div className="rounded-[18px] border border-[#dfe3e8] bg-[#f7f7f7] px-4 py-3">
                <div className="mb-3 pt-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gray-500">Attach to</p>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-[12px] border border-[#dfe3e8] bg-white py-2.5 pl-10 pr-4 text-[15px] text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder={isQuiz ? "Search modules" : "Search courses"}
                  />
                </div>

                <div className="space-y-3">
                  {isQuiz ? (
                    quizAvailableCourses.length === 0 ? (
                      <div className="rounded-[12px] border border-dashed border-[#dfe3e8] bg-white p-4 text-center text-sm text-gray-500">
                        No modules available to attach.
                      </div>
                    ) : (
                      quizAvailableCourses.map((course) => {
                        const isExpanded = expandedCourseIds.includes(course.id);
                        const courseModules = course.modules || [];

                        return (
                          <div key={course.id} className="rounded-[12px] border border-[#dfe3e8] bg-[#f5f5f5] px-3 py-2">
                            <button
                              type="button"
                              onClick={() => toggleCourseExpansion(course.id)}
                              className="flex w-full items-center justify-between gap-3 text-left"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[15px] font-semibold text-gray-800">{course.title}</p>
                                <p className="text-xs text-gray-500">
                                  {courseModules.length > 0 ? `${courseModules.length} available modules` : "Available modules"}
                                </p>
                              </div>
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                aria-hidden="true"
                              >
                                <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-2 border-t border-[#dfe3e8] pt-3">
                                {courseModules.map((module) => {
                                  const isSelected = selectedModuleIds.some((id) => String(id) === String(module.id));
                                  return (
                                    <div
                                      key={module.id}
                                      className="flex items-center justify-between gap-3 rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2.5"
                                    >
                                      <div>
                                        <p className="text-[14px] font-medium text-gray-800">{module.title}</p>
                                        <p className="text-xs text-gray-500">Module</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleModule(module.id)}
                                        className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] font-semibold transition-colors ${
                                          isSelected
                                            ? "border border-[#1d69d7] bg-[#1d69d7] text-white"
                                            : "border border-[#7db5ff] bg-white text-[#1d69d7] hover:bg-[#edf5ff]"
                                        }`}
                                      >
                                        <Link2 className="h-4 w-4" />
                                        {isSelected ? "Selected" : "Attach"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )
                  ) : finalAvailableCourses.length === 0 ? (
                    <div className="rounded-[12px] border border-dashed border-[#dfe3e8] bg-white p-4 text-center text-sm text-gray-500">
                      No courses available to attach.
                    </div>
                  ) : (
                    finalAvailableCourses.map((course) => {
                      const isSelected = selectedCourseIds.some((id) => String(id) === String(course.id));

                      return (
                        <div key={course.id} className="flex items-center justify-between gap-3 rounded-[12px] border border-[#dfe3e8] bg-[#f5f5f5] px-4 py-3">
                          <div>
                            <p className="text-[15px] font-semibold text-gray-800">{course.title}</p>
                            <p className="text-xs text-gray-500">Course</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCourse(course.id)}
                            className={`inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] font-semibold text-white transition-colors ${
                              isSelected ? "bg-[#1d69d7]" : "bg-[#1d69d7] hover:bg-[#1758b8]"
                            }`}
                          >
                            <Link2 className="h-4 w-4" />
                            {isSelected ? "Selected" : "Attach"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#dfe3e8] bg-transparent px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[14px] text-gray-500">
            Select one or more targets and then save to attach this assessment.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-[10px] border border-[#dfe3e8] bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (!isQuiz ? selectedCourseIds.length === 0 : selectedModuleIds.length === 0)}
              className="rounded-[10px] bg-[#1d69d7] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#1758b8] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save attachments"}
            </button>
          </div>
        </div>
      </div>
      {conflictMessage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="attachment-conflict-title"
            className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 id="attachment-conflict-title" className="text-lg font-bold text-gray-900">
                  Attachment not available
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">{conflictMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setConflictMessage(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close error message"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setConflictMessage(null)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
