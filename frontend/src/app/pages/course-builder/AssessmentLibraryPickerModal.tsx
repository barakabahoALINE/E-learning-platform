import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, FileQuestion, Link2, RefreshCw, Search, X } from "lucide-react";
import {
  AssessmentLibraryItem,
  listAssessmentLibrary,
} from "../../../features/assessments/assessmentLibraryAdapter";
import type { AssessmentType } from "../../../features/assessments/types";

interface AssessmentLibraryPickerModalProps {
  type: AssessmentType;
  onClose: () => void;
  onCreateNew: () => void;
  onUseExisting: (item: AssessmentLibraryItem) => Promise<void>;
}

export function AssessmentLibraryPickerModal({
  type,
  onClose,
  onCreateNew,
  onUseExisting,
}: AssessmentLibraryPickerModalProps) {
  const [items, setItems] = useState<AssessmentLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        const library = await listAssessmentLibrary();
        // Only show backend course assessments (not local templates)
        const courseItems = Array.isArray(library) ? library.filter((it) => it.source === 'course') : [];
        if (active) setItems(courseItems);
      } catch (err: any) {
        if (active) setError(err?.message || "Unable to load assessments");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items
      .filter((item) => item.assessment_type === type)
      .filter((item) => {
        if (!normalizedQuery) return true;
        return [
          item.title,
          item.courseTitle,
          item.moduleTitle,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      });
  }, [items, query, type]);

  const handleUseExisting = async (item: AssessmentLibraryItem) => {
    try {
      setSelectedId(item.id);
      await onUseExisting(item);
    } finally {
      setSelectedId(null);
    }
  };

  const label = type === "QUIZ" ? "Quiz" : "Final Assessment";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs" onClick={onClose} />

      <div className="relative bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Add {label}</h3>
              <p className="text-xs text-gray-500">Create new or copy from the assessment library</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}s`}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={onCreateNew}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Create New
          </button>
        </div>

        <div className="p-5 max-h-[56vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-14 text-center text-sm text-gray-500">Loading assessments...</div>
          ) : error ? (
            <div className="py-14 text-center text-sm text-red-600">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No {label.toLowerCase()}s found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={`${item.source}-${item.id}`} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1">
                      <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {item.source === "local"
                        ? "Local assessment template"
                        : [item.courseTitle, item.moduleTitle].filter(Boolean).join(" / ")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="text-[11px] px-2 py-1 rounded bg-gray-50 text-gray-600 border border-gray-100">
                        {(item.questions || []).length} question{(item.questions || []).length === 1 ? "" : "s"}
                      </span>
                      {item.duration != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          <Clock className="w-3 h-3" />
                          {item.duration}m
                        </span>
                      )}
                      {item.max_attempts != null && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          <RefreshCw className="w-3 h-3" />
                          {item.max_attempts}x
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUseExisting(item)}
                    disabled={selectedId === item.id}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <Link2 className="w-4 h-4" />
                    {selectedId === item.id ? "Selecting..." : "Attach"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
