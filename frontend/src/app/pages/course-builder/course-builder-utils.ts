export const extractErrorMessage = (data: any): string => {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<html')) {
      return 'A server error occurred. Please try again later.';
    }
    return data;
  }
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
