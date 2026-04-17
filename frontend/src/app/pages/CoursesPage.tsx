import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { MainLayout } from "../components/MainLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Filter,
  Search,
  Loader2,
} from "lucide-react";
import { fetchCourses, fetchCategories, fetchLevels } from "../../features/courses/courseSlice";
import { Category, Level } from "../../features/courses/types";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";

export const CoursesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { courses, categories, levels, isLoading } = useAppSelector((state) => state.courses);
  
  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("popular");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchCourses(false));
    dispatch(fetchCategories());
    dispatch(fetchLevels());
  }, [dispatch]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileFiltersOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategory((prev) => (prev === categoryId ? null : categoryId));
  };

  const toggleLevel = (levelId: number) => {
    setSelectedLevels((prev) =>
      prev.includes(levelId) ? prev.filter((l) => l !== levelId) : [...prev, levelId],
    );
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || course.category === selectedCategory;

    const matchesLevel =
      selectedLevels.length === 0 || (course.level !== null && selectedLevels.includes(course.level));

    const isFree = parseFloat(course.price) === 0;
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && isFree) ||
      (priceFilter === "paid" && !isFree);

    return matchesSearch && matchesCategory && matchesLevel && matchesPrice;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === "popular") return (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "price-low") return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === "price-high") return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedLevels([]);
    setPriceFilter("all");
    setSearchQuery("");
  };

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    selectedLevels.length +
    (priceFilter !== "all" ? 1 : 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl mb-2">Explore Courses</h1>
          <p className="text-gray-600">
            Discover thousands of courses taught by expert instructors
          </p>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              type="search"
              placeholder="Search for courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <div className="flex gap-2">
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex md:hidden items-center flex-1">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] p-6" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle></SheetTitle>
                </SheetHeader>
                <div className="py-6 overflow-y-auto h-full pb-20">
                  <FilterSections
                    categories={categories}
                    selectedCategory={selectedCategory}
                    toggleCategory={toggleCategory}
                    levels={levels}
                    selectedLevels={selectedLevels}
                    toggleLevel={toggleLevel}
                    priceFilter={priceFilter}
                    setPriceFilter={setPriceFilter}
                    activeFiltersCount={activeFiltersCount}
                    clearFilters={clearFilters}
                  />
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="hidden md:flex items-center"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px] h-11">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2 px-1 py-2">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="rounded-full px-5 h-9"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category.id)}
                className="rounded-full px-5 h-9"
              >
                {category.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar (Desktop) */}
          <div className={`${showFilters ? 'hidden md:block' : 'hidden'} w-64 flex-shrink-0`}>
             <Card className="sticky top-20 border-none bg-gray-50/50 shadow-none">
                <CardContent className="p-0">
                  <FilterSections
                    categories={categories}
                    selectedCategory={selectedCategory}
                    toggleCategory={toggleCategory}
                    levels={levels}
                    selectedLevels={selectedLevels}
                    toggleLevel={toggleLevel}
                    priceFilter={priceFilter}
                    setPriceFilter={setPriceFilter}
                    activeFiltersCount={activeFiltersCount}
                    clearFilters={clearFilters}
                  />
                </CardContent>
             </Card>
          </div>

          {/* Course Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-gray-600 font-medium">Loading courses...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {sortedCourses.length} of {courses.length} courses
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCourses.map((course) => (
                <Link key={course.id} to={`/course/${course.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img
                          src={getImageUrl(course.thumbnail)}
                          alt={course.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        {parseFloat(course.price) === 0 && (
                          <Badge className="absolute top-3 right-3 bg-green-600">
                            Free
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <Badge variant="secondary" className="mb-2">
                          {categories.find(c => c.id === course.category)?.name || "Uncategorized"}
                        </Badge>
                        <h3 className="font-medium mb-2 line-clamp-2">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {course.description}
                        </p>

                        <div className="flex items-center space-x-2 mb-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {course.admin ? course.admin.substring(0, 2).toUpperCase() : course.instructor ? course.instructor.substring(0, 2).toUpperCase() : "AD"}
                          </div>
                          <span className="text-sm text-gray-600">
                            {course.admin || course.instructor || "Platform Instructor"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                            <span>{course?.rating || 0}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span>
                              {course.enrolled_students_count || 0}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{course.duration}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                          <Badge variant="outline">
                            {levels.find(l => l.id === course.level)?.name || "All Levels"}
                          </Badge>
                          <div className="font-medium">
                            {parseFloat(course.price) === 0 ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              <span>Frw {parseFloat(course.price).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {sortedCourses.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No courses found</h3>
                  <p className="text-gray-600 mb-4">
                    Try adjusting your filters or search terms
                  </p>
                  <Button onClick={clearFilters}>Clear filters</Button>
                </CardContent>
              </Card>
            )}
            </>
          )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

interface FilterSectionsProps {
  categories: Category[];
  selectedCategory: number | null;
  toggleCategory: (categoryId: number) => void;
  levels: Level[];
  selectedLevels: number[];
  toggleLevel: (levelId: number) => void;
  priceFilter: string;
  setPriceFilter: (value: string) => void;
  activeFiltersCount: number;
  clearFilters: () => void;
}

const FilterSections = ({
  levels,
  selectedLevels,
  toggleLevel,
  priceFilter,
  setPriceFilter,
  activeFiltersCount,
  clearFilters,
}: FilterSectionsProps) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-primary hover:text-primary/80"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Price Filter */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Price</h4>
        <div className="space-y-3">
          {[
            { id: "all", label: "All Courses" },
            { id: "free", label: "Free" },
            { id: "paid", label: "Paid" },
          ].map((price) => (
            <div key={price.id} className="flex items-center space-x-3 group cursor-pointer">
              <Checkbox
                id={`price-${price.id}`}
                checked={priceFilter === price.id}
                onCheckedChange={() => setPriceFilter(price.id)}
                className="rounded-sm"
              />
              <Label
                htmlFor={`price-${price.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-primary transition-colors cursor-pointer flex-1 py-1"
              >
                {price.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Level Filter */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500">Level</h4>
        <div className="space-y-3">
          {levels.map((level) => (
            <div key={level.id} className="flex items-center space-x-3 group cursor-pointer">
              <Checkbox
                id={`level-${level.id}`}
                checked={selectedLevels.includes(level.id)}
                onCheckedChange={() => toggleLevel(level.id)}
                className="rounded-sm"
              />
              <Label
                htmlFor={`level-${level.id}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-primary transition-colors cursor-pointer flex-1 py-1"
              >
                {level.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
