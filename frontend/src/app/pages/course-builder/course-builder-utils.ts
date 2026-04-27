import type { LessonContent, ContentBlock } from "../../../features/courses/types";

export const extractErrorMessage = (data: any): string => {
  if (typeof data === 'string') return data;
  if (!data) return 'An unexpected error occurred';
  
  const mainError = data.error || data.errors || data;
  
  const findFirstString = (obj: any): string | null => {
    if (typeof obj === 'string') return obj;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = findFirstString(item);
        if (found) return found;
      }
    }
    if (typeof obj === 'object' && obj !== null) {
      const priorityKeys = ['non_field_errors', 'detail', 'message'];
      for (const key of priorityKeys) {
        if (obj[key]) {
          const found = findFirstString(obj[key]);
          if (found) return found;
        }
      }
      for (const key in obj) {
        const found = findFirstString(obj[key]);
        if (found) return found;
      }
    }
    return null;
  };

  const specificError = findFirstString(mainError);
  return specificError || data.message || 'An unexpected error occurred';
};

export function mapContentToBlock(content: LessonContent, index: number): ContentBlock {
  let blockContent = '';
  const type = content.content_type || 'note';
  
  switch(type) {
    case 'note':
      blockContent = content.note_text || '';
      break;
    case 'video':
      blockContent = content.video_url || '';
      break;
    case 'image':
      blockContent = typeof content.file === 'string' ? content.file : (content.description || '');
      break;
    case 'file':
      blockContent = typeof content.file === 'string' ? content.file : '';
      break;
    default:
      blockContent = content.description || '';
  }

  return {
    id: content.id,
    type: type === 'note' ? 'text' : type as any,
    content: blockContent,
    quiz: content.quiz,
    settings: { caption: content.description },
    title: content.title
  };
}
