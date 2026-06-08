import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    Card,
    CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
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
    Award,
    Search,
    Grid3x3,
    List,
    TrendingUp,
    Target,
    Flame,
    Play,
    CheckCircle,
    User,
    BookMarked,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { fetchMyEnrollments } from "../../features/enrollments/enrollmentSlice";
import { fetchCourses, fetchCategories, fetchLevels } from "../../features/courses/courseSlice";
import {
    fetchCourseProgress,
    fetchCourseSectionsProgress,
} from "../../features/progress/progressSlice";
import { Course } from "../../features/courses/types";
import { MainLayout } from "../components/MainLayout";
import { getMediaUrl } from "../utils/media";

type ViewMode = "grid" | "list";
type FilterMode = "all" | "in-progress" | "completed";
type SortMode =
    | "recent-accessed"
    | "recent-enrolled"
    | "progress"
    | "name-asc"
    | "name-desc";

// Omit the conflicting 'status' property from Course and add learning-specific fields
type LearningCourseItem = Omit<Course, "status"> & {
    progress: number;
    status: "in-progress" | "completed";
    lastAccessedAt: string;
    completedAt?: string | null;
    enrolledAt: string;
    categoryLabel: string;
    levelLabel: string;
    instructorName: string;
    enrollmentId: number;
    courseId: number;
};

