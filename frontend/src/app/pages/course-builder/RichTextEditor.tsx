import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, List } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing here...",
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false
  });

  const checkActiveStates = () => {
    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      list: document.queryCommandState("insertUnorderedList")
    });
  };

  useEffect(() => {
    if (editorRef.current && !isFocused) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, isFocused]);

  const execCommand = (command: string, arg?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    checkActiveStates();
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          execCommand("bold");
          break;
        case "i":
          e.preventDefault();
          execCommand("italic");
          break;
        case "u":
          e.preventDefault();
          execCommand("underline");
          break;
      }
    }
    // Update states after a short delay to allow the cursor to move
    setTimeout(checkActiveStates, 10);
  };

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white ${isFocused ? 'ring-2 ring-blue-500 border-transparent shadow-sm' : ''} ${disabled ? 'bg-gray-50 opacity-60' : ''} transition-all`}>
      {!disabled && (
        <div className="flex items-center gap-1 p-1 bg-gray-50 border-b border-gray-100 overflow-x-auto">
          <ToolbarButton
            onClick={() => execCommand("bold")}
            icon={<Bold className="w-4 h-4" />}
            title="Bold (Ctrl+B)"
            active={activeStates.bold}
          />
          <ToolbarButton
            onClick={() => execCommand("italic")}
            icon={<Italic className="w-4 h-4" />}
            title="Italic (Ctrl+I)"
            active={activeStates.italic}
          />
          <ToolbarButton
            onClick={() => execCommand("underline")}
            icon={<Underline className="w-4 h-4" />}
            title="Underline (Ctrl+U)"
            active={activeStates.underline}
          />
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <ToolbarButton
            onClick={() => execCommand("insertUnorderedList")}
            icon={<List className="w-4 h-4" />}
            title="Bullet List"
            active={activeStates.list}
          />
        </div>
      )}

      <div className="relative flex-1 min-h-[140px]">
        {(!value || value === "<br>") && (
          <div className="absolute top-0 left-0 p-4 text-gray-400 pointer-events-none text-sm italic">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          onMouseUp={() => setTimeout(checkActiveStates, 10)}
          className="p-4 outline-none text-sm min-h-[140px] leading-relaxed break-words rich-text-content"
          style={{ whiteSpace: "pre-wrap" }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  title,
  active = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`p-1.5 rounded transition-all shadow-sm cursor-pointer border ${
        active 
          ? "bg-blue-50 text-blue-600 border-blue-200" 
          : "bg-white text-gray-600 border-gray-100 hover:bg-gray-100"
      }`}
      title={title}
    >
      {icon}
    </button>
  );
}
