// Mock data for the e-learning platform

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'instructor';
  enrolledCourses: string[];
  completedCourses: string[];
  completedLessons: { courseId: string; lessonId: string }[];
  achievements: Achievement[];
  learningGoals?: string[];
  skillLevel?: string;
  learningPace?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  duration: string;
  lessonsCount: number;
  studentsCount: number;
  rating: number;
  thumbnail: string;
  instructor: Instructor;
  syllabus: SyllabusItem[];
  skills: string[];
  isFree: boolean;
}

export interface Instructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  rating: number;
  studentsCount: number;
  coursesCount: number;
}

export interface SyllabusItem {
  id: string;
  title: string;
  lessons: Lesson[];
  duration: string;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'quiz';
  duration: string;
  isCompleted?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const mockInstructors: Instructor[] = [
  {
    id: '1',
    name: 'Dr. GATAMBA Louis Prince',
    title: 'Senior Web Developer & Instructor',
    bio: 'With over 10 years of experience in web development and 5 years teaching online, Sarah has helped thousands of students master modern web technologies.',
    avatar: 'https://images.unsplash.com/photo-1573497161161-c3e73707e25c?w=400',
    rating: 4.9,
    studentsCount: 45000,
    coursesCount: 12,
  },
  {
    id: '2',
    name: 'Louis Prince',
    title: 'Data Science Expert',
    bio: 'Former data scientist at leading tech companies, now dedicated to making data science accessible to everyone.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    rating: 4.8,
    studentsCount: 32000,
    coursesCount: 8,
  },
  {
    id: '3',
    name: 'Happy GIKUNDIRO',
    title: 'UX/UI Design Lead',
    bio: 'Award-winning designer with a passion for creating beautiful and functional user experiences.',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
    rating: 4.9,
    studentsCount: 28000,
    coursesCount: 10,
  },
];

export const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Complete Web Development Bootcamp',
    description: 'Learn HTML, CSS, JavaScript, React, Node.js, and more. Build real-world projects and launch your career as a web developer.',
    category: 'Web Development',
    level: 'Beginner',
    price: 0,
    duration: '40 hours',
    lessonsCount: 156,
    studentsCount: 45230,
    rating: 4.8,
    thumbnail: 'https://images.unsplash.com/photo-1637937459053-c788742455be?w=800',
    instructor: mockInstructors[0],
    isFree: true,
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js'],
    syllabus: [
      {
        id: '1-1',
        title: 'Introduction to Web Development',
        duration: '2 hours',
        lessons: [
          { id: '1-1-1', title: 'What is Web Development?', type: 'video', duration: '10 min' },
          { id: '1-1-2', title: 'Setting Up Your Environment', type: 'video', duration: '15 min' },
          { id: '1-1-3', title: 'Your First Web Page', type: 'video', duration: '20 min' },
        ],
      },
      {
        id: '1-2',
        title: 'HTML Fundamentals',
        duration: '5 hours',
        lessons: [
          { id: '1-2-1', title: 'HTML Structure', type: 'video', duration: '25 min' },
          { id: '1-2-2', title: 'Text Formatting', type: 'video', duration: '20 min' },
          { id: '1-2-3', title: 'Links and Images', type: 'video', duration: '30 min' },
          { id: '1-2-4', title: 'HTML Quiz', type: 'quiz', duration: '15 min' },
        ],
      },
      {
        id: '1-3',
        title: 'CSS Styling',
        duration: '8 hours',
        lessons: [
          { id: '1-3-1', title: 'CSS Basics', type: 'video', duration: '30 min' },
          { id: '1-3-2', title: 'Flexbox Layout', type: 'video', duration: '45 min' },
          { id: '1-3-3', title: 'Responsive Design', type: 'video', duration: '40 min' },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Data Science and Machine Learning',
    description: 'Master Python, statistics, machine learning algorithms, and deep learning. Work on real-world data science projects.',
    category: 'Data Science',
    level: 'Intermediate',
    price: 100000,
    duration: '60 hours',
    lessonsCount: 204,
    studentsCount: 32100,
    rating: 4.9,
    thumbnail: 'https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?w=800',
    instructor: mockInstructors[1],
    isFree: false,
    skills: ['Python', 'Statistics', 'Machine Learning', 'TensorFlow', 'Pandas'],
    syllabus: [
      {
        id: '2-1',
        title: 'Python for Data Science',
        duration: '10 hours',
        lessons: [
          { id: '2-1-1', title: 'Python Basics', type: 'video', duration: '45 min' },
          { id: '2-1-2', title: 'NumPy and Pandas', type: 'video', duration: '60 min' },
          { id: '2-1-3', title: 'Data Visualization', type: 'video', duration: '50 min' },
        ],
      },
      {
        id: '2-2',
        title: 'Machine Learning Fundamentals',
        duration: '15 hours',
        lessons: [
          { id: '2-2-1', title: 'Introduction to ML', type: 'video', duration: '40 min' },
          { id: '2-2-2', title: 'Supervised Learning', type: 'video', duration: '55 min' },
          { id: '2-2-3', title: 'Unsupervised Learning', type: 'video', duration: '50 min' },
        ],
      },
    ],
  },
  {
    id: '3',
    title: 'UX/UI Design Masterclass',
    description: 'Learn user experience design, user interface design, prototyping, and design thinking. Create stunning designs.',
    category: 'Design',
    level: 'Beginner',
    price: 0,
    duration: '35 hours',
    lessonsCount: 128,
    studentsCount: 28450,
    rating: 4.9,
    thumbnail: 'https://images.unsplash.com/photo-1740174459718-fdcc63ee3b4f?w=800',
    instructor: mockInstructors[2],
    isFree: true,
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems'],
    syllabus: [
      {
        id: '3-1',
        title: 'Introduction to UX/UI',
        duration: '4 hours',
        lessons: [
          { id: '3-1-1', title: 'What is UX/UI?', type: 'video', duration: '20 min' },
          { id: '3-1-2', title: 'Design Principles', type: 'video', duration: '30 min' },
          { id: '3-1-3', title: 'Design Tools Overview', type: 'video', duration: '25 min' },
        ],
      },
    ],
  },
  {
    id: '4',
    title: 'Advanced React Development',
    description: 'Deep dive into React patterns, performance optimization, testing, and building scalable applications.',
    category: 'Web Development',
    level: 'Advanced',
    price: 150000,
    duration: '50 hours',
    lessonsCount: 180,
    studentsCount: 18500,
    rating: 4.7,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    instructor: mockInstructors[0],
    isFree: false,
    skills: ['React', 'TypeScript', 'Redux', 'Testing', 'Performance'],
    syllabus: [
      {
        id: '4-1',
        title: 'Advanced React Patterns',
        duration: '12 hours',
        lessons: [
          { id: '4-1-1', title: 'Custom Hooks', type: 'video', duration: '45 min' },
          { id: '4-1-2', title: 'Context API Patterns', type: 'video', duration: '50 min' },
          { id: '4-1-3', title: 'Render Props', type: 'video', duration: '40 min' },
        ],
      },
    ],
  },
  {
    id: '5',
    title: 'Digital Marketing Fundamentals',
    description: 'Learn SEO, social media marketing, content marketing, email marketing, and analytics.',
    category: 'Marketing',
    level: 'Beginner',
    price: 0,
    duration: '25 hours',
    lessonsCount: 96,
    studentsCount: 34200,
    rating: 4.6,
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    instructor: mockInstructors[2],
    isFree: true,
    skills: ['SEO', 'Social Media', 'Content Marketing', 'Analytics', 'Email Marketing'],
    syllabus: [
      {
        id: '5-1',
        title: 'Introduction to Digital Marketing',
        duration: '5 hours',
        lessons: [
          { id: '5-1-1', title: 'Marketing Basics', type: 'video', duration: '30 min' },
          { id: '5-1-2', title: 'Digital Marketing Landscape', type: 'video', duration: '35 min' },
        ],
      },
    ],
  },
  {
    id: '6',
    title: 'Cloud Computing with AWS',
    description: 'Master AWS services, cloud architecture, deployment, and DevOps practices.',
    category: 'Cloud Computing',
    level: 'Intermediate',
    price: 120000,
    duration: '45 hours',
    lessonsCount: 165,
    studentsCount: 22300,
    rating: 4.8,
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
    instructor: mockInstructors[1],
    isFree: false,
    skills: ['AWS', 'EC2', 'S3', 'Lambda', 'DevOps'],
    syllabus: [
      {
        id: '6-1',
        title: 'AWS Fundamentals',
        duration: '8 hours',
        lessons: [
          { id: '6-1-1', title: 'Introduction to AWS', type: 'video', duration: '40 min' },
          { id: '6-1-2', title: 'EC2 Instances', type: 'video', duration: '55 min' },
        ],
      },
    ],
  },
];

export const mockQuiz: Quiz = {
  id: 'quiz-1',
  title: 'HTML Fundamentals Quiz',
  questions: [
    {
      id: 'q1',
      question: 'What does HTML stand for?',
      options: [
        'Hyper Text Markup Language',
        'High Tech Modern Language',
        'Home Tool Markup Language',
        'Hyperlinks and Text Markup Language',
      ],
      correctAnswer: 0,
      explanation: 'HTML stands for Hyper Text Markup Language. It is the standard markup language for creating web pages.',
    },
    {
      id: 'q2',
      question: 'Which HTML tag is used to define an internal style sheet?',
      options: ['<style>', '<css>', '<script>', '<styles>'],
      correctAnswer: 0,
      explanation: 'The <style> tag is used to define internal CSS styles within an HTML document.',
    },
    {
      id: 'q3',
      question: 'Which HTML attribute specifies an alternate text for an image?',
      options: ['title', 'alt', 'src', 'longdesc'],
      correctAnswer: 1,
      explanation: 'The "alt" attribute provides alternative text for an image if it cannot be displayed.',
    },
    {
      id: 'q4',
      question: 'How do you create a hyperlink in HTML?',
      options: ['<a href="url">Link</a>', '<link>url</link>', '<hyperlink>url</hyperlink>', '<url>Link</url>'],
      correctAnswer: 0,
      explanation: 'The <a> tag with href attribute is used to create hyperlinks in HTML.',
    },
    {
      id: 'q5',
      question: 'Which tag is used to create an unordered list?',
      options: ['<ol>', '<ul>', '<list>', '<li>'],
      correctAnswer: 1,
      explanation: 'The <ul> tag is used to create an unordered (bulleted) list in HTML.',
    },
  ],
};

export const mockUser: User = {
  id: '1',
  name: 'Prince GATAMBA',
  email: 'prince.gatamba@example.com',
  avatar: '',
  role: 'student',
  enrolledCourses: ['1', '2'],
  completedCourses: [],
  completedLessons: [],
  achievements: [
    {
      id: 'a1',
      title: 'First Course Started',
      description: 'Started your first learning journey',
      icon: 'Rocket',
      unlockedAt: '2026-01-15',
    },
    {
      id: 'a2',
      title: 'Quiz Master',
      description: 'Scored 100% on your first quiz',
      icon: 'Trophy',
      unlockedAt: '2026-01-20',
    },
  ],
  learningGoals: ['Web Development', 'Data Science'],
  skillLevel: 'Beginner',
  learningPace: '5-10 hours/week',
};