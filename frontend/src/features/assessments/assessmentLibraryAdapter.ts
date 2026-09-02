import assessmentAPI from "./assessmentAPI";
import courseAPI from "../courses/courseAPI";
import type { AssessmentCreateData, AssessmentType, Choice, QuestionCreateData } from "./types";
import type { Course, Quiz, QuizQuestion } from "../courses/types";

const LOCAL_LIBRARY_KEY = "learnhub.assessmentLibrary.v1";

export const clearLegacyAssessmentLibraryCache = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_LIBRARY_KEY);
  } catch {
    // ignore storage access errors in restricted browser contexts
  }
};

export interface AssessmentLibraryItem {
  id: string | number;
  title: string;
  assessment_type: AssessmentType;
  pass_mark?: number;
  max_attempts?: number;
  duration?: number;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: number;
  descriptions?: string;
  instructions?: string;
  questions: QuizQuestion[];
  source: "local" | "course";
  courseId?: string | number;
  courseTitle?: string;
  moduleId?: string | number;
  moduleTitle?: string;
}

export interface LocalAssessmentTemplate {
  id: string;
  title: string;
  assessment_type: AssessmentType;
  pass_mark: number;
  max_attempts: number;
  duration: number;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: number;
  descriptions?: string;
  instructions?: string;
  questions: QuizQuestion[];
  created_at: string;
  updated_at: string;
  // optional metadata for backend-backed templates
  courseId?: string | number;
  courseTitle?: string;
  moduleId?: string | number;
  moduleTitle?: string;
}

interface CreateTemplateData {
  title: string;
  assessment_type: AssessmentType;
  pass_mark?: number;
  max_attempts?: number;
  duration?: number;
  tab_switch_enabled?: boolean;
  tab_switch_limit?: number;
  descriptions?: string;
  instructions?: string;
}

interface CloneTarget {
  courseId: string | number;
  moduleId?: string | number | null;
  title?: string;
  assessmentType: AssessmentType;
}

const makeLocalId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local-${crypto.randomUUID()}`;
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getResponseData = <T,>(response: any): T => {
  return (response?.data || response) as T;
};

const readLocalTemplates = (): LocalAssessmentTemplate[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalTemplates = (templates: LocalAssessmentTemplate[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(templates));
};

export const getLocalAssessmentTemplates = (): AssessmentLibraryItem[] => {
  return readLocalTemplates().map((template) => ({
    id: template.id,
    title: template.title,
    assessment_type: template.assessment_type,
    pass_mark: template.pass_mark,
    max_attempts: template.max_attempts,
    duration: template.duration,
    tab_switch_enabled: template.tab_switch_enabled,
    tab_switch_limit: template.tab_switch_limit,
    descriptions: template.descriptions,
    instructions: template.instructions,
    questions: template.questions || [],
    // If id looks like a backend id (not starting with local-), treat as course source
    source: String(template.id).startsWith("local-") ? "local" : "course",
    courseId: template.courseId,
    courseTitle: template.courseTitle,
    moduleId: template.moduleId,
    moduleTitle: template.moduleTitle,
  }));
};

export const createLocalAssessmentTemplate = (data: CreateTemplateData, id?: string): LocalAssessmentTemplate => {
  const now = new Date().toISOString();
  const template: LocalAssessmentTemplate = {
    id: id ?? makeLocalId(),
    title: data.title.trim(),
    assessment_type: data.assessment_type,
    pass_mark: data.pass_mark ?? (data.assessment_type === "FINAL" ? 60 : 70),
    max_attempts: data.max_attempts ?? 3,
    duration: data.duration ?? (data.assessment_type === "FINAL" ? 60 : 30),
    tab_switch_enabled: data.tab_switch_enabled ?? false,
    tab_switch_limit: data.tab_switch_limit ?? 0,
    descriptions: data.descriptions,
    instructions: data.instructions,
    questions: [],
    created_at: now,
    updated_at: now,
  };

  writeLocalTemplates([template, ...readLocalTemplates()]);
  return template;
};

const makeLocalQuestionId = () => `local-question-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const cloneAssessmentIntoLocalTemplate = (item: AssessmentLibraryItem): LocalAssessmentTemplate => {
  const template = createLocalAssessmentTemplate({
    title: item.title,
    assessment_type: item.assessment_type,
    pass_mark: item.pass_mark,
    max_attempts: item.max_attempts,
    duration: item.duration,
    tab_switch_enabled: item.tab_switch_enabled,
    tab_switch_limit: item.tab_switch_limit,
    descriptions: item.descriptions,
    instructions: item.instructions,
  }, String(item.id));

  const clonedQuestions = (item.questions || []).map((question) => ({
    ...question,
    id: question.id ?? makeLocalQuestionId(),
  }));

  // Persist questions and source metadata so backend-backed clones are recognized as course items
  const updated = updateLocalAssessmentTemplate(template.id, {
    questions: clonedQuestions,
    courseId: item.courseId,
    courseTitle: item.courseTitle,
    moduleId: item.moduleId,
    moduleTitle: item.moduleTitle,
  });

  return updated as LocalAssessmentTemplate;
};

