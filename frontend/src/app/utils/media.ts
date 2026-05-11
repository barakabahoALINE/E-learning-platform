const API_ORIGIN = "http://127.0.0.1:8000";
const FALLBACK_COURSE_IMAGE = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";

export const getMediaUrl = (url: string | null | undefined, fallback = FALLBACK_COURSE_IMAGE) => {
  if (!url) return fallback;

  const value = String(url).trim();
  if (!value) return fallback;
  if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("blob:")) return value;

  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.startsWith("/media/") || normalized.startsWith("/static/")) {
    return `${API_ORIGIN}${normalized}`;
  }

  return `${API_ORIGIN}/media${normalized}`;
};

export { FALLBACK_COURSE_IMAGE };
