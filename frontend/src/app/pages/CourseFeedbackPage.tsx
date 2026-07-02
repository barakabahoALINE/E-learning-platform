import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Star, CheckCircle, Award } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchCourseDetails } from '../../features/courses/courseSlice';
import { fetchCourseProgress } from '../../features/progress/progressSlice';
import {
  claimCertificate,
  resetCertificateState,
  submitCertificateFeedback,
} from '../../features/certificates/certificateSlice';
import { toast } from 'sonner';
import { FeedbackCreateData } from '../../features/certificates/types';

export const CourseFeedbackPage: React.FC = () => {
  const { courseId } = useParams();
  const numericCourseId = Number(courseId);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [courseRating, setCourseRating] = useState(0);
  const [contentQuality, setContentQuality] = useState(0);
  const [instructorClarity, setInstructorClarity] = useState(0);
  const [platformUsability, setPlatformUsability] = useState(0);
  const [textFeedback, setTextFeedback] = useState('');
  const [hoveredRating, setHoveredRating] = useState<{ [key: string]: number }>({});

  const { courses, currentCourse, isLoading: courseLoading } = useAppSelector((state) => state.courses);
  const progress = useAppSelector((state) => state.progress.courseProgress[numericCourseId]);
  const certificateClaim = useAppSelector((state) => state.certificates.claim);
  const certificateFeedback = useAppSelector((state) => state.certificates.feedback);

  const course = courses.find((c) => String(c.id) === courseId) ||
    (currentCourse && currentCourse.id === numericCourseId ? currentCourse : null);

  useEffect(() => {
    if (courseId && !Number.isNaN(numericCourseId)) {
      dispatch(fetchCourseDetails(numericCourseId));
      dispatch(fetchCourseProgress(numericCourseId));
      dispatch(claimCertificate(numericCourseId));
    }
  }, [courseId, numericCourseId, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetCertificateState());
    };
  }, [dispatch]);

  useEffect(() => {
    if (certificateClaim.certificateExists) {
      navigate(`/certificate/${courseId}`);
    }
  }, [certificateClaim.certificateExists, courseId, navigate]);

  if (!course && courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading course feedback...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const finalAssessmentCompleted = Boolean(progress?.final_passed || progress?.course_completed);

  if (!finalAssessmentCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl mb-4">Final assessment required</h2>
          <p className="text-gray-600 mb-6">
            Complete the final assessment before submitting feedback and unlocking your certificate.
          </p>
          <Link to={`/learning/${courseId}/final-assessment`}>
            <Button>Go to Final Assessment</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderStarRating = (
    value: number,
    setValue: (val: number) => void,
    label: string,
    key: string
  ) => {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setValue(star)}
              onMouseEnter={() => setHoveredRating({ ...hoveredRating, [key]: star })}
              onMouseLeave={() => setHoveredRating({ ...hoveredRating, [key]: 0 })}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${star <= (hoveredRating[key] || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
                  }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {value > 0 ? `${value}/5` : 'Not rated'}
          </span>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (courseRating === 0 || contentQuality === 0 || instructorClarity === 0 || platformUsability === 0) {
      toast.error('Please provide all ratings');
      return;
    }

    if (textFeedback.trim().length < 10) {
      toast.error('Please provide detailed feedback (at least 10 characters)');
      return;
    }

    const payload: FeedbackCreateData = {
      overall_rating: courseRating,
      content_quality: contentQuality,
      instructor_clarity: instructorClarity,
      platform_usability: platformUsability,
      comment: textFeedback.trim(),
    };

    try {
      await dispatch(submitCertificateFeedback({ courseId: numericCourseId, payload })).unwrap();
      toast.success('Thank you for your feedback!');
      navigate(`/certificate/${courseId}`);
    } catch (submitError: any) {
      toast.error(submitError || 'Failed to submit feedback.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl mb-2">Course Completed! 🎉</h1>
          <p className="text-xl text-gray-600">One last step before getting your certificate</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Award className="mr-2 h-6 w-6 text-blue-600" />
              Share Your Learning Experience
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Your feedback helps us improve the course quality and helps other learners make informed decisions.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-gray-600">Course</p>
                <p className="font-medium text-lg">{course.title}</p>
                <p className="text-sm text-gray-500">by {course.instructor || course.admin || 'Instructor'}</p>
              </div>

              {renderStarRating(courseRating, setCourseRating, '1. Overall Course Rating', 'course')}
              {renderStarRating(contentQuality, setContentQuality, '2. Content Quality', 'content')}
              {renderStarRating(instructorClarity, setInstructorClarity, '3. Instructor Clarity', 'instructor')}
              {renderStarRating(platformUsability, setPlatformUsability, '4. Platform Usability', 'platform')}

              <div className="space-y-2">
                <Label htmlFor="feedback">
                  5. What did you like most about this course? Any suggestions for improvement?
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  id="feedback"
                  value={textFeedback}
                  onChange={(e) => setTextFeedback(e.target.value)}
                  placeholder="Share your thoughts about the course content, structure, learning experience..."
                  className="min-h-[120px]"
                  required
                />
                <p className="text-xs text-gray-500">{textFeedback.length} characters (minimum 10 required)</p>
              </div>

              {certificateFeedback.error && (
                <p className="text-sm text-red-600">{certificateFeedback.error}</p>
              )}

              <div className="flex items-center justify-between pt-6 border-t">
                <Link to={`/course/${courseId}`}>
                  <Button type="button" variant="outline">Back to Course</Button>
                </Link>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-blue-600 hover:-blue-700"
                  disabled={certificateFeedback.loading}
                >
                  {certificateFeedback.loading ? 'Submitting...' : 'Submit Feedback & Get Certificate'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          Your feedback will be kept confidential and used only for improving course quality.
        </p>
      </div>
    </div>
  );
};
