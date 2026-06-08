import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
    BookOpen,
    Users,
    Award,
    TrendingUp,
    Clock,
    Star,
    CheckCircle,
    PlayCircle,
    ArrowRight,
    Sparkles,
    Target,
    Zap,
    Globe,
    Search,
    Code,
    Palette,
    BarChart,
    Megaphone,
    Database,
    Briefcase,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/reduxHooks';
import { fetchCourses, fetchCategories } from '../../features/courses/courseSlice';
import { logout } from '../../features/auth/authSlice';
import Logo from '../assets/R.png';
import HomePhoto from '../assets/Homepage photo.png'
import { getMediaUrl } from '../utils/media';
import api from '../../services/api';

export const HomePage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { user } = useAppSelector((state) => state.auth);
    const isLoggedIn = !!user;
    const { courses, categories } = useAppSelector((state) => state.courses);

    const [publicStats, setPublicStats] = useState({
        total_students: 0,
        total_instructors: 0,
        total_courses: 0,
    });
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        dispatch(fetchCourses(false));
        dispatch(fetchCategories());

        api.get('public-stats/')
            .then((res) => {
                if (res.data && res.data.success) {
                    setPublicStats(res.data.data);
                }
            })
            .catch((err) => console.error('Error fetching public stats:', err));
    }, [dispatch]);

    // Add scroll listener to toggle navbar blur
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleCourseClick = (courseId: string | number) => {
        if (isLoggedIn) {
            navigate(`/course/${courseId}`);
        } else {
            navigate('/login');
        }
    };

    const getCategoryIconAndColor = (name: string) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('web') || lowerName.includes('dev') || lowerName.includes('code')) {
            return { icon: Code, color: 'blue' };
        }
        if (lowerName.includes('design') || lowerName.includes('ui') || lowerName.includes('ux') || lowerName.includes('palette')) {
            return { icon: Palette, color: 'purple' };
        }
        if (lowerName.includes('data') || lowerName.includes('science') || lowerName.includes('chart') || lowerName.includes('analyst')) {
            return { icon: BarChart, color: 'green' };
        }
        if (lowerName.includes('market') || lowerName.includes('media') || lowerName.includes('speak')) {
            return { icon: Megaphone, color: 'orange' };
        }
        if (lowerName.includes('cloud') || lowerName.includes('database') || lowerName.includes('server')) {
            return { icon: Database, color: 'indigo' };
        }
        if (lowerName.includes('business') || lowerName.includes('management') || lowerName.includes('finance') || lowerName.includes('briefcase')) {
            return { icon: Briefcase, color: 'red' };
        }
        const indexToMap = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 6;
        const fallbacks = [
            { icon: Code, color: 'blue' },
            { icon: Palette, color: 'purple' },
            { icon: BarChart, color: 'green' },
            { icon: Megaphone, color: 'orange' },
            { icon: Database, color: 'indigo' },
            { icon: Briefcase, color: 'red' },
        ];
        return fallbacks[indexToMap];
    };

    const popularCategories = categories.slice(0, 6);
    const trendingCourses = courses.slice(0, 3);

    const features = [
        {
            icon: BookOpen,
            title: 'Expert-Led Courses',
            description: 'Learn from industry professionals with real-world experience',
            color: 'blue',
        },
        {
            icon: Users,
            title: 'Active Community',
            description: 'Join thousands of learners and grow together',
            color: 'purple',
        },
        {
            icon: Award,
            title: 'Certificates',
            description: 'Earn recognized certificates upon course completion',
            color: 'yellow',
        },
        {
            icon: Clock,
            title: 'Learn at Your Pace',
            description: 'Study anytime, anywhere on any device',
            color: 'green',
        },
    ];

    const stats = [
        { value: publicStats.total_students ? `${publicStats.total_students.toLocaleString()}+` : '100K+', label: 'Active Students' },
        { value: publicStats.total_instructors ? `${publicStats.total_instructors.toLocaleString()}+` : '500+', label: 'Expert Instructors' },
        { value: publicStats.total_courses ? `${publicStats.total_courses.toLocaleString()}+` : '1,000+', label: 'Online Courses' },
    ];

    const testimonials = [
        {
            name: 'Alex Thompson',
            role: 'Web Developer',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
            comment: 'LearnHub transformed my career. The courses are practical and easy to follow.',
            rating: 5,
        },
        {
            name: 'Sarah Martinez',
            role: 'Data Analyst',
            avatar: 'https://images.unsplash.com/photo-1573497161161-c3e73707e25c?w=400',
            comment: 'The instructors are amazing and the community support is incredible!',
            rating: 5,
        },
        {
            name: 'James Wilson',
            role: 'UX Designer',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            comment: 'Best investment in my education. Highly recommend to anyone looking to upskill.',
            rating: 5,
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <style>{`
                @media (min-width: 1024px) {
                    .hero-right-clip {
                        clip-path: polygon(12% 0, 100% 0, 100% 100%, 0% 100%);
                    }
                }
            `}</style>

            {/* Navigation */}
            <nav className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
                <div className={`max-w-7xl mx-auto ${scrolled ? 'bg-white/60 backdrop-blur' : 'bg-white'} shadow-lg rounded-full px-6 py-2 flex items-center justify-between transition-all duration-300`}>
                    <div className="flex items-center space-x-2">
                        <img src={Logo} alt="Logo" className="w-auto h-12" />
                        <span className="hidden sm:block text-2xl font-bold bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] bg-clip-text text-transparent">
                            LearnHub
                        </span>
                    </div>
                    <div className="hidden md:flex items-end space-x-8 pt-1">
                        <a href="#courses" className="font-semibold hover:text-[#2D51A1] transition-colors">
                            Courses
                        </a>
                        <a href="#features" className="font-semibold hover:text-[#2D51A1] transition-colors">
                            Features
                        </a>
                        <a href="#testimonials" className="font-semibold hover:text-[#2D51A1] transition-colors">
                            Testimonials
                        </a>
                        <a href="#pricing" className="font-semibold hover:text-[#2D51A1] transition-colors">
                            Pricing
                        </a>
                    </div>
                    <div className="flex items-center space-x-3">
                        <>
                            <Link to="/signup">
                                <Button className="hidden sm:block bg-[#2D51A1] text-white hover:bg-[#1C3E85] font-semibold rounded- px-5 py-2 text-sm transition-all duration-300">
                                    Get Started
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button className="bg-[#2D51A1] text-white hover:bg-[#1C3E85] font-semibold rounded- px-5 py-2 text-sm transition-all duration-300">
                                    Sign in
                                </Button>
                            </Link>
                        </>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden min-h-[600px] lg:h-screen flex items-center w-full pt-20 lg:pt-0">
                {/* Background Image spanning the entire hero container */}
                <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
                    <img
                        src={HomePhoto}
                        alt="Hero background"
                        className="w-full h-full object-cover object-center"
                    />
                </div>

                {/* Content Overlay Grid */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 h-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 h-full items-center">
                        {/* Left column is empty to let the background image's students show through */}
                        <div className="hidden lg:block h-full" />

                        <div
                            className="flex flex-col justify-end items-end pb-12 px-0 sm:px-6 lg:px-0 text-white h-full min-h-[500px]"
                        >
                            {/* Content Container */}
                            <div className="lg:pr-10 mt-auto mb-6 max-w-md ml-auto mr-0 text-left flex flex-col items-start">
                                <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                                    Unlock Your{' '}
                                    <span className="block mt-2 text-[#33A7DF] font-extrabold tracking-wide drop-shadow-md">
                                        Potential
                                    </span>
                                </h1>
                                <p className="text-lg text-blue-100/90 leading-relaxed mb-8 max-w-md">
                                    Master new skills with expert-led courses. Learn at your own pace, earn certificates, and advance your career.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link to="/signup">
                                        <Button size="lg" className="bg-white text-black font-bold hover:bg-blue-50 px-8 py-3 text-base transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg active:scale-95">
                                            Start Learning
                                        </Button>
                                    </Link>
                                    <Link to="/courses">
                                        <Button size="lg" className="bg-white text-black hover:bg-blue-50 font-bold px-8 py-3 text-base transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg active:scale-95">
                                            Explore courses
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            {/* Socials & Down Arrow footer at the bottom of hero */}
                            <div className="mt-12 lg:mt-0 flex items-center justify-between w-full pt-6 relative">
                                {/* Down Arrow indicators */}
                                <div className="hidden lg:flex justify-center absolute left-[-60px] bottom-[-15px] z-30">
                                    <a href="#categories" className="w-8 h-8 rounded-full border-2 border-white/80 flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 animate-bounce">
                                        <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </a>
                                </div>

                                {/* Social Handles */}
                                <div className="flex items-center space-x-3 text-blue-200/80 hover:text-white transition-colors mx-auto">
                                    <svg className="w-5 h-5" fill="#33A7DF" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                    <svg className="w-5 h-5" fill="#33A7DF" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    <span className="text-md font-bold text-white tracking-wide">@NISR_LearnHub</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* Stats Section */}
            <section className="py-12 bg-white border-y">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-4xl font-bold bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] bg-clip-text text-transparent mb-2">
                                    {stat.value}
                                </div>
                                <div className="text-gray-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Course Categories */}
            <section id="categories" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <Badge className="mb-4">Explore by Category</Badge>
                        <h2 className="text-4xl mb-4">Popular Course Categories</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Discover courses across various fields and industries
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {popularCategories.map((category) => {
                            const { icon: Icon, color } = getCategoryIconAndColor(category.name);
                            const count = courses.filter(c => Number(c.category_id) === category.id).length;
                            const colorMap: any = {
                                blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
                                purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
                                green: 'bg-green-100 text-green-600 hover:bg-green-200',
                                orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
                                indigo: 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
                                red: 'bg-red-100 text-red-600 hover:bg-red-200',
                            };
                            return (
                                <Link to="/courses" key={category.id}>
                                    <Card className="hover:shadow-lg transition-all cursor-pointer group">
                                        <CardContent className="p-6 text-center">
                                            <div className={`w-14 h-14 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center mx-auto mb-3 transition-all group-hover:scale-110`}>
                                                <Icon className="w-7 h-7" />
                                            </div>
                                            <h3 className="font-medium mb-1">{category.name}</h3>
                                            <p className="text-sm text-gray-500">{count} courses</p>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge className="mb-4">Why Choose Us</Badge>
                        <h2 className="text-4xl mb-4">Everything You Need to Succeed</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            We provide comprehensive learning tools and support to help you achieve your goals
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            const colorMap: any = {
                                blue: 'bg-blue-100 text-blue-600',
                                purple: 'bg-purple-100 text-purple-600',
                                yellow: 'bg-yellow-100 text-yellow-600',
                                green: 'bg-green-100 text-green-600',
                            };
                            return (
                                <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                                    <CardContent className="p-6">
                                        <div className={`w-12 h-12 rounded-lg ${colorMap[feature.color]} flex items-center justify-center mb-4`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl mb-2">{feature.title}</h3>
                                        <p className="text-gray-600">{feature.description}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Featured Courses */}
            <section id="courses" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-12">
                        <div>
                            <Badge className="mb-4">Popular Courses</Badge>
                            <h2 className="text-4xl">Trending Courses</h2>
                        </div>
                        <Link to="/courses">
                            <Button variant="outline">
                                View All Courses
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trendingCourses.map(course => (
                            <Card
                                key={course.id}
                                className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 active:scale-98"
                                onClick={() => handleCourseClick(course.id)}
                            >
                                <div className="relative">
                                    <img
                                        src={getMediaUrl(course.thumbnail)}
                                        alt={course.title}
                                        className="w-full h-48 object-cover"
                                    />
                                    {Number(course.price) === 0 && (
                                        <Badge className="absolute top-4 right-4 bg-green-600">Free</Badge>
                                    )}
                                </div>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <Badge variant="secondary">
                                            {categories.find(c => c.id === course.category_id)?.name || "Uncategorized"}
                                        </Badge>
                                        <div className="flex items-center space-x-1 text-sm">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span className="font-medium">{course.rating || 0}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl mb-2 line-clamp-2">{course.title}</h3>
                                    <p className="text-sm text-gray-600 mb-4">By {course.instructor || course.admin || "Platform Instructor"}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <Users className="w-4 h-4 mr-1" />
                                            {course.enrolled_students_count || 0} {course.enrolled_students_count == 1 ? "student" : "students"}
                                        </div>
                                        {Number(course.price) === 0 ? (
                                            <span className="text-xl font-bold text-green-600">Free</span>
                                        ) : (
                                            <span className="text-xl font-bold">
                                                Frw {Number(course.price).toLocaleString('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {trendingCourses.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No trending courses available at the moment.
                        </div>
                    )}
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 bg-gradient-to-br from-[#33A7DF] to-[#2D51A1] text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl mb-4">How It Works</h2>
                        <p className="text-xl opacity-90 max-w-2xl mx-auto">
                            Start your learning journey in just three simple steps
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                step: '01',
                                icon: Target,
                                title: 'Choose Your Course',
                                description: 'Browse our extensive catalog and find the perfect course for your goals',
                            },
                            {
                                step: '02',
                                icon: PlayCircle,
                                title: 'Learn & Practice',
                                description: 'Watch video lessons, complete exercises, and build real projects',
                            },
                            {
                                step: '03',
                                icon: Award,
                                title: 'Earn Certificate',
                                description: 'Complete the course and receive a certificate to showcase your skills',
                            },
                        ].map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <div key={index} className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                                        <Icon className="w-8 h-8" />
                                    </div>
                                    <div className="text-5xl font-bold opacity-20 mb-4">{item.step}</div>
                                    <h3 className="text-2xl mb-3">{item.title}</h3>
                                    <p className="text-lg opacity-90">{item.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section id="testimonials" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <Badge className="mb-4">Testimonials</Badge>
                        <h2 className="text-4xl mb-4">What Our Students Say</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Join thousands of satisfied learners who transformed their careers
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <Card key={index} className="border-none shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center space-x-1 mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-gray-700 mb-6">{testimonial.comment}</p>
                                    <div className="flex items-center space-x-3">
                                        <img
                                            src={testimonial.avatar}
                                            alt={testimonial.name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <div>
                                            <div className="font-medium">{testimonial.name}</div>
                                            <div className="text-sm text-gray-600">{testimonial.role}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-gradient-to-br from-[#33A7DF] to-[#2D51A1] rounded-3xl p-12 text-white">
                        <h2 className="text-4xl mb-4">Ready to Start Learning?</h2>
                        <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                            Join over 100,000 students already learning on LearnHub. Start your journey today!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup">
                                <Button size="lg" variant="secondary" className="text-lg px-8">
                                    Get Started Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link to="/pricing">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-8 border-2 border-white/85 bg-white/10 text-white rounded-full transition-all duration-300 hover:bg-white hover:text-blue-600 hover:border-white hover:scale-105 hover:shadow-lg active:scale-95"
                                >
                                    View Pricing
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                {/* <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-white">LearnHub</span> */}
                                <div className="flex items-center space-x-2">
                                    <img src={Logo} alt="Logo" className="w-auto h-12" />
                                    <span className="text-2xl font-bold bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] bg-clip-text text-transparent">
                                        LearnHub
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm">
                                Empowering learners worldwide with quality education and expert-led courses.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-medium mb-4">Platform</h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <Link to="/courses" className="hover:text-white transition-colors">
                                        Browse Courses
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/pricing" className="hover:text-white transition-colors">
                                        Pricing
                                    </Link>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Become Instructor
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Enterprise
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-medium mb-4">Resources</h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Help Center
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Community
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Contact Us
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-medium mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Terms of Service
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Privacy Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Cookie Policy
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Accessibility
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
                        <p className="text-sm">© 2026 LearnHub. All rights reserved.</p>
                        <div className="flex items-center space-x-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-white transition-colors">
                                <Globe className="w-5 h-5" />
                            </a>
                            <a href="#" className="hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                </svg>
                            </a>
                            <a href="#" className="hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.5 8.67a4.94 4.94 0 01-1.414.388 2.465 2.465 0 001.083-1.362c-.479.283-1.009.487-1.571.597a2.467 2.467 0 00-4.204 2.25A7.003 7.003 0 011.64 7.747a2.466 2.466 0 00.764 3.293 2.456 2.456 0 01-1.118-.308v.031a2.467 2.467 0 001.98 2.418c-.366.1-.753.114-1.124.041a2.467 2.467 0 002.307 1.713A4.942 4.942 0 011 16.397a6.994 6.994 0 003.788 1.108c4.545 0 7.03-3.768 7.03-7.032 0-.107 0-.213-.007-.32A5.018 5.018 0 0012 8.67z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};