import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import {
  runGlobalSearch,
  setSearchQuery,
} from "../../features/search/searchSlice";
import {
  selectSearchQuery,
  selectSearchSuggestions,
  selectSearchStatus,
} from "../../features/search/searchSelectors";
import { selectAllCourses } from "../../features/courses/courseSelectors";
import { getMediaUrl } from "../utils/media";

export const GlobalSearch: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const query = useAppSelector(selectSearchQuery);
  const suggestions = useAppSelector(selectSearchSuggestions);
  const searchStatus = useAppSelector(selectSearchStatus);
  const allCourses = useAppSelector(selectAllCourses);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const popularCourses = useMemo(
    () =>
      allCourses
        .filter(
          (course) => course.status === "published" || course.is_published,
        )
        .slice()
        .sort(
          (a, b) =>
            (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0),
        )
        .slice(0, 5),
    [allCourses],
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch(runGlobalSearch(query));
      setIsOpen(true);
    }, 240);

    return () => window.clearTimeout(timer);
  }, [dispatch, query]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(event.target.value));
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelection = (courseId: string | number) => {
    navigate(`/course/${courseId}`);
    setIsOpen(false);
  };

  const visibleSuggestions = query.trim() ? suggestions : [];
  const hasNoMatches =
    query.trim() && !visibleSuggestions.length && searchStatus !== "loading";
  const hasQuery = Boolean(query.trim());

  const activeList = visibleSuggestions.length > 0 ? visibleSuggestions : [];

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && activeList.length > 0) {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % activeList.length);
    }

    if (event.key === "ArrowUp" && activeList.length > 0) {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? activeList.length - 1 : prev - 1));
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
        handleSelection(visibleSuggestions[activeIndex].id);
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const suggestionList =
    visibleSuggestions.length > 0 ? visibleSuggestions : [];

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          type="search"
          placeholder="Search courses..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10"
          aria-label="Global course search"
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-200/60 bg-white shadow-lg">
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Search courses
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search titles, descriptions, categories, instructors, skills,
                  and more.
                </p>
              </div>
              {searchStatus === "loading" && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto px-2 pb-2">
            {hasNoMatches ? (
              <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-slate-600 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  No matched courses found
                </p>
                <p>
                  Try a different keyword or press Enter to view the full
                  results page.
                </p>
                {popularCourses.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Recommended
                    </p>
                    <div className="mt-3 grid gap-2">
                      {popularCourses.slice(0, 3).map((course) => (
                        <button
                          key={course.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelection(course.id)}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-3 text-left transition hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <img
                            src={getMediaUrl(course.thumbnail)}
                            alt={course.title}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {course.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {course.instructor ||
                                course.admin ||
                                "Unknown instructor"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {suggestionList.length > 0 ? (
                  suggestionList.map((course, index) => (
                    <button
                      key={course.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelection(course.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        activeIndex === index
                          ? "bg-slate-100 dark:bg-slate-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <img
                        src={getMediaUrl(course.thumbnail)}
                        alt={course.title}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {course.title}
                          </p>
                          {course.is_published === false && (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {course.instructor ||
                            course.admin ||
                            "Instructor unavailable"}{" "}
                          • {course.category || "General"}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-slate-600 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Start typing to search courses
                    </p>
                    <p>Search across the platform without switching pages.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasQuery && !hasNoMatches && (
            <div className="border-t border-gray-200 px-4 py-3 text-right text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Press Enter to view the full search results page.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
