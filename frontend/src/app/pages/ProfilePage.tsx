import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  User,
  Mail,
  Calendar,
  Award,
  BookOpen,
  Clock,
  Edit,
  Camera,
  Trophy,
  Download,
  Eye,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { MainLayout } from "../components/MainLayout";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export const ProfilePage: React.FC = () => {
  const { user, enrolledCourses, courses } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const handleSave = () => {
    toast.success("Profile updated successfully!");
    setIsEditing(false);
  };

  const totalHoursLearned = 42; // Mock data
  const coursesCompleted = user?.completedCourses.length || 0;
  const coursesInProgress = enrolledCourses.length;

  // Get completed courses
  const completedCourses = courses.filter((course) =>
    user?.completedCourses.includes(course.id),
  );

  const handleDownloadCertificate = (courseName: string) => {
    toast.success(`Certificate for ${courseName} downloaded!`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-3xl">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full"
                  variant="secondary"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 text-center md:text-left">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handleSave}>Save Changes</Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center md:justify-start space-x-2 mb-2">
                      <h1 className="text-3xl">{user?.name}</h1>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-4">{user?.email}</p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <Badge variant="secondary">
                        <User className="w-3 h-3 mr-1" />
                        Student
                      </Badge>
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        Joined Feb 2026
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
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

        <Tabs defaultValue="courses" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4 mt-6">
            {enrolledCourses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg mb-2">No courses yet</h3>
                  <p className="text-gray-600">
                    Start learning by enrolling in a course
                  </p>
                </CardContent>
              </Card>
            ) : (
              enrolledCourses.map((course) => (
                <Card key={course.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium mb-1">{course.title}</h3>
                            <p className="text-sm text-gray-600">
                              By {course.instructor.name}
                            </p>
                          </div>
                          <Badge>{course.level}</Badge>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">45%</span>
                          </div>
                          <Progress value={45} />
                          <p className="text-sm text-gray-600">
                            12 of 27 lessons completed
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
                  <p className="text-gray-600">
                    Complete a course to earn a certificate
                  </p>
                </CardContent>
              </Card>
            ) : (
              completedCourses.map((course) => (
                <Card key={course.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="relative">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-green-600/10 rounded-lg flex items-center justify-center">
                          <Badge className="bg-green-600">
                            <Trophy className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium mb-1">{course.title}</h3>
                            <p className="text-sm text-gray-600">
                              By {course.instructor.name}
                            </p>
                          </div>
                          <Badge>{course.level}</Badge>
                        </div>
                        <div className="space-y-2 mt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              Completed on Feb 18, 2026
                            </span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Link to={`/certificate/${course.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View Certificate
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownloadCertificate(course.title)
                              }
                            >
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

          <TabsContent value="achievements" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {user?.achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                      <Trophy className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="font-medium mb-2">{achievement.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      Unlocked on {achievement.unlockedAt}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {/* Locked Achievements */}
              <Card className="opacity-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium mb-2">Complete 5 Courses</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Complete 5 courses to unlock
                  </p>
                  <Progress value={40} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">2 of 5 completed</p>
                </CardContent>
              </Card>

              <Card className="opacity-50">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium mb-2">30-Day Streak</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Learn for 30 days in a row
                  </p>
                  <Progress value={17} className="h-2" />
                  <p className="text-xs text-gray-500 mt-2">5 of 30 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Completed lesson "HTML Fundamentals"
                    </p>
                    <p className="text-xs text-gray-500">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">Earned achievement "Quiz Master"</p>
                    <p className="text-xs text-gray-500">1 day ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">
                      Started "Complete Web Development Bootcamp"
                    </p>
                    <p className="text-xs text-gray-500">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};
