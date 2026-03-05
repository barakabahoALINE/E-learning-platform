import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { MainLayout } from "../components/MainLayout";
import { toast } from "sonner";

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams();
  const { courses, enrollInCourse, user, enrolledCourses } = useApp();
  const navigate = useNavigate();

  const course = courses.find((c) => c.id === courseId);
  const isEnrolled = enrolledCourses.some((c) => c.id === courseId);
  const isCompleted = user?.completedCourses.includes(courseId!);

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

  const handleEnroll = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    enrollInCourse(course.id);
    toast.success("Successfully enrolled in course!");
  };

  const handleStartLearning = () => {
    const firstLesson = course.syllabus[0]?.lessons[0];
    if (firstLesson) {
      navigate(`/lesson/${course.id}/${firstLesson.id}`);
    }
  };

  const handleViewCertificate = () => {
    navigate(`/certificate/${course.id}`);
  };

  const totalLessons = course.syllabus.reduce(
    (sum, section) => sum + section.lessons.length,
    0,
  );

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
            <div className="relative rounded-xl overflow-hidden mb-6">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-[400px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                <div className="p-8 text-white w-full">
                  <Badge className="mb-3">{course.category}</Badge>
                  <h1 className="text-3xl mb-2">{course.title}</h1>
                  <p className="text-lg text-gray-200 mb-4">
                    {course.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-400 mr-1 fill-yellow-400" />
                      <span>{course.rating}</span>
                      <span className="ml-1 text-gray-300">
                        ({course.studentsCount.toLocaleString()} students)
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 mr-1" />
                      <span>{course.duration}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-white border-white"
                    >
                      {course.level}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">What you'll learn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {course.skills.map((skill, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{skill}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">Course Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">
                            Total Lessons
                          </div>
                          <div className="font-medium">
                            {totalLessons} lessons
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
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl mb-4">Course Curriculum</h3>
                    <Accordion type="single" collapsible className="w-full">
                      {course.syllabus.map((section, index) => (
                        <AccordionItem key={section.id} value={section.id}>
                          <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-4">
                              <span className="font-medium">
                                {index + 1}. {section.title}
                              </span>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>{section.lessons.length} lessons</span>
                                <span>{section.duration}</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pt-2">
                              {section.lessons.map((lesson) => (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                                >
                                  <div className="flex items-center space-x-3">
                                    {lesson.type === "video" && (
                                      <PlayCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                    {lesson.type === "reading" && (
                                      <FileText className="w-5 h-5 text-gray-400" />
                                    )}
                                    {lesson.type === "quiz" && (
                                      <CheckCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                    <span className="text-sm">
                                      {lesson.title}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {lesson.duration}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="mt-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4 mb-6">
                      <Avatar className="w-20 h-20">
                        <AvatarImage
                          src={course.instructor.avatar}
                          alt={course.instructor.name}
                        />
                        <AvatarFallback>
                          {course.instructor.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl mb-1">
                          {course.instructor.name}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          {course.instructor.title}
                        </p>
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-500 mr-1 fill-yellow-500" />
                            <span>{course.instructor.rating} rating</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            <span>
                              {(course.instructor.studentsCount / 1000).toFixed(
                                0,
                              )}
                              k students
                            </span>
                          </div>
                          <div className="flex items-center">
                            <BookOpen className="w-4 h-4 mr-1" />
                            <span>
                              {course.instructor.coursesCount} courses
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700">{course.instructor.bio}</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {isCompleted ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <Badge className="bg-green-600 mb-2">
                        <Award className="w-3 h-3 mr-1" />
                        Course Completed
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">
                        Congratulations! You've completed this course
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      variant="outline"
                      onClick={handleViewCertificate}
                    >
                      <Award className="mr-2 h-5 w-5" />
                      View Certificate
                    </Button>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartLearning}
                    >
                      Review Course Content
                    </Button>
                  </div>
                ) : isEnrolled ? (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-4">
                        You're enrolled in this course
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Your Progress</span>
                        <span className="font-medium">45%</span>
                      </div>
                      <Progress value={45} />
                      <p className="text-xs text-gray-600">
                        12 of 27 lessons completed
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleStartLearning}
                    >
                      Continue Learning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      {course.isFree ? (
                        <div>
                          <div className="text-3xl text-green-600 mb-2">
                            Free
                          </div>
                          <p className="text-sm text-gray-600">
                            Full access to all content
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm text-gray-600 line-through mb-1">
                            Full Price Frw {(course.price * 1.5).toFixed(2)}
                          </div>
                          <div className="text-3xl mb-2">
                            Frw {course.price}
                          </div>
                          <Badge variant="secondary">33% off</Badge>
                        </div>
                      )}
                    </div>
                    <Button className="w-full" size="lg" onClick={handleEnroll}>
                      Enroll Now
                    </Button>
                    <div className="text-center text-xs text-gray-500">
                      30-day money-back guarantee
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t space-y-3">
                  <h4 className="font-medium mb-3">This course includes:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <PlayCircle className="w-4 h-4 text-gray-600" />
                      <span>{course.duration} on-demand video</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span>{totalLessons} lessons</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-gray-600" />
                      <span>Access on mobile and desktop</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-gray-600" />
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
