import { describe, expect, it } from 'vitest';
import { flattenModuleItems, getLessonNavigation } from './lessonNavigation';

describe('lesson navigation helpers', () => {
  const module = {
    id: 1,
    title: 'Module 1',
    sections: [
      {
        id: 10,
        title: 'Section 1',
        contents: [
          { id: 101, title: 'Lesson 1', order: 1 },
          { id: 102, title: 'Lesson 2', order: 2 },
        ],
      },
      {
        id: 11,
        title: 'Section 2',
        contents: [
          { id: 103, title: 'Lesson 3', order: 1 },
        ],
      },
    ],
  } as any;

  it('flattens module content into the actual lesson order', () => {
    expect(flattenModuleItems(module).map((item) => item.id)).toEqual([101, 102, 103]);
  });

  it('calculates previous and next items across section boundaries', () => {
    const nav = getLessonNavigation(module, 102, new Set([101]));

    expect(nav.currentItem?.id).toBe(102);
    expect(nav.previousItem?.id).toBe(101);
    expect(nav.nextItem?.id).toBe(103);
    expect(nav.isCurrentItemComplete).toBe(false);
    expect(nav.isLastLesson).toBe(false);
    expect(nav.isFirstLesson).toBe(false);
  });

  it('marks the module complete once all ordered lessons are complete', () => {
    const nav = getLessonNavigation(module, 103, new Set([101, 102, 103]));

    expect(nav.isCurrentItemComplete).toBe(true);
    expect(nav.nextItem).toBeNull();
    expect(nav.isLastLesson).toBe(true);
    expect(nav.isModuleComplete).toBe(true);
  });

  it('exposes section and module boundary metadata for lesson progression', () => {
    const nav = getLessonNavigation(module, 102, new Set([101, 102]));

    expect(nav.currentSectionId).toBe(10);
    expect(nav.currentSectionTitle).toBe('Section 1');
    expect(nav.isFirstLessonOfSection).toBe(false);
    expect(nav.isLastLessonOfSection).toBe(true);
    expect(nav.isFirstLessonOfModule).toBe(false);
    expect(nav.isLastLessonOfModule).toBe(false);
    expect(nav.isLessonComplete).toBe(true);
    expect(nav.isQuizUnlocked).toBe(false);
  });

  it('marks the final lesson as the module boundary and quiz unlock point', () => {
    const nav = getLessonNavigation(module, 103, new Set([101, 102, 103]));

    expect(nav.isFirstLessonOfSection).toBe(true);
    expect(nav.isLastLessonOfSection).toBe(true);
    expect(nav.isFirstLessonOfModule).toBe(false);
    expect(nav.isLastLessonOfModule).toBe(true);
    expect(nav.isLessonComplete).toBe(true);
    expect(nav.isQuizUnlocked).toBe(true);
  });
});
