import { useState } from "react";
import { X, Check, Shuffle, Plus, Trash2, CircleHelp, FileText, CheckSquare } from "lucide-react";
import type { QuizQuestion } from "../../../features/courses/types";

interface MatchingPairItem {
  left: string;
  right: string;
}

export function AssessmentModal({
  onClose,
  onSave,
  initialQuestion,
}: {
  onClose: () => void;
  onSave: (question: QuizQuestion) => void;
  initialQuestion?: QuizQuestion;
}) {
  return (
    <QuizQuestionModal
      onClose={onClose}
      onSave={onSave}
      initialQuestion={initialQuestion}
      title={initialQuestion ? "Edit Assessment Question" : "Add Assessment Question"}
    />
  );
}

interface OptionItem {
  text: string;
  isCorrect: boolean;
}

export function QuizQuestionModal({
  onClose,
  onSave,
  initialQuestion,
  title = "Add Quiz Question",
}: {
  onClose: () => void;
  onSave: (question: QuizQuestion) => void;
  initialQuestion?: QuizQuestion;
  title?: string;
}) {
  // Determine initial question type
  const getInitialType = (): "single" | "multiple" | "true_false" | "matching" => {
    if (!initialQuestion) return "single";
    if (initialQuestion.question_type === "multiple") return "multiple";
    if (initialQuestion.question_type === "matching") return "matching";

    // Check if it looks like a true/false question
    const choices = initialQuestion.choices || [];
    if (choices.length === 2) {
      const texts = choices.map((c: any) => c.text.toLowerCase());
      if (texts.includes("true") && texts.includes("false")) {
        return "true_false";
      }
    }
    return "single";
  };

  const [questionType, setQuestionType] = useState<"single" | "multiple" | "true_false" | "matching">(getInitialType);
  const [questionText, setQuestionText] = useState(initialQuestion?.question_text || initialQuestion?.question || "");
  const [marksInput, setMarksInput] = useState(String(initialQuestion?.marks || 1));

  // Initialize options based on type and initialQuestion
  const [options, setOptions] = useState<OptionItem[]>(() => {
    if (initialQuestion?.question_type !== "matching" && initialQuestion?.choices && initialQuestion.choices.length > 0) {
      return initialQuestion.choices.map((c: any) => ({
        text: c.text,
        isCorrect: Boolean(c.is_correct),
      }));
    }
    const legacyOpts = initialQuestion?.options || [];
    if (initialQuestion?.question_type !== "matching" && legacyOpts.length > 0) {
      const correctIdx = initialQuestion?.correctAnswer ?? 0;
      return legacyOpts.map((opt: string, idx: number) => ({
        text: opt,
        isCorrect: idx === correctIdx,
      }));
    }

    // Default options
    const initialType = getInitialType();
    if (initialType === "true_false") {
      return [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false }
      ];
    }
    return [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ];
  });

  const [matchingPairs, setMatchingPairs] = useState<MatchingPairItem[]>(() => {
    if (initialQuestion?.question_type === "matching" && initialQuestion.matching_pairs) {
      return initialQuestion.matching_pairs.map((pair: any) => ({
        left: pair.left || "",
        right: pair.right || "",
      }));
    }
    return [
      { left: "", right: "" },
      { left: "", right: "" },
    ];
  });

  const handleTypeChange = (type: "single" | "multiple" | "true_false" | "matching") => {
    setQuestionType(type);
    if (type === "true_false") {
      const hasTrue = options.some(o => o.text.toLowerCase() === "true");
      const hasFalse = options.some(o => o.text.toLowerCase() === "false");
      if (hasTrue && hasFalse) {
        const correctTrue = options.find(o => o.text.toLowerCase() === "true")?.isCorrect || false;
        setOptions([
          { text: "True", isCorrect: correctTrue },
          { text: "False", isCorrect: !correctTrue }
        ]);
      } else {
        setOptions([
          { text: "True", isCorrect: true },
          { text: "False", isCorrect: false }
        ]);
      }
      setMatchingPairs([{ left: "", right: "" }, { left: "", right: "" }]);
    } else if (type === "matching") {
      setMatchingPairs(matchingPairs.length ? matchingPairs : [{ left: "", right: "" }, { left: "", right: "" }]);
    } else {
      if (questionType === "true_false") {
        setOptions([
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
          { text: "", isCorrect: false },
        ]);
      } else {
        if (type === "single") {
          const firstCorrectIdx = options.findIndex(o => o.isCorrect);
          const newOptions = options.map((o, idx) => ({
            ...o,
            isCorrect: firstCorrectIdx === -1 ? idx === 0 : idx === firstCorrectIdx
          }));
          setOptions(newOptions);
        }
      }
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index].text = text;
    setOptions(newOptions);
  };

  const handleCorrectChange = (index: number) => {
    if (questionType === "single" || questionType === "true_false") {
      const newOptions = options.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === index
      }));
      setOptions(newOptions);
    } else {
      const newOptions = [...options];
      newOptions[index].isCorrect = !newOptions[index].isCorrect;
      setOptions(newOptions);
    }
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const isRemovedCorrect = options[index].isCorrect;
    const newOptions = options.filter((_, idx) => idx !== index);

    // If we removed the only correct option in single choice, mark the first one as correct
    if (isRemovedCorrect && (questionType === "single" || questionType === "true_false")) {
      newOptions[0].isCorrect = true;
    }
    setOptions(newOptions);
  };

  const handleSave = () => {
    if (!questionText.trim()) {
      alert("Please enter the question text");
      return;
    }

    if (questionType === "matching") {
      if (matchingPairs.some(pair => !pair.left.trim() || !pair.right.trim())) {
        alert("Please fill in all matching pair fields");
        return;
      }
    } else {
      if (options.some(opt => !opt.text.trim())) {
        alert("Please fill in all option texts");
        return;
      }

      const correctCount = options.filter(o => o.isCorrect).length;
      if (correctCount === 0) {
        alert("Please mark at least one option as the correct answer");
        return;
      }

      if ((questionType === "single" || questionType === "true_false") && correctCount !== 1) {
        alert("Single choice questions must have exactly one correct answer");
        return;
      }
    }

    const parsedMarks = Math.max(1, parseInt(marksInput) || 1);

    onSave({
      id: initialQuestion?.id ?? "",
      question: questionText,
      question_text: questionText,
      question_type: questionType === "multiple" ? "multiple" : questionType === "matching" ? "matching" : "single",
      marks: parsedMarks,
      options: questionType === "matching" ? [] : options.map(o => o.text),
      choices: questionType === "matching" ? [] : options.map(o => ({
        text: o.text,
        is_correct: o.isCorrect
      })),
      matching_pairs: questionType === "matching" ? matchingPairs.map(pair => ({ left: pair.left, right: pair.right })) : undefined,
      correctAnswer: questionType === "matching" ? -1 : options.findIndex(o => o.isCorrect),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
          {/* Question Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Type
            </label>
            <div className="flex gap-2 p-1 bg-gray-50 border border-gray-200/80 rounded-full">
              <button
                type="button"
                onClick={() => handleTypeChange("single")}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold transition-all ${questionType === "single"
                  ? "bg-white text-blue-600 border border-blue-200 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 bg-white/80 border border-transparent"
                  }`}
              >
                <CircleHelp className="w-4 h-4" />
                Single Choice
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("multiple")}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold transition-all ${questionType === "multiple"
                  ? "bg-white text-blue-600 border border-blue-200 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 bg-white/80 border border-transparent"
                  }`}
              >
                <CheckSquare className="w-4 h-4" />
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("true_false")}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold transition-all ${questionType === "true_false"
                  ? "bg-white text-blue-600 border border-blue-200 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 bg-white/80 border border-transparent"
                  }`}
              >
                <FileText className="w-4 h-4" />
                True / False
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("matching")}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-semibold transition-all ${questionType === "matching"
                  ? "bg-blue-600 text-white border border-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 bg-white/80 border border-transparent"
                  }`}
              >
                <Shuffle className="w-4 h-4" />
                Matching
              </button>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 transition-all"
              placeholder="e.g., What is the purpose of useEffect in React?"
            />
          </div>

          {/* Marks & Answer Info */}
          <div className="flex items-center justify-between gap-4">
            <div className="w-32">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Marks</label>
              <input
                type="text"
                value={marksInput}
                onChange={(e) => setMarksInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <p className="text-xs text-gray-400 italic mt-6">
              {questionType === "true_false" && "* Select the correct card."}
              {questionType === "single" && "* Mark the radio button of the correct option."}
              {questionType === "multiple" && "* Check all options that apply/are correct."}
            </p>
          </div>

          {/* Answer Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {questionType === "matching" ? "Answer pairs" : "Answers"} <span className="text-red-500">*</span>
            </label>
            {questionType === "matching" && (
              <p className="text-xs text-gray-500 mb-4">
                Add each correct pair once — the right-hand side is shuffled automatically for students.
              </p>
            )}

            {questionType === "true_false" ? (
              <div className="grid grid-cols-2 gap-4">
                {options.map((opt, index) => {
                  return (
                    <div
                      key={index}
                      onClick={() => handleCorrectChange(index)}
                      className={`p-6 rounded-2xl border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none ${opt.isCorrect
                          ? "border-emerald-500 bg-emerald-50/20 text-emerald-700 scale-[1.01] shadow-xs"
                          : "border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/10 text-gray-600"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${opt.isCorrect
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-gray-300 bg-white text-transparent"
                        }`}>
                        {opt.isCorrect && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <span className={`text-lg font-black tracking-tight ${opt.isCorrect ? "text-emerald-800" : "text-gray-700"}`}>
                        {opt.text}
                      </span>
                      <span className="text-xs text-gray-400">
                        {opt.isCorrect ? "Correct Option" : "Set as correct"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : questionType === "matching" ? (
              <div className="space-y-3">
                {matchingPairs.map((pair, index) => (
                  <div key={index} className="grid gap-3 items-center rounded-full border border-gray-200 bg-white p-3 md:grid-cols-[1fr_auto_1fr_auto]">
                    <input
                      value={pair.left}
                      onChange={(e) => {
                        const updated = [...matchingPairs];
                        updated[index].left = e.target.value;
                        setMatchingPairs(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                      placeholder={`Left item ${index + 1}`}
                    />
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 text-center">
                      Matches
                    </div>
                    <input
                      value={pair.right}
                      onChange={(e) => {
                        const updated = [...matchingPairs];
                        updated[index].right = e.target.value;
                        setMatchingPairs(updated);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
                      placeholder={`Right item ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = matchingPairs.filter((_, idx) => idx !== index);
                        setMatchingPairs(updated.length ? updated : [{ left: "", right: "" }]);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-gray-400 hover:text-red-600 hover:border-red-200 transition-colors"
                      title="Remove pair"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMatchingPairs([...matchingPairs, { left: "", right: "" }])}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-full border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add pair
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-3 group">
                    <input
                      type={questionType === "single" ? "radio" : "checkbox"}
                      name="correct-option"
                      checked={opt.isCorrect}
                      onChange={() => handleCorrectChange(index)}
                      className={`w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 ${questionType === "multiple" ? "rounded" : ""
                        }`}
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionTextChange(index, e.target.value)}
                      className={`flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${opt.isCorrect ? "border-blue-100 bg-blue-50/30" : "border-gray-200 bg-white"
                        }`}
                      placeholder={`Option ${index + 1}`}
                    />

                    {opt.isCorrect && (
                      <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider flex-shrink-0 animate-in fade-in duration-200">
                        <Check className="w-3 h-3 text-green-600 stroke-[3]" />
                        Correct
                      </div>
                    )}

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                        title="Remove Option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {options.length < 10 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all cursor-pointer py-2 px-3 hover:bg-blue-50/50 rounded-lg w-fit"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Option
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-white transition-all text-sm font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold cursor-pointer"
          >
            {initialQuestion ? "Update Question" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
}
