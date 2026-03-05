import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Award,
  Download,
  Share2,
  CheckCircle,
  Trophy,
  Star,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { toast } from "sonner";

export const CertificatePage: React.FC = () => {
  const { courseId } = useParams();
  const { courses, user, completeCourse } = useApp();

  const course = courses.find((c) => c.id === courseId);
  const isCompleted = user?.completedCourses.includes(courseId!);

  // Automatically mark course as complete when certificate page loads
  useEffect(() => {
    if (courseId && !isCompleted) {
      completeCourse(courseId);
      toast.success("Congratulations! Course marked as completed!");
    }
  }, [courseId, isCompleted, completeCourse]);

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

  const handleDownload = () => {
    toast.success("Certificate downloaded successfully!");
  };

  const handleShare = () => {
    toast.success("Share link copied to clipboard!");
  };

  const handleComplete = () => {
    completeCourse(courseId!);
    toast.success("Course marked as completed!");
  };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Celebration Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mb-6 animate-bounce">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl mb-4">🎉 Congratulations! 🎉</h1>
          <p className="text-xl text-gray-600">
            You've successfully completed{" "}
            <span className="font-medium">{course.title}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Certificate Preview */}
          <div className="lg:col-span-2">
            <Card className="shadow-2xl">
              <CardContent className="p-0">
                {/* Certificate Design */}
                <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8">
                  <div className="bg-white rounded-lg p-12 text-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-blue-600 opacity-20" />
                    <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-purple-600 opacity-20" />

                    <div className="relative z-10">
                      <Award className="w-16 h-16 text-yellow-500 mx-auto mb-6" />

                      <h2 className="text-3xl mb-2">
                        Certificate of Completion
                      </h2>
                      <p className="text-gray-600 mb-8">This certifies that</p>

                      <h3 className="text-4xl mb-8 font-serif">{user?.name}</h3>

                      <p className="text-gray-600 mb-4">
                        has successfully completed
                      </p>

                      <h4 className="text-2xl mb-8">{course.title}</h4>

                      <div className="flex items-center justify-center space-x-12 mb-8">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Date</p>
                          <p className="font-medium">{today}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Duration</p>
                          <p className="font-medium">{course.duration}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-8 pt-8 border-t">
                        <div className="text-center">
                          <div className="w-24 h-px bg-gray-800 mb-2 mx-auto" />
                          <p className="text-sm">{course.instructor.name}</p>
                          <p className="text-xs text-gray-600">Instructor</p>
                        </div>
                        <div className="text-center">
                          <div className="w-24 h-px bg-gray-800 mb-2 mx-auto" />
                          <p className="text-sm">NISR LearnHub</p>
                          <p className="text-xs text-gray-600">Platform</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-gray-50 border-t flex flex-wrap gap-3 justify-center">
                  <Button
                    onClick={handleDownload}
                    className="flex items-center"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex items-center"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share on LinkedIn
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats & Next Steps */}
          <div className="space-y-6">
            {/* Course Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center">
                  <Star className="mr-2 h-5 w-5 text-yellow-500" />
                  Your Achievement
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Completion Rate
                    </span>
                    <Badge className="bg-green-600">100%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Time Spent</span>
                    <span className="font-medium">{course.duration}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Lessons Completed
                    </span>
                    <span className="font-medium">{course.lessonsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Final Score</span>
                    <span className="font-medium">95%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Earned */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4 flex items-center">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                  Skills You've Mastered
                </h3>
                <div className="flex flex-wrap gap-2">
                  {course.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">What's Next?</h3>
                <div className="space-y-3">
                  <Link to="/courses">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Explore More Courses
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      View Dashboard
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="outline" className="w-full justify-start">
                      <Award className="mr-2 h-4 w-4" />
                      View My Certificates
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Courses */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl mb-4">Continue Learning</h3>
            <p className="text-gray-600 mb-4">
              Based on your interest in {course.category}, you might enjoy these
              courses:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {courses
                .filter(
                  (c) => c.category === course.category && c.id !== course.id,
                )
                .slice(0, 3)
                .map((relatedCourse) => (
                  <Link
                    key={relatedCourse.id}
                    to={`/course/${relatedCourse.id}`}
                  >
                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <img
                        src={relatedCourse.thumbnail}
                        alt={relatedCourse.title}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h4 className="font-medium mb-2 line-clamp-2">
                        {relatedCourse.title}
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline">{relatedCourse.level}</Badge>
                        <span className="text-gray-600">
                          {relatedCourse.duration}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
