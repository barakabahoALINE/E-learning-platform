E-Learning Platform is a modern online learning system built with Django REST Framework backend and React/Vite frontend.
It provides role-based access for students, instructors, and administrators to manage learning content and progress.
The platform supports course publication workflows, nested course structure, assessment handling, and KPI analytics.
Students can enroll in courses, follow modules and sections, track completion, and resume learning sessions.
Instructors can create draft content, publish updates, and manage learning materials without affecting live courses.
This README is the project's living document, updated as development advances and new features are added.

---

## 1. Introduction
This project is an **E-Learning Platform** built as a full-stack application with:
- **Django** + **Django REST Framework** backend
- **React** frontend with **Vite**
- **MySQL** database
- **JWT authentication** and role-based users

The platform supports course creation and publishing, nested modules, sections, and content, student enrollments, progress tracking, learning sessions, assessment workflows, and KPI reporting.

---

## 2. Objectives
The main objectives are:

1. Provide a modern online learning system for students and instructors.
2. Support course content organization into courses, modules, sections, and content items (video, text, file, shell).
3. Enable student enrollment and completion tracking.
4. Support instructor/admin content publishing workflows with draft/unpublished changes.
5. Track learning sessions and calculate learning hours.
6. Offer assessment management and result tracking.
7. Provide clear APIs for a responsive frontend UI.

---

## 3. Problem Statement
The platform solves these problems:

- Traditional learning systems often lack fine-grained progress tracking across course structure.
- Instructors need a way to create, edit, and publish content without immediately affecting live courses.
- Students need smooth enrollment and completion tracking.
- Admins need visibility into course completion, student progress, and KPI metrics.
- Existing solutions may not combine learning sessions, content progress, and assessments in a single workflow.

---

## 4. Key Features
- **User roles**: Student, Instructor, Admin
- **Course management**: create / update / delete / publish / unpublish with draft and published versions
- **Content hierarchy**: Courses → Modules → Sections → Content
- **Content types**: Video, Text, File, Shell
- **Enrollment**: student enrolls in published course with status tracking
- **Progress tracking**: Content, Section, Module, and Course completion
- **Learning sessions**: start / continue / end sessions with duration tracking
- **Assessments**: create assessments and questions, student attempt lifecycle, submit and review answers
- **KPI reporting**: learning hours, course statistics, completion rate

---

## 5. System Design

### 5.1 Architecture
- Backend Django apps:
  - `users_app`: authentication, custom user model, roles.
  - `courses_app`: course, module, section, content CRUD and publish logic.
  - `enrollments_app`: student enrollment management.
  - `progress_app`: progress models, learning sessions, KPI endpoints.
  - `assessments_app`: assessment lifecycle and grading.
- Frontend: React + Vite, Redux Toolkit, Axios, Tailwind CSS, MUI/Radix UI.

### 5.2 Data Models
- `User`: email, full_name, institution, role, level
- `Course`: title, description, duration, level, category, price, thumbnail, draft fields and publish control
- `Module`: belongs to Course, order, published status
- `Section`: belongs to Module, order, published status
- `Content`: belongs to Section, type, video/text/file content, preview flag
- `Enrollment`: student + course, status
- `ContentProgress`, `SectionProgress`, `ModuleProgress`: track completion state per student
- `LearningSession`: start/end, duration, active state
- `Assessment`, `Question`, `Choice`, `Attempt`, `StudentAnswer`: assessment handling

### 5.3 API Design
- `api/auth/` → user signup/login/verification
- `api/` → courses, modules, sections, contents
- `api/` → enrollments
- `api/progress/` → learning sessions and progress
- `api/assessments/` → assessment lifecycle

---

## 6. Key Important Points
- **Role-based access** is central: students, instructors, admins.
- **Draft vs published content** lets instructors stage changes.
- **Progress cascade logic** updates section/module progress automatically when content is completed.
- **Learning session tracking** provides real-time course engagement data.
- **KPI endpoints** enable analytics and performance metrics.

---

## 7. Key Challenges
- Maintaining consistency between draft and published course data.
- Cascading progress updates correctly from content → section → module.
- Managing enrollment constraints for unpublished courses.
- Designing REST endpoints for deep nested structures like: `/courses/<course_id>/modules/<module_id>/sections/<section_id>/contents/`
- Handling multiple content types and file/video upload metadata.
- Supporting a clean UI state across the frontend for published/draft content.

---

## 8. Functional Requirements

### 8.1 Admin Capabilities
- Manage users (create, edit, delete, assign roles)
- Approve and publish courses
- View KPIs and analytics
- Manage course categories and difficulty levels
- Manage system settings and configurations

### 8.2 Instructor Capabilities
- Create new courses with metadata (title, description, duration, level, category)
- Organize courses into modules, sections, and content
- Upload multimedia content (video, text, files)
- Create draft changes and publish updates
- Create assessments and questions with multiple question types
- View student progress and completion statistics
- Access student attempt reviews and feedback

### 8.3 Student Capabilities
- Register and login with email verification
- Enroll in published courses
- Continue learning from last position
- Complete course content (video, text, files)
- Take quizzes and submit assessments
- Track personal progress and completion status
- Review assessment results and feedback
- Resume learning sessions

---

## 9. Non-Functional Requirements

### 9.1 Security
- JWT authentication for all API endpoints
- Role-based access control (RBAC) for protected resources
- Password hashing and validation
- Email verification for user accounts
- CORS protection for cross-origin requests

### 9.2 Scalability
- Modular architecture supporting horizontal scaling
- Efficient database queries with indexing
- Caching mechanisms for frequently accessed data
- Support for multiple concurrent users
- Stateless API design for load balancing

### 9.3 Responsiveness
- Responsive frontend design for desktop, tablet, and mobile devices
- Fast page load times and smooth interactions
- Progressive content loading

### 9.4 High Availability
- Database backup and recovery mechanisms
- Error handling and graceful degradation
- Session persistence across user reconnections
- Monitoring and logging for system health

### 9.5 Maintainability
- Modular codebase with clear separation of concerns
- Well-documented code and APIs
- Comprehensive test coverage
- Version control and deployment automation
- Configuration management for different environments

### 9.6 Performance
- API response time under 500ms for standard requests
- Batch processing for KPI calculations
- Efficient progress cascade logic
- Optimized database queries with pagination
- Static file caching and compression

---

## 10. Technology Stack Summary
- Backend: Django, Django REST Framework, Simple JWT, django-filters, CORS
- Database: MySQL
- Frontend: React, Vite, Redux Toolkit, Axios, Tailwind, MUI/Radix UI
- Deployment: Django static/media handling, Vite frontend build

---

## 11. Current Status
- Backend core apps are defined for users, courses, enrollments, progress, and assessments.
- Course and content publishing workflows are implemented with draft support.
- Progress tracking is available across content, sections, and modules.
- Learning session and KPI APIs are available for analytics.
- Frontend is built with React, Vite, Redux Toolkit, and modern UI component libraries.