export const updateLocalAssessmentTemplate = (
  templateId: string,
  updates: Partial<Omit<LocalAssessmentTemplate, "id" | "created_at">>
) => {
  const templates = readLocalTemplates();
  const nextTemplates = templates.map((template) =>
    template.id === templateId
      ? {
          ...template,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : template
  );
  writeLocalTemplates(nextTemplates);
  return nextTemplates.find((template) => template.id === templateId) || null;
};

export const deleteLocalAssessmentTemplate = (templateId: string) => {
  writeLocalTemplates(readLocalTemplates().filter((template) => template.id !== templateId));
};

const toLibraryItem = (
  assessment: Quiz,
  sourceCourse: Course,
  sourceModule?: { id: string | number; title: string }
): AssessmentLibraryItem => ({
  id: assessment.id,
  title: assessment.title || (assessment.assessment_type === "FINAL" ? "Final Assessment" : "Untitled Quiz"),
  assessment_type: assessment.assessment_type || (sourceModule ? "QUIZ" : "FINAL"),
  pass_mark: assessment.pass_mark,
  max_attempts: assessment.max_attempts,
  duration: assessment.duration,
  descriptions: assessment.descriptions,
  instructions: assessment.instructions,
  questions: assessment.questions || [],
  source: "course",
  courseId: sourceCourse.id,
  courseTitle: sourceCourse.title,
  moduleId: sourceModule?.id,
  moduleTitle: sourceModule?.title,
});

export const extractAssessmentsFromCourses = (courses: Course[]): AssessmentLibraryItem[] => {
  const items: AssessmentLibraryItem[] = [];

  courses.forEach((course) => {
    if (course.final_assessment) {
      items.push(toLibraryItem(course.final_assessment, course));
    }

    (course.modules || []).forEach((module) => {
      if (module.quiz) {
        items.push(toLibraryItem(module.quiz, course, module));
      }
    });
  });

  return items;
};

export const listAssessmentLibrary = async (): Promise<AssessmentLibraryItem[]> => {
  clearLegacyAssessmentLibraryCache();

  const courses = await courseAPI.fetchCourses(true);
  const detailedCourses = await Promise.all(
    courses.map((course) =>
      courseAPI.fetchCourseDetails(course.id).catch(() => course)
    )
  );

  const courseItems = extractAssessmentsFromCourses(detailedCourses);

  const allAssessmentsResponse = await assessmentAPI.listAssessments();
  const allAssessments = Array.isArray(allAssessmentsResponse)
    ? allAssessmentsResponse
    : Array.isArray(allAssessmentsResponse?.data)
      ? allAssessmentsResponse.data
      : [];

  const databaseItems: AssessmentLibraryItem[] = allAssessments.map((assessment: any) => ({
    id: assessment.id,
    title: assessment.title,
    assessment_type: assessment.assessment_type,
    pass_mark: assessment.pass_mark,
    max_attempts: assessment.max_attempts,
    duration: assessment.duration,
    tab_switch_enabled: assessment.tab_switch_enabled,
    tab_switch_limit: assessment.tab_switch_limit,
    descriptions: assessment.descriptions,
    instructions: assessment.instructions,
    questions: assessment.questions || [],
    source: 'course',
    courseId: assessment.course ?? assessment.course_id ?? undefined,
    moduleId: assessment.module ?? assessment.module_id ?? undefined,
    courseTitle: assessment.course_title || assessment.course?.title || undefined,
    moduleTitle: assessment.module_title || assessment.module?.title || undefined,
  }));

  const unassignedResponse = await assessmentAPI.listAssessments({ unassigned: true });
  const unassignedAssessments = Array.isArray(unassignedResponse)
    ? unassignedResponse
    : Array.isArray(unassignedResponse?.data)
      ? unassignedResponse.data
      : [];

  const unassignedItems: AssessmentLibraryItem[] = unassignedAssessments.map((assessment: any) => ({
    ...assessment,
    source: 'course',
    courseId: assessment.course ?? assessment.course_id ?? undefined,
    moduleId: assessment.module ?? assessment.module_id ?? undefined,
    courseTitle: assessment.course_title || assessment.course?.title || undefined,
    moduleTitle: assessment.module_title || assessment.module?.title || undefined,
    questions: assessment.questions || [],
  }));

  const byId = new Map<string, AssessmentLibraryItem>();

  const pushItem = (it: AssessmentLibraryItem) => {
    const key = String(it.id);
    if (!byId.has(key)) {
      byId.set(key, it);
      return;
    }

    const existing = byId.get(key)!;
    const shouldReplace = !existing.title && !!it.title;
    if (shouldReplace || (existing.courseTitle == null && it.courseTitle != null)) {
      byId.set(key, { ...existing, ...it });
    }
  };

  databaseItems.forEach(pushItem);
  courseItems.forEach(pushItem);
  unassignedItems.forEach(pushItem);

  return Array.from(byId.values());
};

const normalizeChoices = (question: QuizQuestion): Choice[] => {
  if (question.choices && question.choices.length > 0) {
    return question.choices
      .map((choice: any) => ({
        text: String(choice.text || ""),
        is_correct: Boolean(choice.is_correct),
      }))
      .filter((choice) => choice.text.trim().length > 0);
  }

  return (question.options || [])
    .map((option, index) => ({
      text: option,
      is_correct: index === question.correctAnswer,
    }))
    .filter((choice) => choice.text.trim().length > 0);
};

export const toQuestionCreateData = (
  assessmentId: string | number,
  question: QuizQuestion
): QuestionCreateData => ({
  assessment: assessmentId,
  question_text: question.question_text || question.question,
  question_type: question.question_type === "multiple" ? "multiple" : "single",
  marks: question.marks || 1,
  choices: normalizeChoices(question),
});

export const cloneAssessmentIntoCourse = async (
  source: AssessmentLibraryItem,
  target: CloneTarget
) => {
  const createData: AssessmentCreateData = {
    course: target.courseId,
    module: target.assessmentType === "QUIZ" ? target.moduleId || null : null,
    title: target.title || source.title,
    is_final: target.assessmentType === "FINAL",
    assessment_type: target.assessmentType,
    pass_mark: source.pass_mark ?? (target.assessmentType === "FINAL" ? 60 : 70),
    max_attempts: source.max_attempts ?? 3,
    duration: source.duration ?? (target.assessmentType === "FINAL" ? 60 : 30),
    descriptions: source.descriptions,
    instructions: source.instructions,
  };

  const createResponse = await assessmentAPI.createAssessment(createData);
  const createdAssessment = getResponseData<{ id: string | number }>(createResponse);

  await Promise.all(
    (source.questions || []).map((question) =>
      assessmentAPI.createQuestion(toQuestionCreateData(createdAssessment.id, question))
    )
  );

  return createdAssessment;
};
