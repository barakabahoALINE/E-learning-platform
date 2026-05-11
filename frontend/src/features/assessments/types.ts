export type AssessmentType = "QUIZ" | "FINAL";
export type QuestionType = "single" | "multiple" | "text";

export interface Choice {
  id?: number | string;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id?: number | string;
  assessment: number | string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  choices: Choice[];
}

export interface AssessmentStartData {
  id: number;
  title: string;
  type: AssessmentType;
  instructions?: string;
  total_questions: number;
  duration?: number;
}

export interface AttemptData {
  id: number;
  assessment: number;
  attempt_number: number;
  started_at: string;
  is_locked: boolean;
  is_submitted: boolean;
}

export interface AttemptResult {
  assessment?: string;
  assessment_type?: AssessmentType;
  attempt_number?: number;
  total?: number;
  score: number;
  total_marks?: number;
  percentage: number;
  is_passed: boolean;
  pass_mark: number;
}

export interface Assessment {
  id?: number | string;
  course: number | string;
  module?: number | string | null;
  title: string;
  is_final: boolean;
  assessment_type: AssessmentType;
  pass_mark: number;
  max_attempts: number;
  duration: number;
  descriptions?: string;
  instructions?: string;
  questions?: Question[];
}

export interface AssessmentCreateData {
  course: number | string;
  module?: number | string | null;
  title: string;
  is_final: boolean;
  assessment_type: AssessmentType;
  pass_mark?: number;
  max_attempts?: number;
  duration?: number;
  descriptions?: string;
  instructions?: string;
}

export interface QuestionCreateData {
  assessment: number | string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  choices: Choice[];
}
