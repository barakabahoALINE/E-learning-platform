import { useEffect, useState } from "react";
import { X, Upload } from "lucide-react";
import { createCourse, updateCourse, fetchLevels, fetchCategories } from "../../../features/courses/courseSlice";
import { Course } from "../../../features/courses/types";
import StatusModal from "../ui/StatusModal";
import { useAppDispatch, useAppSelector } from "../../../hooks/reduxHooks";
import { selectCourseCategories, selectCourseLevels } from "../../../features/courses/courseSelectors";

interface CourseCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editCourse?: Course | null;
}

export function CourseCreationModal({
  isOpen,
  onClose,
  onSave,
  editCourse,
}: CourseCreationModalProps) {
  const dispatch = useAppDispatch();
  const levels = useAppSelector(selectCourseLevels);
  const categories = useAppSelector(selectCourseCategories);
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: editCourse?.title || "",
    description: editCourse?.description || "",
    category: editCourse?.category || (null as number | null),
    level: editCourse?.level || (null as number | null),
    price: editCourse?.price || "0",
    duration: editCourse?.duration || "",
    is_published: editCourse?.is_published || false,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>(editCourse?.thumbnail || "");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchLevels());
      dispatch(fetchCategories());
      setStep(1);
      setStatus(null);
    }
  }, [isOpen, dispatch]);

  const getImageUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    return `http://localhost:8000${url}`;
  };

  useEffect(() => {
    if (editCourse) {
      let numericPart = "";
      let unitPart = "weeks";
      
      const rawDuration = editCourse.duration || "";
      const match = rawDuration.match(/^(\d+)?\s*(.*)$/);
      if (match) {
        numericPart = match[1] || "";
        unitPart = match[2]?.toLowerCase() || "weeks";
      }

      setFormData({
        title: editCourse.title || "",
        description: editCourse.description || "",
        category: editCourse.category || null,
        level: editCourse.level || null,
        price: editCourse.price?.toString() || "0",
        duration: `${numericPart} ${unitPart}`,
        is_published: editCourse.is_published || false,
      });
      setThumbnailPreview(getImageUrl(editCourse.thumbnail));
    } else {
      setFormData({
        title: "",
        description: "",
        category: null,
        level: null,
        price: "0",
        duration: "1 weeks",
        is_published: false,
      });
      setThumbnailPreview("");
      setThumbnailFile(null);
    }
  }, [editCourse, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.category || !formData.level) {
      setStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    const courseData: any = {
      ...formData,
      price: parseFloat(formData.price),
    };

    if (thumbnailFile) {
      courseData.thumbnail = thumbnailFile;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      let response: any;
      if (editCourse) {
        response = await dispatch(updateCourse({ id: editCourse.id, data: courseData })).unwrap();
      } else {
        response = await dispatch(createCourse(courseData)).unwrap();
      }
      
      setIsSubmitting(false);
      setStatus({ type: "success", message: response.message || "Operation successful!" });

      setTimeout(() => {
        onSave();
        onClose();
      }, 3000);
    } catch (error: any) {
      setIsSubmitting(false);
      setStatus({ type: "error", message: error || "Failed to save course. Please check your inputs." });
    }
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editCourse ? "Edit Course" : "Create New Course"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s === step
                      ? "bg-blue-600 text-white"
                      : s < step
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                {s < 2 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      s < step ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-3 text-sm font-medium text-gray-700">
            {step === 1 && "Basic Information"}
            {step === 2 && "Thumbnail"}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., React Advanced Patterns"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief course description"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, category: val ? parseInt(val) : null })
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.level || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, level: val ? parseInt(val) : null })
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Level</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (Rwf)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder=" 0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={formData.duration.split(" ")[0] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const unit = formData.duration.split(" ")[1] || "weeks";
                        setFormData({ ...formData, duration: `${val} ${unit}` });
                      }}
                      className="w-24 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 4"
                    />
                    <select
                      value={formData.duration.split(" ")[1] || "weeks"}
                      onChange={(e) => {
                        const val = formData.duration.split(" ")[0] || "";
                        const unit = e.target.value;
                        setFormData({ ...formData, duration: `${val} ${unit}` });
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Thumbnail */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Thumbnail
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  {thumbnailPreview ? (
                    <div className="relative">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="max-h-40 mx-auto rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setThumbnailPreview("")}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-sm cursor-pointer"
                      >
                        Choose File
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Status
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="status"
                      checked={!formData.is_published}
                      onChange={() => setFormData({ ...formData, is_published: false })}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Save as Draft</div>
                      <div className="text-sm text-gray-500">
                        Course will not be visible to learners
                      </div>
                    </div>
                  </label>                 
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                    Note: You can only publish the course after adding lessons and assessment in the builder.
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Course Summary
                </h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>
                    <span className="font-medium">Title:</span>{" "}
                    {formData.title || "Not set"}
                  </p>
                  <p>
                    <span className="font-medium">Category:</span>{" "}
                    {categories.find(c => c.id === formData.category)?.name || "Not set"}
                  </p>
                  <p>
                    <span className="font-medium">Level:</span>{" "}
                    {levels.find(l => l.id === formData.level)?.name || "Not set"}
                  </p>
                  <p>
                    <span className="font-medium">Price:</span> Rwf {formData.price}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {formData.is_published ? "Published" : "Draft"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting && (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editCourse ? "Update Course" : "Create Course"}
              </button>
            )}
          </div>
        </div>
      </div>

      {status && (
        <StatusModal
          isOpen={!!status}
          type={status.type}
          title={status.type === "success" ? "Success" : "Error"}
          description={status.message}
          onClose={() => setStatus(null)}
        />
      )}
    </div>
  );
}