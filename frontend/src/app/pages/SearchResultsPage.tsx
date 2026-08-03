import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "../components/MainLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Filter } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import {
  selectCourseCategories,
  selectCourseLevels,
  selectAllCourses,
} from "../../features/courses/courseSelectors";
import {
  runGlobalSearch,
  setSearchQuery,
} from "../../features/search/searchSlice";
import {
  selectSearchQuery,
  selectSearchResults,
  selectSearchStatus,
} from "../../features/search/searchSelectors";
import { getMediaUrl } from "../utils/media";
import { Category, Level } from "../../features/courses/types";

const formatDuration = (duration: number | string | undefined) => {
  if (
    duration === undefined ||
    duration === null ||
    Number.isNaN(Number(duration))
  ) {
    return "Unknown duration";
  }
  const hours = Number(duration);
  if (hours <= 1) return `${hours} hr`;
  return `${hours} hrs`;
};

const getCategoryLabel = (course: any, categories: Category[]) => {
  if (!course.category) return "General";
  if (typeof course.category === "string") return course.category;
  const match = categories.find(
    (category) => Number(category.id) === Number(course.category),
  );
  return match?.name || String(course.category);
};

const getLevelLabel = (course: any, levels: Level[]) => {
  if (!course.level) return "All levels";
  if (typeof course.level === "string") return course.level;
  const match = levels.find(
    (level) => Number(level.id) === Number(course.level),
  );
  return match?.name || String(course.level);
};

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const queryParam = searchParams.get("q") || "";
  const query = useAppSelector(selectSearchQuery);
  const searchResults = useAppSelector(selectSearchResults);
  const status = useAppSelector(selectSearchStatus);
  const categories = useAppSelector(selectCourseCategories);
  const levels = useAppSelector(selectCourseLevels);
  const allCourses = useAppSelector(selectAllCourses);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedPrice, setSelectedPrice] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [selectedSort, setSelectedSort] = useState<string>("popular");
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");

  useEffect(() => {
    dispatch(setSearchQuery(queryParam));
    if (queryParam.trim()) {
      dispatch(runGlobalSearch(queryParam));
    }
  }, [dispatch, queryParam]);

  const instructors = useMemo(
    () =>
      Array.from(
        new Set(
          searchResults.map(
            (course) => course.instructor || course.admin || "Unknown",
          ),
        ),
      ),
    [searchResults],
  );

  const navigate = useNavigate();

  const filteredResults = useMemo(() => {
    return searchResults.filter((course) => {
      const matchesCategory =
        selectedCategory === "all" ||
        getCategoryLabel(course, categories) === selectedCategory;
      const matchesLevel =
        selectedLevel === "all" ||
        getLevelLabel(course, levels) === selectedLevel;
      const instructorName = course.instructor || course.admin || "Unknown";
      const matchesInstructor =
        selectedInstructor === "all" || instructorName === selectedInstructor;
      const matchesPrice =
        selectedPrice === "all" ||
        (selectedPrice === "free" && Number(course.price) === 0) ||
        (selectedPrice === "paid" && Number(course.price) > 0);
      const matchesRating =
        selectedRating === "all" ||
        (selectedRating === "4+" && (course.rating || 0) >= 4) ||
        (selectedRating === "3+" && (course.rating || 0) >= 3) ||
        (selectedRating === "2+" && (course.rating || 0) >= 2);
      return (
        matchesCategory &&
        matchesLevel &&
        matchesInstructor &&
        matchesPrice &&
        matchesRating
      );
    });
  }, [
    searchResults,
    categories,
    levels,
    selectedCategory,
    selectedLevel,
    selectedPrice,
    selectedRating,
    selectedInstructor,
  ]);

  const sortedResults = useMemo(() => {
    return filteredResults.slice().sort((a, b) => {
      if (selectedSort === "popular")
        return (
          (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0)
        );
      if (selectedSort === "newest")
        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      if (selectedSort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (selectedSort === "alphabetical")
        return String(a.title).localeCompare(String(b.title));
      return 0;
    });
  }, [filteredResults, selectedSort]);

  const hasResults = sortedResults.length > 0;
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
        .slice(0, 4),
    [allCourses],
  );

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setSearchParams({ q: nextQuery });
    dispatch(setSearchQuery(nextQuery));
    if (nextQuery.trim()) {
      dispatch(runGlobalSearch(nextQuery));
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold">Search results</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Explore courses across the entire platform and refine results
                using filters.
              </p>
            </div>
            <div className="w-full max-w-md">
              <Input
                type="search"
                placeholder="Refine search query"
                value={query}
                onChange={handleQueryChange}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
          <aside className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Filter className="h-4 w-4" />
              Refine search
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Category
                </p>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Difficulty
                </p>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {levels.map((level) => (
                      <SelectItem key={level.id} value={level.name}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Instructor
                </p>
                <Select
                  value={selectedInstructor}
                  onValueChange={setSelectedInstructor}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="All instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All instructors</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor} value={instructor}>
                        {instructor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Price
                </p>
                <Select value={selectedPrice} onValueChange={setSelectedPrice}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any price</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Rating
                </p>
                <Select
                  value={selectedRating}
                  onValueChange={setSelectedRating}
                >
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any rating</SelectItem>
                    <SelectItem value="4+">4 stars & up</SelectItem>
                    <SelectItem value="3+">3 stars & up</SelectItem>
                    <SelectItem value="2+">2 stars & up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedCategory("all");
                setSelectedLevel("all");
                setSelectedPrice("all");
                setSelectedRating("all");
                setSelectedInstructor("all");
                setSelectedSort("popular");
              }}
            >
              Clear filters
            </Button>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing {sortedResults.length} of {searchResults.length}{" "}
                  matching courses
                </p>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {query ? `Results for "${query}"` : "All published courses"}
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Sort by
                </div>
                <Select value={selectedSort} onValueChange={setSelectedSort}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {status === "loading" ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                Loading results...
              </div>
            ) : !hasResults ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  No courses found
                </p>
                <p className="mt-2 text-sm">
                  Try a broader keyword or clear filters to discover more
                  courses across the platform.
                </p>
                {popularCourses.length > 0 && (
                  <div className="mt-6 space-y-3 text-left">
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Recommended courses
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {popularCourses.map((course) => (
                        <Card key={course.id} className="overflow-hidden">
                          <CardContent className="flex items-center gap-3 p-4">
                            <img
                              src={getMediaUrl(course.thumbnail)}
                              alt={course.title}
                              className="h-14 w-14 rounded-xl object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {course.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {course.instructor ||
                                  course.admin ||
                                  "Instructor unavailable"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedResults.map((course) => (
                  <Card key={course.id} className="overflow-hidden">
                    <CardContent className="grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
                      <img
                        src={getMediaUrl(course.thumbnail)}
                        alt={course.title}
                        className="h-32 w-full rounded-3xl object-cover md:h-24 md:w-32"
                      />
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                              {course.title}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {course.instructor ||
                                course.admin ||
                                "Instructor unavailable"}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="uppercase tracking-[0.18em]"
                          >
                            {getLevelLabel(course, levels)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {course.description}
                        </p>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-500 dark:text-slate-400">
                          <span>{getCategoryLabel(course, categories)}</span>
                          <span>• {formatDuration(course.duration)}</span>
                          <span>
                            • {course.price === 0 ? "Free" : `$${course.price}`}
                          </span>
                          <span>
                            •{" "}
                            {course.rating
                              ? `${course.rating.toFixed(1)} ★`
                              : "No rating"}
                          </span>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          View course
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </MainLayout>
  );
};
