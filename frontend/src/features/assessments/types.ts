export type AssessmentType = "QUIZ" | "FINAL";
export type QuestionType = "single" | "multiple";

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
