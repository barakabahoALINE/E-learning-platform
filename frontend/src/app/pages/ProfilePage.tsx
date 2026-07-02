import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  User,
  BookOpen,
  Clock,
  Edit,
  Camera,
  Trophy,
  Download,
  Eye,
  Calendar,
} from 'lucide-react';
import { MainLayout } from '../components/MainLayout';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { selectCurrentUser } from '../../features/auth/authSelectors';
import { updateProfileName, updateProfilePicture } from '../../features/auth/authSlice';
import { fetchMyEnrollments } from '../../features/enrollments/enrollmentSlice';
import { fetchCourses, fetchCategories, fetchLevels } from '../../features/courses/courseSlice';
import {
  fetchCompletionRateKPI,
  fetchCourseProgress,
  fetchCourseSectionsProgress,
  fetchCoursesKPI,
  fetchLearningHoursKPI,
} from '../../features/progress/progressSlice';
import { getMediaUrl } from '../utils/media';

type HistoryFilter = 'all' | 'in-progress' | 'completed';

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const reduxUser = useAppSelector(selectCurrentUser);
  const { myEnrollments, loading: enrollmentsLoading } = useAppSelector((state) => state.enrollments);
  const { courses, categories, levels } = useAppSelector((state) => state.courses);
  const { courseProgress, courseSectionsProgress, learningHours, coursesKPI } = useAppSelector((state) => state.progress);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(reduxUser?.full_name || '');
  const activeTab = ['courses', 'certificates', 'activity'].includes(searchParams.get('tab') || '')
    ? (searchParams.get('tab') as string)
    : 'courses';

  useEffect(() => {
    dispatch(fetchMyEnrollments());
    dispatch(fetchCourses(false));
    dispatch(fetchCategories());
    dispatch(fetchLevels());
    dispatch(fetchLearningHoursKPI());
    dispatch(fetchCoursesKPI());
    dispatch(fetchCompletionRateKPI());
  }, [dispatch]);

  useEffect(() => {
    myEnrollments.forEach((enrollment) => {
      dispatch(fetchCourseProgress(Number(enrollment.course)));
      dispatch(fetchCourseSectionsProgress(Number(enrollment.course)));
    });
  }, [dispatch, myEnrollments]);

  useEffect(() => {
    setName(reduxUser?.full_name || '');
  }, [reduxUser?.full_name]);

  const getInitials = (fullName?: string) => {
    return (fullName || reduxUser?.email || 'U')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getCourseDetails = (courseId: number) => courses.find(course => Number(course.id) === Number(courseId));

  const getItemProgress = (courseId: number) => {
    const sections = courseSectionsProgress[courseId] || [];
    return {
      total: sections.reduce((sum, section) => sum + (section.total_contents || 0), 0),
      completed: sections.reduce((sum, section) => sum + (section.completed_contents || 0), 0),
    };
  };

  const learningHistory = useMemo(() => {
    return myEnrollments
      .filter(enrollment => enrollment.status !== 'cancelled')
      .map((enrollment) => {
        const course = getCourseDetails(enrollment.course);
        if (!course) return null;
        const progress = courseProgress[enrollment.course];
        const itemProgress = getItemProgress(enrollment.course);
        const progressPercentage = Math.round(progress?.completion_percentage || progress?.progress_percentage || 0);
        const status = enrollment.status === 'completed' || progress?.course_completed || progressPercentage >= 100 ? 'completed' : 'in-progress';

        return {
          enrollmentId: enrollment.id,
          courseId: enrollment.course,
          courseName: course.title,
          thumbnail: course.thumbnail,
          instructor: course.admin || course.instructor || 'Platform Instructor',
          level: levels.find(l => l.id === Number(course.level))?.name || String(course.level || 'All Levels'),
          category: typeof course.category === 'string'
            ? course.category
            : categories.find(category => category.id === Number(course.category))?.name,
          status,
          progress: progressPercentage,
          completedItems: itemProgress.completed,
          totalItems: itemProgress.total,
          enrolledAt: enrollment.enrolled_at,
          completedAt: progress?.completed_at || null,
          lastAccessedAt: progress?.completed_at || enrollment.enrolled_at,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime());
  }, [myEnrollments, courses, categories, levels, courseProgress, courseSectionsProgress]);

  const completedCourses = learningHistory.filter(item => item.status === 'completed');
  const inProgressCourses = learningHistory.filter(item => item.status === 'in-progress');

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      await dispatch(updateProfileName(name.trim())).unwrap();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error || 'Failed to update profile');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await dispatch(updateProfilePicture(file)).unwrap();
      toast.success('Profile picture updated!');
    } catch (error: any) {
      toast.error(error || 'Failed to update profile picture');
    }
  };

  const handleDownloadCertificate = (courseName: string) => {
    toast.success(`Certificate for ${courseName} downloaded!`);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const avatarUrl = getMediaUrl(reduxUser?.profile_picture || reduxUser?.avatar, '');
  const totalHoursLearned = learningHours?.total_hours_learned || 0;
  const coursesInProgress = coursesKPI?.courses_in_progress ?? inProgressCourses.length;
  const coursesCompleted = coursesKPI?.courses_completed ?? completedCourses.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={avatarUrl} alt={reduxUser?.full_name} />
                  <AvatarFallback className="text-3xl">{getInitials(reduxUser?.full_name)}</AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 rounded-full cursor-pointer inline-flex h-10 w-10 items-center justify-center bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  id="avatar-upload"
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4 max-w-xl">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={reduxUser?.email || ''} disabled />
                    </div>
                    <div>
                      <Label htmlFor="institution">Institution</Label>
                      <Input id="institution" value={reduxUser?.institution || ''} disabled />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSave}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                      <h1 className="text-3xl">{reduxUser?.full_name || 'Student'}</h1>
                      <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-1">{reduxUser?.email}</p>
                    {reduxUser?.institution && (
                      <p className="text-gray-600 mb-4">{reduxUser.institution}</p>
                    )}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <Badge variant="secondary">
                        <User className="w-3 h-3 mr-1" />
                        {reduxUser?.role || 'Student'}
                      </Badge>
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        {learningHistory.length > 0
                          ? `Learning since ${new Date(learningHistory[learningHistory.length - 1].enrolledAt).toLocaleDateString()}`
                          : 'No enrollments yet'}
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              {!isEditing && (
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-2xl mb-1">{coursesInProgress}</div>
                    <div className="text-sm text-gray-600">In Progress</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">{coursesCompleted}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl mb-1">{totalHoursLearned}</div>
                    <div className="text-sm text-gray-600">Hours</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4 mt-6">
            {enrollmentsLoading && learningHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-gray-600">Loading your courses...</CardContent>
              </Card>
            ) : learningHistory.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No courses yet</h3>
                  <p className="text-gray-600">Start learning by enrolling in a course</p>
                </CardContent>
              </Card>
            ) : (
              learningHistory.map(item => (
                <Card key={item.enrollmentId}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <img
                        src={getMediaUrl(item.thumbnail)}
                        alt={item.courseName}
                        className="w-full sm:w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-medium mb-1">{item.courseName}</h3>
                            <p className="text-sm text-gray-600">By {item.instructor}</p>
                          </div>
                          <Badge>{item.level}</Badge>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{item.progress}%</span>
                          </div>
                          <Progress value={item.progress} />
                          <p className="text-sm text-gray-600">
                            {item.completedItems} of {item.totalItems} items completed
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4 mt-6">
            {completedCourses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No certificates yet</h3>
                  <p className="text-gray-600">Complete a course to earn a certificate</p>
                </CardContent>
              </Card>
            ) : (
              completedCourses.map(item => (
                <Card key={item.enrollmentId}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="relative">
                        <img
                          src={getMediaUrl(item.thumbnail)}
                          alt={item.courseName}
                          className="w-full sm:w-32 h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-green-600/10 rounded-lg flex items-center justify-center">
                          <Badge className="bg-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{item.courseName}</h3>
                        <p className="text-sm text-gray-600">By {item.instructor}</p>
                        <div className="space-y-2 mt-4">
                          <span className="text-sm text-gray-600">
                            Completed on {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'Recently'}
                          </span>
                          <div className="flex gap-2 mt-3">
                            <Link to={`/certificate/${item.courseId}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View Certificate
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleDownloadCertificate(item.courseName)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {learningHistory.length === 0 ? (
                  <p className="text-sm text-gray-600">Your course activity will appear here.</p>
                ) : (
                  learningHistory.slice(0, 5).map(item => (
                    <div key={item.enrollmentId} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {item.status === 'completed' ? (
                          <Trophy className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {item.status === 'completed' ? 'Completed' : 'Learning'} "{item.courseName}"
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(item.lastAccessedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};
