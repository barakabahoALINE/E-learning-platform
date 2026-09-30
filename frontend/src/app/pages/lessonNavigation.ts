export interface LessonNavigationItem {
  id: string | number;
  title: string;
  order: number;
  sectionId: string | number;
  sectionTitle: string;
  moduleId: string | number;
  moduleTitle?: string;
}

export interface LessonNavigationResult {
  orderedLessons: LessonNavigationItem[];
  currentItem: LessonNavigationItem | null;
  previousItem: LessonNavigationItem | null;
  nextItem: LessonNavigationItem | null;
  currentIndex: number;
  totalLessons: number;
  currentLessonNumber: number;
  currentModuleId: string | number | null;
  currentModuleTitle: string | null;
  currentSectionId: string | number | null;
  currentSectionTitle: string | null;
  isFirstLesson: boolean;
  isLastLesson: boolean;
  isFirstLessonOfSection: boolean;
  isLastLessonOfSection: boolean;
  isFirstLessonOfModule: boolean;
  isLastLessonOfModule: boolean;
  isCurrentItemComplete: boolean;
  isLessonComplete: boolean;
  isModuleComplete: boolean;
  isQuizUnlocked: boolean;
}

export function flattenModuleItems(module: {
  id?: string | number;
  title?: string;
  sections?: Array<{
    id?: string | number;
    title?: string;
    contents?: Array<{
      id: string | number;
      title?: string;
      order?: number;
    }>;
  }>;
}): LessonNavigationItem[] {
  if (!module?.sections) return [];

  return module.sections.flatMap((section) => {
    const contents = [...(section.contents ?? [])].sort((a, b) => {
      const leftOrder = typeof a.order === 'number' ? a.order : 0;
      const rightOrder = typeof b.order === 'number' ? b.order : 0;
      return leftOrder - rightOrder;
    });

    return contents.map((content) => ({
      id: content.id,
      title: content.title ?? 'Untitled lesson',
      order: typeof content.order === 'number' ? content.order : 0,
      sectionId: section.id ?? 0,
      sectionTitle: section.title ?? 'Section',
      moduleId: module.id ?? 0,
      moduleTitle: module.title,
    }));
  });
}

export function isItemComplete(
  itemId: string | number,
  completedItemIds: Iterable<string | number> | Set<string | number> | null | undefined,
): boolean {
  if (!completedItemIds) return false;

  const normalized = Array.from(completedItemIds).map((id) => String(id));
  return normalized.includes(String(itemId));
}

export function getLessonNavigation(
  module: { id?: string | number; title?: string; sections?: Array<{ id?: string | number; title?: string; contents?: Array<{ id: string | number; title?: string; order?: number }> }> },
  activeItemId: string | number | null,
  completedItemIds: Iterable<string | number> | Set<string | number> | null | undefined,
): LessonNavigationResult {
  const orderedLessons = flattenModuleItems(module);
  const currentIndex = activeItemId === null
    ? -1
    : orderedLessons.findIndex((lesson) => String(lesson.id) === String(activeItemId));

  const currentItem = currentIndex >= 0 ? orderedLessons[currentIndex] : orderedLessons[0] ?? null;
  const previousItem = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 ? orderedLessons[currentIndex + 1] ?? null : orderedLessons[1] ?? null;

  const currentSectionId = currentItem?.sectionId ?? null;
  const currentSectionTitle = currentItem?.sectionTitle ?? null;
  const currentSectionLessons = currentSectionId === null
    ? []
    : orderedLessons.filter((lesson) => String(lesson.sectionId) === String(currentSectionId));
  const currentSectionIndex = currentSectionId === null
    ? -1
    : currentSectionLessons.findIndex((lesson) => String(lesson.id) === String(currentItem?.id ?? ''));

  const isFirstLesson = currentIndex <= 0;
  const isLastLesson = currentIndex >= orderedLessons.length - 1;
  const isFirstLessonOfSection = currentSectionId !== null && currentSectionIndex <= 0;
  const isLastLessonOfSection = currentSectionId !== null && currentSectionIndex >= currentSectionLessons.length - 1;
  const isFirstLessonOfModule = currentIndex <= 0;
  const isLastLessonOfModule = currentIndex >= orderedLessons.length - 1;

  const isCurrentItemComplete = currentItem ? isItemComplete(currentItem.id, completedItemIds) : false;
  const isLessonComplete = isCurrentItemComplete;
  const isModuleComplete = orderedLessons.length > 0 && orderedLessons.every((lesson) => isItemComplete(lesson.id, completedItemIds));
  const isQuizUnlocked = isModuleComplete;

  const currentLessonNumber = currentIndex >= 0 ? currentIndex + 1 : 1;

  return {
    orderedLessons,
    currentItem,
    previousItem,
    nextItem,
    currentIndex,
    totalLessons: orderedLessons.length,
    currentLessonNumber,
    currentModuleId: module.id ?? null,
    currentModuleTitle: module.title ?? null,
    currentSectionId,
    currentSectionTitle,
    isFirstLesson,
    isLastLesson,
    isFirstLessonOfSection,
    isLastLessonOfSection,
    isFirstLessonOfModule,
    isLastLessonOfModule,
    isCurrentItemComplete,
    isLessonComplete,
    isModuleComplete,
    isQuizUnlocked,
  };
}