export const MyLearningPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { myEnrollments } = useAppSelector((state) => state.enrollments);
    const { courses, categories, levels } = useAppSelector((state) => state.courses);
    const { courseProgress, courseSectionsProgress } = useAppSelector((state) => state.progress);

    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const saved = localStorage.getItem("myLearning_viewMode");
        return (saved as ViewMode) || "grid";
    });
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [sortMode, setSortMode] = useState<SortMode>("recent-accessed");
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    useEffect(() => {
        localStorage.setItem("myLearning_viewMode", viewMode);
    }, [viewMode]);

    useEffect(() => {
        dispatch(fetchMyEnrollments());
        dispatch(fetchCourses(false));
        dispatch(fetchCategories());
        dispatch(fetchLevels());
    }, [dispatch]);

    useEffect(() => {
        myEnrollments.forEach((enrollment) => {
            dispatch(fetchCourseProgress(Number(enrollment.course)));
            dispatch(fetchCourseSectionsProgress(Number(enrollment.course)));
        });
    }, [dispatch, myEnrollments]);

    const getItemProgress = (courseId: number) => {
        const sections = courseSectionsProgress[courseId] || [];
        return {
            total: sections.reduce((sum, section) => sum + (section.total_contents || 0), 0),
            completed: sections.reduce((sum, section) => sum + (section.completed_contents || 0), 0),
        };
    };

    const enrolledCoursesWithHistory = useMemo(() => {
        return myEnrollments
            .filter((enrollment) => enrollment.status !== "cancelled")
            .map((enrollment) => {
                const course = courses.find((c) => Number(c.id) === Number(enrollment.course));
                if (!course) return null;

                const progressData = courseProgress[Number(enrollment.course)];
                const itemProgress = getItemProgress(Number(enrollment.course));
                const progress = Math.round(progressData?.completion_percentage || progressData?.progress_percentage || 0);
                const status = enrollment.status === "completed" || progressData?.course_completed || progress >= 100
                    ? "completed"
                    : "in-progress";

                const categoryLabel =
                    typeof course.category === "string"
                        ? course.category
                        : categories.find((category) => category.id === Number(course.category))?.name || "Uncategorized";

                const levelLabel =
                    typeof course.level === "string"
                        ? course.level
                        : levels?.find((l) => Number(l.id) === Number(course.level))?.name || String(course.level || "All Levels");

                const instructorName =
                    typeof course.instructor === "string"
                        ? course.instructor
                        : course.instructor || course.admin || "Platform Instructor";

                return {
                    ...course,
                    progress,
                    status,
                    lastAccessedAt: progressData?.completed_at || enrollment.enrolled_at,
                    completedAt: progressData?.completed_at ?? null,
                    enrolledAt: enrollment.enrolled_at,
                    categoryLabel,
                    levelLabel,
                    instructorName,
                    enrollmentId: enrollment.id,
                    courseId: Number(enrollment.course),
                } as LearningCourseItem;
            })
            .filter(Boolean) as LearningCourseItem[];
    }, [myEnrollments, courses, categories, levels, courseProgress, courseSectionsProgress]);

    const filteredCourses = useMemo(() => {
        let filtered = enrolledCoursesWithHistory;

        if (filterMode === "in-progress") {
            filtered = filtered.filter((c) => c.status === "in-progress");
        } else if (filterMode === "completed") {
            filtered = filtered.filter((c) => c.status === "completed");
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((c) =>
                c.title.toLowerCase().includes(query) ||
                c.categoryLabel.toLowerCase().includes(query) ||
                c.instructorName.toLowerCase().includes(query),
            );
        }

        if (categoryFilter !== "all") {
            filtered = filtered.filter((c) => c.categoryLabel === categoryFilter);
        }

        return [...filtered].sort((a, b) => {
            switch (sortMode) {
                case "recent-accessed":
                    return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
                case "recent-enrolled":
                    return new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime();
                case "progress":
                    return b.progress - a.progress;
                case "name-asc":
                    return a.title.localeCompare(b.title);
                case "name-desc":
                    return b.title.localeCompare(a.title);
                default:
                    return 0;
            }
        });
    }, [enrolledCoursesWithHistory, filterMode, searchQuery, categoryFilter, sortMode]);

    const categoryOptions = useMemo(() => {
        return Array.from(new Set(enrolledCoursesWithHistory.map((c) => c.categoryLabel)));
    }, [enrolledCoursesWithHistory]);

    const stats = useMemo(() => {
        const totalEnrolled = enrolledCoursesWithHistory.length;
        const completed = enrolledCoursesWithHistory.filter((c) => c.status === "completed").length;
        const inProgress = enrolledCoursesWithHistory.filter((c) => c.status === "in-progress").length;
        const avgCompletion = totalEnrolled > 0 ? Math.round(enrolledCoursesWithHistory.reduce((sum, c) => sum + c.progress, 0) / totalEnrolled) : 0;
        const totalHours = enrolledCoursesWithHistory.reduce((sum, c) => {
            const hours = Number(c.duration) || 0;
            return sum + (hours * c.progress) / 100;
        }, 0);

        return {
            totalEnrolled,
            completed,
            inProgress,
            avgCompletion,
            totalHours: Math.round(totalHours),
            learningStreak: 7,
        };
    }, [enrolledCoursesWithHistory]);

    const recentCourse = useMemo(() => {
        return enrolledCoursesWithHistory
            .filter((c) => c.status === "in-progress")
            .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())[0] || null;
    }, [enrolledCoursesWithHistory]);

    const handleContinueLearning = (courseId: string | number) => {
        const courseIdStr = String(courseId);
        const course = courses.find((c) => String(c.id) === courseIdStr);
        const moduleId = course?.modules?.[0]?.id;

        if (moduleId) {
            navigate(`/learning/${courseIdStr}/${moduleId}`);
        } else {
            navigate(`/course/${courseIdStr}`);
        }
    };

    const handleViewCertificate = (courseId: number) => {
        navigate(`/certificate/${courseId}`);
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl mb-2">My Learning</h1>
                    <p className="text-gray-600">
                        Track your progress and continue your learning journey
                    </p>
                </div>

                {/* Learning Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Enrolled</p>
                                    <p className="text-2xl mt-1">{stats.totalEnrolled}</p>
                                </div>
                                <BookOpen className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-2xl mt-1">{stats.completed}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">In Progress</p>
                                    <p className="text-2xl mt-1">{stats.inProgress}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-orange-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Avg Progress</p>
                                    <p className="text-2xl mt-1">{stats.avgCompletion}%</p>
                                </div>
                                <Target className="w-8 h-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Learning Hours</p>
                                    <p className="text-2xl mt-1">{stats.totalHours}h</p>
                                </div>
                                <Clock className="w-8 h-8 text-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Day Streak</p>
                                    <p className="text-2xl mt-1">{stats.learningStreak}</p>
                                </div>
                                <Flame className="w-8 h-8 text-red-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Continue Where You Left Off */}
                {recentCourse && (
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={getMediaUrl(recentCourse.thumbnail)}
                                        alt={recentCourse.title}
                                        className="w-24 h-16 object-cover rounded-lg"
                                    />
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            Continue Where You Left Off
                                        </p>
                                        <h3 className="text-xl mb-2">{recentCourse.title}</h3>
                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                            <span className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1" />
                                                Last accessed{" "}
                                                {new Date(
                                                    recentCourse.lastAccessedAt,
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>{recentCourse.progress}% complete</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    size="lg"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleContinueLearning(recentCourse.courseId)}
                                >
                                    <Play className="w-5 h-5 mr-2" />
                                    Continue Learning
                                </Button>
                            </div>
                            <Progress value={recentCourse.progress} className="mt-4 h-2" />
                        </CardContent>
                    </Card>
                )}

                {/* Filters and Search */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                    <Input
                                        type="search"
                                        placeholder="Search by title, instructor, or category..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Category Filter */}
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-full lg:w-48">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categoryOptions.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {cat}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Sort */}
                            <Select
                                value={sortMode}
                                onValueChange={(v) => setSortMode(v as SortMode)}
                            >
                                <SelectTrigger className="w-full lg:w-48">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent-accessed">
                                        Recently Accessed
                                    </SelectItem>
                                    <SelectItem value="recent-enrolled">
                                        Recently Enrolled
                                    </SelectItem>
                                    <SelectItem value="progress">Progress</SelectItem>
                                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* View Toggle */}
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("grid")}
                                >
                                    <Grid3x3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "secondary" : "ghost"}
                                    size="icon"
                                    onClick={() => setViewMode("list")}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Tabs */}
                <div className="flex space-x-2 border-b border-gray-200">
                    <button
                        onClick={() => setFilterMode("all")}
                        className={`px-4 py-2 border-b-2 transition ${filterMode === "all"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        All Courses ({enrolledCoursesWithHistory.length})
                    </button>
                    <button
                        onClick={() => setFilterMode("in-progress")}
                        className={`px-4 py-2 border-b-2 transition ${filterMode === "in-progress"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        In Progress ({stats.inProgress})
                    </button>
                    <button
                        onClick={() => setFilterMode("completed")}
                        className={`px-4 py-2 border-b-2 transition ${filterMode === "completed"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-600 hover:text-gray-900"
                            }`}
                    >
                        Completed ({stats.completed})
                    </button>
                </div>

                {/* Courses Grid/List */}
                {filteredCourses.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <BookMarked className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl mb-2">No courses found</h3>
                            <p className="text-gray-600 mb-4">
                                {filterMode === "all"
                                    ? "You haven't enrolled in any courses yet."
                                    : filterMode === "in-progress"
                                        ? "You don't have any courses in progress."
                                        : "You haven't completed any courses yet."}
                            </p>
                            <Link to="/courses">
                                <Button>Browse Courses</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCourses.map((course) => (
                            <Card key={course.enrollmentId} className="hover:shadow-lg transition">
                                <div className="relative">
                                    <img
                                        src={getMediaUrl(course.thumbnail)}
                                        alt={course.title}
                                        className="w-full h-48 object-cover rounded-t-lg"
                                    />
                                    <Badge className={`absolute top-3 right-3 ${course.status === "completed" ? "bg-green-600" : "bg-orange-600"}`}>
                                        {course.status === "completed" ? "Completed" : "In Progress"}
                                    </Badge>
                                </div>
                                <CardContent className="p-4">
                                    <Badge variant="secondary" className="mb-2">
                                        {course.categoryLabel}
                                    </Badge>
                                    <h3 className="text-lg mb-2 line-clamp-2">{course.title}</h3>
                                    <div className="flex items-center text-sm text-gray-600 mb-3">
                                        <User className="w-4 h-4 mr-1" />
                                        {course.instructorName}
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Progress</span>
                                            <span className="font-medium">{course.progress}%</span>
                                        </div>
                                        <Progress value={course.progress} className="h-2" />
                                    </div>

                                    <div className="text-xs text-gray-500 mb-3">
                                        Last accessed:{" "}
                                        {new Date(course.lastAccessedAt).toLocaleDateString()}
                                    </div>

                                    {course.status === "completed" ? (
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleViewCertificate(course.courseId)}
                                            >
                                                <Award className="w-4 h-4 mr-1" />
                                                View Certificate
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/course/${course.courseId}`)}
                                            >
                                                Details
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => handleContinueLearning(course.courseId)}
                                        >
                                            <Play className="w-4 h-4 mr-2" />
                                            Continue Learning
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCourses.map((course) => (
                            <Card key={course.enrollmentId} className="hover:shadow-md transition">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={getMediaUrl(course.thumbnail)}
                                            alt={course.title}
                                            className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-lg line-clamp-1">
                                                            {course.title}
                                                        </h3>
                                                        <Badge
                                                            variant="secondary"
                                                            className={
                                                                course.status === "completed"
                                                                    ? "bg-green-100 text-green-700"
                                                                    : "bg-orange-100 text-orange-700"
                                                            }
                                                        >
                                                            {course.status === "completed"
                                                                ? "Completed"
                                                                : "In Progress"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center">
                                                            <User className="w-4 h-4 mr-1" />
                                                            {course.instructorName}
                                                        </span>
                                                        <span>{course.categoryLabel}</span>
                                                        <span>{course.levelLabel}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between text-sm mb-1">
                                                        <span className="text-gray-600">
                                                            Progress: {course.progress}%
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            Last accessed:{" "}
                                                            {new Date(
                                                                course.lastAccessedAt,
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <Progress value={course.progress} className="h-2" />
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {course.status === "completed" ? (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleViewCertificate(course.courseId)}
                                                            >
                                                                <Award className="w-4 h-4 mr-1" />
                                                                Certificate
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => navigate(`/course/${course.courseId}`)}
                                                            >
                                                                Details
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            onClick={() => handleContinueLearning(course.courseId)}
                                                        >
                                                            <Play className="w-4 h-4 mr-2" />
                                                            Continue
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
