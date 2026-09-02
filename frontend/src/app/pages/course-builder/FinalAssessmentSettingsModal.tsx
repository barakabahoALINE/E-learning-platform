import { useState } from "react";
import { X, Clock, RefreshCw, Info } from "lucide-react";

interface FinalAssessmentSettings {
  title: string;
  duration: number;
  max_attempts: number;
  pass_mark: number;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: number;
}

interface FinalAssessmentSettingsModalProps {
  /** Current values (used when editing an existing assessment) */
  initialValues?: Partial<FinalAssessmentSettings>;
  /** True when we're creating for the first time — button says "Create & Configure" */
  isCreating?: boolean;
  onClose: () => void;
  /** Called with the chosen settings. Parent decides whether to create or update. */
  onConfirm: (settings: FinalAssessmentSettings) => Promise<void>;
}

export function FinalAssessmentSettingsModal({
  initialValues,
  isCreating = false,
  onClose,
  onConfirm,
}: FinalAssessmentSettingsModalProps) {
  const [title, setTitle] = useState<string>(initialValues?.title ?? "Final Assessment");
  const [duration, setDuration] = useState<number>(initialValues?.duration ?? 60);
  const [maxAttempts, setMaxAttempts] = useState<number>(initialValues?.max_attempts ?? 3);
  const [passMark, setPassMark] = useState<number>(initialValues?.pass_mark ?? 60);
  const [tabSwitchEnabled, setTabSwitchEnabled] = useState<boolean>(initialValues?.tab_switch_enabled ?? false);
  const [tabSwitchLimit, setTabSwitchLimit] = useState<number>(initialValues?.tab_switch_limit ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (duration < 1) {
      setError("Duration must be at least 1 minute.");
      return;
    }
    if (maxAttempts < 1) {
      setError("Max attempts must be at least 1.");
      return;
    }
    if (passMark < 1 || passMark > 100) {
      setError("Pass mark must be between 1 and 100.");
      return;
    }
    if (tabSwitchEnabled && tabSwitchLimit < 0) {
      setError("Tab switch limit must be 0 or greater.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onConfirm({
        title: title.trim(),
        duration,
        max_attempts: maxAttempts,
        pass_mark: passMark,
        tab_switch_enabled: tabSwitchEnabled,
        tab_switch_limit: tabSwitchEnabled ? tabSwitchLimit : 0,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isCreating ? "Configure Final Assessment" : "Edit Assessment Settings"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set the rules for how students will take this assessment
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-sm">Tab switch</span>
              <button
                type="button"
                onClick={() => setTabSwitchEnabled((value) => !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${tabSwitchEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${tabSwitchEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </label>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Final Assessment"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 60"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Time limit students have to complete the assessment.
            </p>
          </div>

          {/* Max Attempts */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              Maximum Attempts
            </label>
            <input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 3"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Number of times a student can attempt this assessment.
            </p>
          </div>

          {/* Pass Mark */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Info className="w-4 h-4 text-green-500" />
              Pass Mark (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={passMark}
              onChange={(e) => setPassMark(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 60"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Minimum percentage score required to pass.
            </p>
          </div>

          {tabSwitchEnabled && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <span className="text-gray-700">tabswitch</span>
              </label>
              <input
                type="number"
                min={0}
                value={tabSwitchLimit}
                onChange={(e) => setTabSwitchLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 0"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Maximum number of allowed tab switches during the assessment.
              </p>
            </div>
          )}

          {/* Summary pill row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <Clock className="w-3 h-3" /> {duration} min
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              <RefreshCw className="w-3 h-3" /> {maxAttempts} attempt{maxAttempts !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
              <Info className="w-3 h-3" /> Pass: {passMark}%
            </span>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isCreating ? "Save & Continue" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
