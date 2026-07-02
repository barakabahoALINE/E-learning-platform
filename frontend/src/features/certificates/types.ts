export interface Certificate {
  id: number;
  course: number;
  course_title: string;
  student_name: string;
  certificate_number: string;
  score: number;
  percentage: number;
  issued_at: string;
  certificate_file_url?: string;
  is_downloaded: boolean;
  downloaded_at?: string | null;
  shared_via?: string | null;
  shared_at?: string | null;
}

export interface CertificateClaimResponse {
  eligible: boolean;
  certificate_exists: boolean;
  certificate?: Certificate | null;
}

export interface FeedbackCreateData {
  overall_rating: number;
  content_quality: number;
  instructor_clarity: number;
  platform_usability: number;
  comment: string;
}
