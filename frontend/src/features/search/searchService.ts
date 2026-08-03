import { Course, Category, Level } from '../courses/types';

const normalizeText = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');

const scoreMatch = (query: string, text: string): number => {
  const normalizedText = normalizeText(text);
  if (!normalizedText || !query) return 0;

  if (normalizedText.includes(query)) {
    if (normalizedText.startsWith(query)) return 120;
    return 80;
  }

  const tokens = normalizedText.split(' ');
  const queryTokens = query.split(' ');
  let score = 0;

  for (const token of queryTokens) {
    if (!token) continue;
    for (const candidate of tokens) {
      if (candidate.startsWith(token)) {
        score += 40;
        break;
      }
      if (candidate.includes(token)) {
        score += 25;
        break;
      }
      if (approximateTokenMatch(token, candidate)) {
        score += 18;
        break;
      }
    }
  }

  return score;
};

const isSubsequence = (needle: string, haystack: string) => {
  let pointer = 0;
  for (const char of haystack) {
    if (needle[pointer] === char) {
      pointer += 1;
      if (pointer === needle.length) return true;
    }
  }
  return false;
};

const getEditDistance = (a: string, b: string) => {
  const matrix: number[][] = [];
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  for (let i = 0; i <= bLen; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i += 1) {
    for (let j = 1; j <= aLen; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[bLen][aLen];
};

const approximateTokenMatch = (needle: string, token: string) => {
  if (!needle || !token) return false;
  const lengthThreshold = Math.max(1, Math.floor(needle.length * 0.3));
  const distance = getEditDistance(needle, token);
  if (distance <= lengthThreshold) return true;
  return isSubsequence(needle, token);
};

const getCategoryName = (course: Course, categories: Category[]) => {
  if (!course.category) return '';
  if (typeof course.category === 'string') return course.category;
  const category = categories.find((cat) => Number(cat.id) === Number(course.category));
  return category?.name || String(course.category);
};

const getLevelName = (course: Course, levels: Level[]) => {
  if (!course.level) return '';
  if (typeof course.level === 'string') return course.level;
  const level = levels.find((lvl) => Number(lvl.id) === Number(course.level));
  return level?.name || String(course.level);
};

const buildSentence = (course: Course, categories: Category[], levels: Level[]) => {
  const fields = [
    course.title,
    course.description,
    getCategoryName(course, categories),
    getLevelName(course, levels),
    course.instructor,
    course.admin,
    ...(course.skills || []),
    ...(course.modules?.map((module) => module.title) || []),
    course.final_assessment?.title || '',
  ];
  return fields.filter(Boolean).join(' ');
};

export const isPublishedCourse = (course: Course) =>
  course.status === 'published' || course.is_published === true;

const searchCache = new Map<string, Course[]>();

export const searchCourses = (
  courses: Course[],
  categories: Category[],
  levels: Level[],
  query: string,
  limit = 20,
) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const cacheKey = buildQueryCacheKey(normalizedQuery);
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const results = courses.reduce<Array<{ course: Course; score: number }>>((acc, course) => {
    if (!isPublishedCourse(course)) return acc;

    const categoryName = getCategoryName(course, categories);
    const levelName = getLevelName(course, levels);

    const titleScore = scoreMatch(normalizedQuery, course.title || '');
    const descriptionScore = scoreMatch(normalizedQuery, course.description || '');
    const categoryScore = scoreMatch(normalizedQuery, categoryName);
    const levelScore = scoreMatch(normalizedQuery, levelName);
    const instructorScore = scoreMatch(normalizedQuery, course.instructor || '');
    const adminScore = scoreMatch(normalizedQuery, course.admin || '');
    const skillsScore = scoreMatch(normalizedQuery, (course.skills || []).join(' '));
    const moduleScore = scoreMatch(normalizedQuery, (course.modules || []).map((module) => module.title).join(' '));
    const finalAssessmentScore = scoreMatch(normalizedQuery, course.final_assessment?.title || '');

    const score =
      titleScore * 2 +
      descriptionScore +
      categoryScore * 1.4 +
      levelScore * 1.2 +
      instructorScore * 1.5 +
      adminScore * 1.1 +
      skillsScore * 1.2 +
      moduleScore * 1.1 +
      finalAssessmentScore;

    if (score > 0) {
      acc.push({ course, score });
    }
    return acc;
  }, []);

  const sortedResults = results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result) => result.course);

  searchCache.set(cacheKey, sortedResults);
  return sortedResults;
};

export const buildQueryCacheKey = (query: string) => normalizeText(query);
