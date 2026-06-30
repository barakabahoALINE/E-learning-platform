import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Mail, Calendar, MoreVertical } from 'lucide-react';
import api from '../../services/api';

interface StudentEnrollment {
  id: number;
  student: {
    id: number;
    email: string;
    full_name: string;
  };
  course: {
    id: number;
    title: string;
  };
  status: string;
  enrolled_at: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
}

export const InstructorCourseStudents: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseAndStudents();
  }, [courseId]);

  const fetchCourseAndStudents = async () => {
    try {
      setLoading(true);

      // Fetch course details
      if (courseId) {
        const courseRes = await api.get(`/api/courses/${courseId}/`);
        setCourse(courseRes.data);

        // Fetch course enrollments for instructor
        const enrollmentsRes = await api.get('/api/enrollments/instructor/course-enrollments/');
        const courseEnrollments = enrollmentsRes.data.data?.filter(
          (e: StudentEnrollment) => e.course.id === parseInt(courseId)
        ) || [];
        setEnrollments(courseEnrollments);
      }
    } catch (error) {
      console.error('Failed to fetch course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'completed':
        return 'text-blue-600 bg-blue-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading course students...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Course not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Courses
        </Button>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle>{course.title}</CardTitle>
          <CardDescription>{course.description}</CardDescription>
        </CardHeader>
      </Card>

      {/* Students List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          Enrolled Students ({enrollments.length})
        </h2>

        {enrollments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-600">No students enrolled yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-grow">
                      <h3 className="font-semibold text-lg">{enrollment.student.full_name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail size={14} />
                          {enrollment.student.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          Enrolled {formatDate(enrollment.enrolled_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(enrollment.status)}`}>
                        {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                      </span>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
