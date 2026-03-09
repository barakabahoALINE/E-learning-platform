import { useEffect, useState } from "react";
import { Plus, Search, Filter, Users, FileText, Edit2, Trash2, Layers, CheckCircle, XCircle } from "lucide-react";
import { CourseCreationModal } from "../components/courses/CourseCreationModal";
import StatusModal from "../components/ui/StatusModal";
import { useNavigate } from "react-router-dom";
import { fetchCourses, deleteCourse, publishCourse, unpublishCourse, fetchCategories } from "../../features/courses/courseSlice";
import { Course, Category } from "../../features/courses/types";
import { Button } from "../components/ui/button";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { selectAllCourses, selectCourseCategories, selectCoursesLoading } from "../../features/courses/courseSelectors";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import { Card, CardContent } from "../components/ui/card";

export function CoursesPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectAllCourses);
  const categories = useAppSelector(selectCourseCategories);
  const isLoading = useAppSelector(selectCoursesLoading);
  
  const getImageUrl = (url: string | null) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  useEffect(() => {
    dispatch(fetchCourses(true));
    dispatch(fetchCategories());
  }, [dispatch]);

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'published' && course.is_published) || 
      (statusFilter === 'draft' && !course.is_published);
    
    const matchesCategory = 
      activeCategory === 'all' || 
      String(course.category) === String(activeCategory);
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getCategoryCount = (categoryId: number | 'all') => {
    return courses.filter(course => {
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'published' && course.is_published) || 
        (statusFilter === 'draft' && !course.is_published);
      
      const matchesCategory = categoryId === 'all' || String(course.category) === String(categoryId);
      return matchesStatus && matchesCategory;
    }).length;
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setActiveCategory("all");
  };

  const handleSaveCourse = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    dispatch(fetchCourses(true));
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
    setHoveredCourse(null);
  };

  const handleDeleteCourse = async (id: number) => {
    try {
      const response = await dispatch(deleteCourse(id)).unwrap();
      setDeleteConfirm(null);
      setHoveredCourse(null);
      setStatus({
        type: "success",
        title: "Course Deleted",
        message: response.message || "The course has been successfully removed."
      });
      dispatch(fetchCourses(true));
    } catch (error: any) {
      setStatus({
        type: "error",
        title: "Delete Failed",
        message: error || "Something went wrong while deleting the course."
      });
    }
  };

  const handleTogglePublish = (course: Course) => {
    if (course.is_published) {
      dispatch(unpublishCourse(course.id));
    } else {
      dispatch(publishCourse(course.id));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  return (
    <div className="max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage learning courses
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Create Course
        </button>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${statusFilter !== 'all' ? 'border-blue-500 text-blue-600' : ''}`}
            >
              <Filter className={`w-5 h-5 ${statusFilter !== 'all' ? 'text-blue-600' : 'text-gray-600'}`} />
              <span className="font-medium capitalize">{statusFilter === 'all' ? 'Status' : statusFilter}</span>
            </button>

            {showFilterDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowFilterDropdown(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {(['all', 'published', 'draft'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer ${statusFilter === status ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                    >
                      <span className="capitalize">{status}</span>
                      {statusFilter === status && <CheckCircle className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="w-full max-w-full overflow-hidden">
          <ScrollArea className="w-full whitespace-nowrap pb-2 -mb-2">
            <div className="flex items-center gap-2 w-max px-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeCategory === 'all'
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600"
                }`}
              >
                <span>All Courses</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {getCategoryCount('all')}
                </span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {getCategoryCount(cat.id)}
                  </span>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>
      </div>

      {!isLoading && filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-primary">No courses found</h3>
          <p className="text-gray-500 mb-8 max-w-sm">
            We couldn't find any courses matching your current search or filter criteria. Try adjusting them or clear everything to start over.
          </p>
          <Button onClick={clearFilters} type="submit"> Clear all filters </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, idx) => (
            <Card
              key={course.id || `course-new-${idx}`}
              className="overflow-hidden hover:shadow-md transition-all h-full flex flex-col"
              onMouseEnter={() => setHoveredCourse(course.id)}
              onMouseLeave={() => setHoveredCourse(null)}
            >
              <CardContent className="p-0 h-full flex flex-col">
              <div className="relative">
                <img
                  src={getImageUrl(course.thumbnail)}
                  alt={course.title}
                  className="w-full h-60 object-cover"
                />
                {hoveredCourse === course.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                    <button
                      onClick={() => navigate(`/admin/courses/builder/${course.id}`)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      Build Course
                    </button>
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(course.id)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{course.admin}</p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{course.lessons_count || 0} lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{course.enrolled_students_count || 0} enrolled</span>
                  </div>
                </div>

                <button
                  onClick={() => handleTogglePublish(course)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    course.is_published
                      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100"
                  }`}
                >
                  {course.is_published ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Published
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      Draft
                    </>
                  )}
                </button>
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Course
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this course? This action cannot be undone and all course content will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCourse(deleteConfirm)}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}

      <CourseCreationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCourse}
        editCourse={editingCourse}
      />

      {status && (
        <StatusModal
          isOpen={!!status}
          type={status.type}
          title={status.title}
          description={status.message}
          onClose={() => setStatus(null)}
        />
      )}
    </div>
  );
}