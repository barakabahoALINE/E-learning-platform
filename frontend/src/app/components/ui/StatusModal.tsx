import { useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "./button";

interface StatusModalProps {
  isOpen: boolean;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description: string | Record<string, string | string[]>;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  showCloseButton?: boolean;
}

const config = {
  success: {
    icon: CheckCircle,
    label: "Success",
    iconColor: "text-green-600",
    ring: "ring-green-200",
    band: "bg-green-50",
    labelColor: "text-green-700",
    btn: "bg-green-600 hover:bg-green-700",
    dismiss:
      "bg-green-50 hover:bg-green-100 text-gray-400 hover:text-gray-600",
  },
  error: {
    icon: XCircle,
    label: "Error",
    iconColor: "text-red-600",
    ring: "ring-red-200",
    band: "bg-red-50",
    labelColor: "text-red-700",
    btn: "bg-red-600 hover:bg-red-700",
    dismiss: "bg-red-50 hover:bg-red-100 text-gray-400 hover:text-gray-600",
  },
  warning: {
    icon: AlertCircle,
    label: "Warning",
    iconColor: "text-amber-600",
    ring: "ring-amber-200",
    band: "bg-amber-50",
    labelColor: "text-amber-700",
    btn: "bg-amber-600 hover:bg-amber-700",
    dismiss:
      "bg-amber-50 hover:bg-amber-100 text-gray-400 hover:text-gray-600",
  },
  info: {
    icon: Info,
    label: "Info",
    iconColor: "text-blue-600",
    ring: "ring-blue-200",
    band: "bg-blue-50",
    labelColor: "text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    dismiss: "bg-blue-50 hover:bg-blue-100 text-gray-400 hover:text-gray-600",
  },
};

export default function StatusModal({
  isOpen,
  type,
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "Continue",
  showCloseButton = true,
}: StatusModalProps) {
  const cfg = config[type] || config.info;
  const Icon = cfg.icon;
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const descContent =
    typeof description === "object" && description !== null ? (
      <div className="space-y-1">
        {Object.entries(description).map(([key, value]) => (
          <div key={key}>
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </div>
        ))}
      </div>
    ) : (
      description
    );

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-white shadow-xl animate-in slide-in-from-bottom-3 duration-200">

        <div className={`${cfg.band} px-7 pt-8 pb-6 flex flex-col items-center text-center`}>
          <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-white ring-4 ${cfg.ring} mb-4`}>
            <Icon size={24} className={cfg.iconColor} strokeWidth={2} />
          </div>

          <span className={`text-[11px] font-semibold tracking-widest uppercase ${cfg.labelColor} mb-2`}>
            {cfg.label}
          </span>

          <h3 className="text-lg font-semibold text-gray-900 leading-snug">
            {title}
          </h3>
        </div>

        <div className="px-7 pt-5 pb-6">
          <p className="text-sm text-gray-500 leading-relaxed text-center mb-5">
            {descContent as React.ReactNode}
          </p>

          <Button onClick={handleConfirm} className={`w-full ${showCloseButton ? "mb-2" : ""} ${cfg.btn}`}>
            {confirmLabel}
          </Button>

          {showCloseButton && (
            <Button variant="ghost" onClick={onClose} className={`w-full ${cfg.dismiss}`}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
