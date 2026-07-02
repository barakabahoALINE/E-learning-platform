import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Link, Heading1, Heading2,
  Code, Minus, Undo, Redo, Quote, X,
} from "lucide-react";

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
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const savedRange = useRef<Range | null>(null);
  const [activeStates, setActiveStates] = useState({
    bold: false, italic: false, underline: false,
    unorderedList: false, orderedList: false,
    h1: false, h2: false, blockquote: false, code: false,
  });

  const checkActiveStates = useCallback(() => {
    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      orderedList: document.queryCommandState("insertOrderedList"),
      h1: document.queryCommandValue("formatBlock") === "h1",
      h2: document.queryCommandValue("formatBlock") === "h2",
      blockquote: document.queryCommandValue("formatBlock") === "blockquote",
      code: false,
    });
  }, []);

  // Set initial content only once (not on every value change to avoid cursor jumping)
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, isFocused]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCommand = (command: string, arg?: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(command, false, arg);
    checkActiveStates();
    handleInput();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const openLinkDialog = () => {
    saveSelection();
    // Pre-fill with existing link if cursor is on one
    const sel = window.getSelection();
    const anchor = sel?.anchorNode?.parentElement?.closest("a") as HTMLAnchorElement | null;
    setLinkUrl(anchor?.href || "https://");
    setShowLinkDialog(true);
  };

  const applyLink = () => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    if (linkUrl && linkUrl !== "https://") {
      document.execCommand("createLink", false, linkUrl);
      // Make links open in new tab
      const links = editorRef.current?.querySelectorAll("a");
      links?.forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
    }
    setShowLinkDialog(false);
    handleInput();
  };

  const removeLink = () => {
    if (editorRef.current) editorRef.current.focus();
    restoreSelection();
    document.execCommand("unlink", false);
    setShowLinkDialog(false);
    handleInput();
  };

  const insertHR = () => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand("insertHTML", false, "<hr/><br/>");
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); execCommand("bold"); break;
        case "i": e.preventDefault(); execCommand("italic"); break;
        case "u": e.preventDefault(); execCommand("underline"); break;
        case "k": e.preventDefault(); openLinkDialog(); break;
        case "z": e.preventDefault(); execCommand(e.shiftKey ? "redo" : "undo"); break;
      }
    }
    setTimeout(checkActiveStates, 10);
  };

  const isEmpty = !value || value === "" || value === "<br>" || value === "<p><br></p>" || value === "<p></p>";

  return (
    <div className="relative">
      <div
        className={`flex flex-col border rounded-lg overflow-visible bg-white transition-all
          ${isFocused ? "ring-2 ring-blue-500 border-transparent shadow-sm" : "border-gray-200"}
          ${disabled ? "bg-gray-50 opacity-60" : ""}
        `}
      >
        {!disabled && (
          <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 border-b border-gray-100">
            {/* History */}
            <ToolbarButton onClick={() => execCommand("undo")} icon={<Undo className="w-3.5 h-3.5" />} title="Undo (Ctrl+Z)" />
            <ToolbarButton onClick={() => execCommand("redo")} icon={<Redo className="w-3.5 h-3.5" />} title="Redo (Ctrl+Shift+Z)" />
            <Divider />

            {/* Headings */}
            <ToolbarButton
              onClick={() => execCommand("formatBlock", activeStates.h1 ? "p" : "h1")}
              icon={<Heading1 className="w-3.5 h-3.5" />} title="Heading 1"
              active={activeStates.h1}
            />
            <ToolbarButton
              onClick={() => execCommand("formatBlock", activeStates.h2 ? "p" : "h2")}
              icon={<Heading2 className="w-3.5 h-3.5" />} title="Heading 2"
              active={activeStates.h2}
            />
            <Divider />

            {/* Inline formatting */}
            <ToolbarButton onClick={() => execCommand("bold")} icon={<Bold className="w-3.5 h-3.5" />} title="Bold (Ctrl+B)" active={activeStates.bold} />
            <ToolbarButton onClick={() => execCommand("italic")} icon={<Italic className="w-3.5 h-3.5" />} title="Italic (Ctrl+I)" active={activeStates.italic} />
            <ToolbarButton onClick={() => execCommand("underline")} icon={<Underline className="w-3.5 h-3.5" />} title="Underline (Ctrl+U)" active={activeStates.underline} />
            <Divider />

            {/* Lists */}
            <ToolbarButton
              onClick={() => execCommand("insertUnorderedList")}
              icon={<List className="w-3.5 h-3.5" />} title="Bullet List"
              active={activeStates.unorderedList}
            />
            <ToolbarButton
              onClick={() => execCommand("insertOrderedList")}
              icon={<ListOrdered className="w-3.5 h-3.5" />} title="Numbered List"
              active={activeStates.orderedList}
            />
            <Divider />

            {/* Blockquote, Code, HR */}
            <ToolbarButton
              onClick={() => execCommand("formatBlock", activeStates.blockquote ? "p" : "blockquote")}
              icon={<Quote className="w-3.5 h-3.5" />} title="Block Quote"
              active={activeStates.blockquote}
            />
            <ToolbarButton onClick={() => execCommand("formatBlock", "pre")} icon={<Code className="w-3.5 h-3.5" />} title="Code Block" />
            <ToolbarButton onClick={insertHR} icon={<Minus className="w-3.5 h-3.5" />} title="Horizontal Rule" />
            <Divider />

            {/* Link */}
            <ToolbarButton onClick={openLinkDialog} icon={<Link className="w-3.5 h-3.5" />} title="Insert / Edit Link (Ctrl+K)" />
          </div>
        )}

        <div className="relative flex-1 min-h-[160px]">
          {isEmpty && !isFocused && (
            <div className="absolute top-0 left-0 p-4 text-gray-400 pointer-events-none text-sm italic select-none">
              {placeholder}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); handleInput(); }}
            onKeyDown={handleKeyDown}
            onMouseUp={() => setTimeout(checkActiveStates, 10)}
            className="p-4 outline-none text-sm min-h-[160px] leading-relaxed break-words rich-text-content"
          />
        </div>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute z-50 top-10 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">Insert Link</span>
            <button onClick={() => setShowLinkDialog(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") applyLink(); if (e.key === "Escape") setShowLinkDialog(false); }}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={applyLink}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              Apply
            </button>
            <button
              onClick={removeLink}
              className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <style>{`
        .rich-text-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.25rem; line-height: 1.3; }
        .rich-text-content h2 { font-size: 1.2rem; font-weight: 600; margin: 0.6rem 0 0.2rem; line-height: 1.35; }
        .rich-text-content p  { margin: 0.35rem 0; }
        .rich-text-content ul { list-style: disc; padding-left: 1.4rem; margin: 0.35rem 0; }
        .rich-text-content ol { list-style: decimal; padding-left: 1.4rem; margin: 0.35rem 0; }
        .rich-text-content blockquote {
          border-left: 3px solid #6366f1; background: #f5f3ff;
          padding: 0.5rem 1rem; margin: 0.5rem 0; border-radius: 0 6px 6px 0;
          color: #4f46e5; font-style: italic;
        }
        .rich-text-content pre {
          background: #1e1e2e; color: #cdd6f4; font-family: monospace;
          font-size: 0.8rem; padding: 0.75rem 1rem; border-radius: 8px; margin: 0.5rem 0;
          overflow-x: auto; white-space: pre-wrap;
        }
        .rich-text-content a { color: #2563eb; text-decoration: underline; }
        .rich-text-content a:hover { color: #1d4ed8; }
        .rich-text-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 0.75rem 0; }
        .rich-text-content strong { font-weight: 700; }
        .rich-text-content em { font-style: italic; }
        .rich-text-content u { text-decoration: underline; }
      `}</style>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5" />;
}

function ToolbarButton({
  onClick, icon, title, active = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-all cursor-pointer border text-xs
        ${active
          ? "bg-blue-50 text-blue-600 border-blue-200"
          : "bg-white text-gray-500 border-gray-100 hover:bg-gray-100 hover:text-gray-700"
        }`}
    >
      {icon}
    </button>
  );
}
