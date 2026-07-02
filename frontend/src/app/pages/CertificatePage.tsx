import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Award, Download, Share2, CheckCircle, Trophy, Star, ArrowRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { claimCertificate, resetCertificateState } from '../../features/certificates/certificateSlice';
import { fetchCourseDetails, fetchCourses, fetchCategories, fetchLevels } from '../../features/courses/courseSlice';
import { fetchMyEnrollments } from '../../features/enrollments/enrollmentSlice';
import certificateAPI from '../../features/certificates/certificateAPI';
import { toast } from 'sonner';
import { Course } from '../../features/courses/types';

export const CertificatePage: React.FC = () => {
  const { courseId } = useParams();
  const numericCourseId = Number(courseId);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { courses, currentCourse, isLoading: courseLoading, levels, categories } = useAppSelector((s) => s.courses);
  const { myEnrollments } = useAppSelector((s) => s.enrollments);
  const { user } = useAppSelector((s) => s.auth);
  const { loading, error, eligible, certificateExists, certificate } = useAppSelector(
    (s) => s.certificates.claim
  );

  const courseFromList = courses.find((c) => String(c.id) === courseId) || null;
  const course = (currentCourse && currentCourse.id === numericCourseId) ? currentCourse : courseFromList;
  const shouldFetchDetails = !currentCourse || currentCourse.id !== numericCourseId;

  useEffect(() => {
    if (courseId && !Number.isNaN(numericCourseId)) {
      dispatch(claimCertificate(numericCourseId));
      if (shouldFetchDetails) dispatch(fetchCourseDetails(numericCourseId));
    }
    if (courses.length === 0) dispatch(fetchCourses(false));
    if (categories.length === 0) dispatch(fetchCategories());
    if (levels.length === 0) dispatch(fetchLevels());
    dispatch(fetchMyEnrollments());
  }, [courseId, dispatch, numericCourseId, shouldFetchDetails, courses.length, categories.length, levels.length]);

  useEffect(() => {
    if (certificateExists === false && eligible === true) {
      navigate(`/course-feedback/${courseId}`);
    }
  }, [certificateExists, eligible, courseId, navigate]);

  useEffect(() => {
    return () => {
      dispatch(resetCertificateState());
    };
  }, [dispatch]);

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleDownload = async () => {
    if (!certificate?.id) return toast.error('Certificate is not available yet.');
    try {
      const downloadUrl = await certificateAPI.downloadCertificate(certificate.id);
      window.open(downloadUrl, '_blank');
      toast.success('Your certificate download has started.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to download certificate.');
    }
  };

  const handleShare = async () => {
    if (!certificate?.id) return toast.error('You need a generated certificate before sharing.');
    const accessToken = window.prompt('Enter your LinkedIn access token to share this certificate');
    if (!accessToken) return toast.error('LinkedIn access token is required to share.');
    try {
      await certificateAPI.shareCertificate(certificate.id, accessToken);
      toast.success('Certificate shared on LinkedIn successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to share certificate.');
    }
  };

  if ((!course && courseLoading) || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-gray-600">Loading certificate details...</p>
    </div>
  );

  if (!course) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl mb-4">Course not found</h2>
        <Link to="/courses"><Button>Browse Courses</Button></Link>
      </div>
    </div>
  );

  const skills = (course?.skills && course.skills.length > 0)
    ? course.skills
    : (course?.modules || []).map((m: any) => m?.title || m?.name || '').filter(Boolean).slice(0, 6);

  const lessonsCompleted = (course.modules || []).reduce((count: number, m: any) => count + (m.sections?.length ?? 0), 0) || course.modules_count || 0;
  const completionRate = certificate?.percentage !== undefined ? `${Math.round(certificate.percentage)}%` : '100%';
  const finalScore = certificate?.score !== undefined ? `${certificate.score.toFixed(1)}%` : '';
  const currentCategoryId = (() => {
    if (!course) return undefined;
    if (course.category_id !== undefined && course.category_id !== null) return Number(course.category_id);
    if (typeof course.category === 'number') return course.category;
    if (typeof course.category === 'string' && /^\d+$/.test(course.category)) return Number(course.category);
    if (typeof course.category === 'string') {
      const found = categories.find((category) => category.name === course.category);
      return found?.id;
    }
    return undefined;
  })();

  const courseCategoryLabel = typeof course.category === 'string' ? course.category : categories.find((category) => category.id === Number(course.category_id))?.name || String(course.category_id || 'this topic');

  const relatedCourse = courses.find((c: Course) => {
    if (!c) return false;
    if (Number(c.id) === Number(course.id)) return false;
    const sameCategory = currentCategoryId !== undefined ? Number(c.category_id) === currentCategoryId : (typeof c.category === 'string' && String(c.category) === String(course.category));
    if (!sameCategory) return false;

    const enrolled = myEnrollments?.some((e: any) => Number(e.course) === Number(c.id));
    return !enrolled;
  }) || null;

  const getLevelName = (c: Course) => {
    if (!c) return 'All Levels';
    if (typeof c.level === 'object' && c.level) return (c.level as any).name || 'All Levels';

    const levelValue = c.level ?? c.level_id;
    if (typeof levelValue === 'number' || (typeof levelValue === 'string' && /^\d+$/.test(levelValue))) {
      const parsedLevel = Number(levelValue);
      const found = levels?.find((l: any) => Number(l.id) === parsedLevel);
      if (found) return found.name;
      return String(parsedLevel);
    }

    return c.level || 'All Levels';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl mb-4">🎉 Certificate Ready</h1>
          <p className="text-xl text-gray-600">Your certificate for <span className="font-medium">{course.title}</span> is available.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <Card className="shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8">
                  <div className="bg-white rounded-lg p-12 text-center relative overflow-hidden">
                    <div className="relative z-10">
                      <Award className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
                      <h2 className="text-3xl mb-2">Certificate of Completion</h2>
                      <p className="text-gray-600 mb-8">This certifies that</p>
                      <h3 className="text-4xl mb-8 font-serif">{user?.full_name || user?.email || 'Learner'}</h3>
                      <p className="text-gray-600 mb-4">has successfully completed</p>
                      <h4 className="text-2xl mb-8">{certificate?.course_title || course.title}</h4>
                      <div className="flex items-center justify-center space-x-12 mb-8">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Date</p>
                          <p className="font-medium">{new Date(certificate?.issued_at || Date.now()).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3 justify-center">
                  <Button onClick={handleDownload} className="flex items-center">
                    <Download className="mr-2 h-4 w-4" /> Download Certificate
                  </Button>
                  <Button variant="outline" onClick={handleShare} className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" /> Share on LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center"><Star className="mr-2 h-5 w-5 text-yellow-500" /> Your Achievement</h3>
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Completion Rate</span><Badge className="bg-green-600">{completionRate}</Badge></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Lessons Completed</span><span className="font-medium">{lessonsCompleted}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Final Score</span><span className="font-medium">{finalScore}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-600" /> Skills You've Mastered</h3>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">{skills.map((skill, i) => <Badge key={i} variant="secondary">{skill}</Badge>)}</div>
                ) : (
                  <p className="text-sm text-gray-500">Complete your course modules to reveal earned skills.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">Next Steps</h3>
                <div className="space-y-3">
                  <div><Link to="/courses"><Button variant="outline" className="w-full justify-start"><ArrowRight className="mr-2 h-4 w-4" /> Explore More Courses</Button></Link></div>
                  <div><Link to="/dashboard"><Button variant="outline" className="w-full justify-start"><ArrowRight className="mr-2 h-4 w-4" /> View Dashboard</Button></Link></div>
                  <div><Link to="/profile?tab=certificates"><Button variant="outline" className="w-full justify-start"><Award className="mr-2 h-4 w-4" /> View My Certificates</Button></Link></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedCourse && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl mb-4">Continue Learning</h3>
              <p className="text-gray-600 mb-4">Based on your interest in {courseCategoryLabel}, you might enjoy this course:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link key={relatedCourse.id} to={`/course/${relatedCourse.id}`}>
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <img src={relatedCourse.thumbnail} alt={relatedCourse.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                    <h4 className="font-medium mb-2 line-clamp-2">{relatedCourse.title}</h4>
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline">{getLevelName(relatedCourse)}</Badge>
                      <span className="text-gray-600">{relatedCourse.duration}</span>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default CertificatePage;
