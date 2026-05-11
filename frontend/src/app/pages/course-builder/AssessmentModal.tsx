import { useState } from "react";
import { X, Check } from "lucide-react";
import type { QuizQuestion } from "../../../features/courses/types";

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
  const [questionText, setQuestionText] = useState(initialQuestion?.question_text || initialQuestion?.question || "");
  const [options, setOptions] = useState(() => {
    if (initialQuestion?.choices && initialQuestion.choices.length > 0) {
      return initialQuestion.choices.map(c => c.text);
    }
    return initialQuestion?.options || ["", "", "", ""];
  });
  const [correctAnswer, setCorrectAnswer] = useState(() => {
    if (initialQuestion?.choices && initialQuestion.choices.length > 0) {
      const idx = initialQuestion.choices.findIndex(c => c.is_correct);
      return idx >= 0 ? idx : 0;
    }
    return initialQuestion?.correctAnswer ?? 0;
  });

  const handleSave = () => {
    if (!questionText || options.some((opt) => !opt.trim())) {
      alert("Please fill in the question and all answer options");
      return;
    }

    onSave({
      id: initialQuestion?.id,
      question: questionText,
      options,
      correctAnswer,
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

        <div className="p-6 space-y-6 bg-white">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 transition-all"
              placeholder="e.g., What is the purpose of useEffect in React?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Answer Options <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3 group">
                    <input
                    type="radio"
                    name="correct"
                    checked={correctAnswer === index}
                    onChange={() => setCorrectAnswer(index)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    className={`flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                      correctAnswer === index ? "border-blue-100 bg-blue-50/30" : "border-gray-200 bg-white"
                    }`}
                    placeholder={`Option ${index + 1}`}
                  />
                  {correctAnswer === index && (
                    <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-[10px] font-bold tracking-wider">
                      <Check className="w-3 h-3" />
                      Correct
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 italic">
              * Select the radio button to mark the correct answer.
            </p>
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
