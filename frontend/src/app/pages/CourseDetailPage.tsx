import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  BookOpen,
  Clock,
  Users,
  Star,
  PlayCircle,
  CheckCircle,
  Award,
  Globe,
  Smartphone,
  FileText,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { fetchCourseDetails, fetchCategories, fetchLevels } from "../../features/courses/courseSlice";
import { fetchMyEnrollments, enrollInCourse } from "../../features/enrollments/enrollmentSlice";
import { fetchCourseProgress, startLearning, continueLearning } from "../../features/progress/progressSlice";
import { MainLayout } from "../components/MainLayout";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentCourse: course, isLoading: isCourseLoading, categories, levels } = useAppSelector((state) => state.courses);
  
  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80";
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };

  const { myEnrollments, loading: isEnrollmentLoading } = useAppSelector((state) => state.enrollments);
  const { courseProgress } = useAppSelector((state) => state.progress);
  const { user } = useAppSelector((state) => state.auth);

  const numericCourseId = Number(courseId);
  const isEnrolled = myEnrollments.some((e) => e.course === numericCourseId);
  const progress = courseProgress[numericCourseId];

  useEffect(() => {
    if (numericCourseId) {
      dispatch(fetchCourseDetails(numericCourseId));
      dispatch(fetchCourseProgress(numericCourseId));
    }
  }, [dispatch, numericCourseId]);

  useEffect(() => {
    if (user && numericCourseId) {
      dispatch(fetchMyEnrollments());
    }
  }, [dispatch, numericCourseId, user?.id]);

  useEffect(() => {
    if (categories.length === 0) dispatch(fetchCategories());
    if (levels.length === 0) dispatch(fetchLevels());
  }, [dispatch]);

  if (isCourseLoading && !course) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!course) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl mb-4">Course not found</h2>
          <Link to="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await dispatch(enrollInCourse(numericCourseId)).unwrap();
      await dispatch(fetchCourseProgress(numericCourseId)).unwrap();
      toast.success("Successfully enrolled in course!");
    } catch (error: any) {
      toast.error(error || "Failed to enroll in course");
    }
  };

  const handleStartLearning = async () => {
    // Explicitly call start or continue based on current progress
    try {
      if (progress?.completion_percentage === 0) {
        await dispatch(startLearning(numericCourseId)).unwrap();
      } else {
        await dispatch(continueLearning(numericCourseId)).unwrap();
      }
    } catch (error) {
      console.error("Failed to update learning session:", error);
    }

    const firstModule = course.modules?.[0];
    const firstSection = firstModule?.sections?.[0];
    const firstContent = firstSection?.contents?.[0];
    
    if (firstModule && firstContent) {
      navigate(`/learning/${course.id}/${firstModule.id}`);
    } else if (firstModule) {
      navigate(`/learning/${course.id}/${firstModule.id}`);
    }
  };

  const handleViewCertificate = () => {
    navigate(`/certificate/${course.id}`);
  };

  const totalModules = course.modules?.length || 0;
  const totalItems = course.modules?.reduce(
    (sum, module) => sum + module.sections.reduce((sSum, section) => sSum + (section.contents?.length || 0), 0),
    0,
  ) || 0;

  const categoryName = categories.find(c => c.id === course.category)?.name || "Uncategorized";
  const levelName = levels.find(l => l.id === course.level)?.name || "All Levels";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link to="/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to courses
          </Button>
        </Link>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="relative rounded-xl overflow-hidden mb-6 group">
              <img
                src={getImageUrl(course.thumbnail)}
                alt={course.title}
                className="w-full h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end">
                <div className="p-8 text-white w-full">
                  <Badge className="mb-3 bg-primary hover:bg-primary/90">{categoryName}</Badge>
                  <h1 className="text-md lg:text-4xl font-bold mb-3 tracking-tight">{course.title}</h1>
                  <p className="text-sm lg:text-lg text-gray-200 mb-6 max-w-2xl line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Star className="w-4 h-4 text-yellow-400 mr-2 fill-yellow-400" />
                      <span className="font-semibold">{course?.rating || 0}</span>
                      <span className="ml-1 opacity-70">
                        ({course.enrolled_students_count || 0} students)
                      </span>
                    </div>
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
                      <Award className="w-4 h-4 mr-2" />
                      <span>{levelName}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3"> 
                <TabsTrigger value="overview" className="cursor-pointer">Overview</TabsTrigger>
                <TabsTrigger value="curriculum" className="cursor-pointer">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor" className="cursor-pointer">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {course.modules && course.modules.length > 0 ? (
                        course.modules.map((module) => (
                          <div key={module.id} className="flex items-start space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium">{module.title}</span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-sm text-gray-500 italic">
                          Learning objectives will be published soon.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">Course Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Total Modules
                          </div>
                          <div className="font-medium">
                            {totalModules} modules
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-medium">{course.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Language</div>
                          <div className="font-medium">English</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Award className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Certificate
                          </div>
                          <div className="font-medium">Included</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="curriculum" className="mt-6">
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">Course Curriculum</h3>
                      <div className="text-sm text-gray-500">
                        {totalModules} modules • {totalItems} items
                      </div>
                    </div>
                    <Accordion type="single" collapsible className="w-full space-y-3">
                      {course.modules?.map((module, mIdx) => (
                        <AccordionItem key={module.id} value={`module-${module.id}`} className="border rounded-xl px-4 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <AccordionTrigger className="hover:no-underline py-5 cursor-pointer">
                            <div className="flex items-center justify-between w-full pr-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                  {mIdx + 1}
                                </div>
                                <span className="font-bold text-gray-800 text-lg">
                                  {module.title}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-500 font-normal">
                                <span>{module.sections.length} sections</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-6 pt-2 pb-6 px-2">
                              {module.sections?.map((section, sIdx) => (
                                <div key={section.id} className="space-y-3">
                                  <div className="flex items-center gap-2 text-sm font-bold text-gray-600 uppercase tracking-wider">
                                    <div className="h-px bg-gray-200 flex-1" />
                                    <span>Section {sIdx + 1}: {section.title}</span>
                                    <div className="h-px bg-gray-200 flex-1" />
                                  </div>
                                  <div className="space-y-2">
                                    {section.contents?.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 hover:bg-white transition-all border border-transparent hover:border-primary/20 hover:shadow-sm"
                                      >
                                        {/* <div className="flex items-center space-x-4">
                                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 text-primary shadow-xs">
                                            {item.content_type === "video" && <PlayCircle className="w-5 h-5" />}
                                            {item.content_type === "text" && <FileText className="w-5 h-5" />}
                                            {item.content_type === "file" && <FileText className="w-5 h-5" />}
                                            {item.content_type === "image" && <PlayCircle className="w-5 h-5" />}
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge variant="secondary" className="text-[10px] uppercase font-bold py-0 h-4 bg-gray-100 text-gray-500 border-none">
                                                {item.content_type}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div> */}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                              {module.quiz && (
                                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                      <CheckCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-amber-900">{module.quiz.title || "Module Quiz"}</p>
                                      <p className="text-xs text-amber-700">{module.quiz.questions.length} questions</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-6">
                      <Avatar className="w-20 h-20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {course.admin ? course.admin.substring(0, 2).toUpperCase() : course.instructor ? course.instructor.substring(0,2).toUpperCase() : "AD"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold mb-1">{course.admin || course.instructor || "Platform Instructor"}</h3>
                        <p className="text-gray-600 mb-3">Course Creator</p>
                        <div className="flex items-center flex-wrap gap-y-2 space-x-4 text-sm">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                            <span>4.8 rating</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-gray-500" />
                            <span>{course.enrolled_students_count || 0} students</span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1 text-gray-500" />
                            <span>1+ courses</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* <p className="text-gray-700">
                      This course is authored and maintained by our expert instructors. They are dedicated to bringing you the highest quality learning material and keeping the content up to date with the latest industry standards.
                    </p> */}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {progress?.completion_percentage === 100 ? (
                  <div className="space-y-6">
                    <div className="text-center py-4 bg-green-50 rounded-2xl">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <Badge className="bg-green-600 mb-2">
                        Course Completed
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2 px-4">
                        Congratulations! You've mastered this course
                      </p>
                    </div>
                    <Button
                      className="w-full" size="lg" variant="outline"
                      onClick={handleViewCertificate}
                    >
                      <Award className="mr-2 h-5 w-5 text-primary" />
                      View Certificate
                    </Button>
                    <Button
                      className="w-full" size="lg"
                      onClick={handleStartLearning}
                    >
                      Review Course Content
                    </Button>
                  </div>
                ) : isEnrolled ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-bold text-primary">
                        You're enrolled!
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 font-medium">Your Progress</span>
                        <span className="font-bold text-primary">{Math.round(progress?.completion_percentage || 0)}%</span>
                      </div>
                      <Progress value={progress?.completion_percentage || 0} className="h-2" />
                      <p className="text-xs text-gray-500 text-center">
                        {progress?.completed_lessons || 0} of {progress?.total_lessons ?? totalItems} {(progress?.total_lessons ?? totalItems) === 1 ? "item" : "items"} completed
                      </p>
                    </div>
                    <Button
                      className="w-full" size="lg"
                      onClick={handleStartLearning}
                    >
                      {progress?.completion_percentage === 0 ? "Start Learning" : "Continue Learning"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-4 rounded-2xl">
                      {course.price === 0 ? (
                        <div>
                          <div className="text-3xl text-green-600 mb-2">Free</div>
                          <p className="text-sm text-gray-600">Full access to all content</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-3xl mb-2">
                            Frw {course.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full" size="lg"
                      onClick={handleEnroll}
                      disabled={isEnrollmentLoading}
                    >
                      {isEnrollmentLoading ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Enroll Now"
                      )}
                    </Button>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t space-y-4">
                  <h4 className="font-medium mb-3">This course includes:</h4>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <FileText className="w-4 h-4 mr-3 text-primary" />
                      <span>{totalModules} {totalModules === 1 ? "Module" : "Modules"}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <PlayCircle className="w-4 h-4 mr-3 text-primary" />
                      <span>{totalItems} Learning items</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Smartphone className="w-4 h-4 mr-3 text-primary" />
                      <span>Access on mobile and tablet</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Award className="w-4 h-4 mr-3 text-primary" />
                      <span>Certificate of completion</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
