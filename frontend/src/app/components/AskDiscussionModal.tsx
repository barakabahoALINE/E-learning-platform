import React from "react";
import { Button } from "../components/ui/button";
import { X } from "lucide-react";

interface Props {
  enrolledCourses: { id: string; title: string }[];
  defaultCourseId?: string;
  onClose: () => void;
  onPost: (
    courseId: string,
    courseTitle: string,
    title: string,
    description: string,
  ) => void | string;
  submitLabel?: string;
}

const AskDiscussionModal: React.FC<Props> = ({
  enrolledCourses,
  defaultCourseId,
  onClose,
  onPost,
  submitLabel = "Post",
}) => {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [courseId, setCourseId] = React.useState(
    defaultCourseId ?? enrolledCourses[0]?.id ?? "",
  );
  const titleRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const selected =
    enrolledCourses.find((c) => c.id === courseId) ?? enrolledCourses[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !title.trim() || !description.trim()) return;
    onPost(courseId, selected.title, title.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Discussion
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Ask a question
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {enrolledCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Question
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Write your question..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain your question so your classmates can help."
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AskDiscussionModal;
