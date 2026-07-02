# RBAC Role Definitions & Differences

## Overview

The E-Learning Platform uses a Role-Based Access Control (RBAC) system with 4 core system roles. Each role has distinct capabilities and access levels designed for different user types.

## System Roles

### 1. Super Admin (Super User)
**Purpose**: Full platform administration and control across all institutions.

**Key Characteristics**:
- Access to entire platform across all institutions
- Cannot be modified or deleted
- Highest level of privilege

**Capabilities**:
| Feature | Ability |
|---------|---------|
| User Management | View and manage all users across all institutions |
| Course Management | Create, edit, delete courses across all institutions |
| Institution Management | View and manage all institutions |
| Role Management | Create, edit, delete all roles (except system roles) |
| Permission Management | View and modify all permissions |
| Analytics | View platform-wide analytics |
| Audit Logs | View all audit logs |
| Settings | Access all platform settings |

**UI/Dashboard Access**:
- Full Admin Dashboard at `/admin`
- Unlimited access to all admin features
- No institution filtering applied

**Limitations**: None

---

### 2. Admin
**Purpose**: Institutional administration and management within a single institution.

**Key Characteristics**:
- Institution-scoped access (can only see/manage their own institution's data)
- Can manage courses, instructors, and students within their institution
- Cannot see or manage users/courses from other institutions

**Capabilities**:
| Feature | Ability |
|---------|---------|
| User Management | View and manage users in their institution only |
| Course Management | Create, edit, delete courses in their institution |
| Instructor Management | Assign and manage instructors for their courses |
| Analytics | View analytics for their institution only |
| Role Management | View roles (cannot create/modify system roles) |
| Student Management | View and manage learners in their institution |
| Settings | Access institution-scoped settings only |

**Differences from Super Admin**:
- ❌ Cannot view users/courses from other institutions
- ❌ Cannot modify system roles
- ❌ Cannot access other institutions' analytics
- ✅ Can fully manage their own institution

**UI/Dashboard Access**:
- Admin Dashboard at `/admin` (filtered for their institution)
- Courses list shows only their institution's courses
- Learners list shows only their institution's students
- Role management limited to viewing only

**Limitations**:
- Institution-scoped: All data filtered by their assigned institution
- Cannot create new institutions

---

### 3. Instructor
**Purpose**: Course and assessment management for assigned courses.

**Key Characteristics**:
- Can manage courses they own or are assigned to
- Can manage assessments for their courses
- Can view enrolled students in their courses
- Cannot access administrative functions

**Capabilities**:
| Feature | Ability |
|---------|---------|
| Course Management | Create and edit own courses |
| Assessment Management | Create, edit, delete assessments for own courses |
| Student Enrollment | View students enrolled in own courses |
| Grading | View and grade student submissions |
| Analytics | View analytics for own courses |
| Progress Tracking | Monitor student progress in own courses |
| Feedback | Provide feedback on student work |

**Differences from Admin**:
- ❌ Cannot see users outside their courses
- ❌ Cannot manage institution-wide settings
- ❌ Cannot create new courses for others
- ✅ Full control over own course content

**UI/Dashboard Access**:
- Instructor Dashboard (future implementation)
- Only see their own courses and assessments
- Learner page shows only students in their courses
- Cannot access admin settings or user management

**Limitations**:
- Scope limited to assigned courses
- Cannot create admin users
- Cannot modify platform settings

---

### 4. Student (Learner)
**Purpose**: Course enrollment and learning.

**Key Characteristics**:
- Can view courses available to them
- Can enroll in courses
- Can submit assignments and take assessments
- No access to administrative or instructor functions

**Capabilities**:
| Feature | Ability |
|---------|---------|
| Course Browsing | View available courses |
| Course Enrollment | Enroll in courses |
| Learning | Access course materials and lessons |
| Assessments | Take quizzes and final assessments |
| Assignments | Submit assignments |
| Certificates | Download certificates on completion |
| Progress Tracking | View own progress and grades |
| Profile Management | Update own profile |

**Differences from Instructor**:
- ❌ Cannot create or edit courses
- ❌ Cannot create assessments
- ❌ Cannot manage other users
- ✅ Can self-enroll in courses
- ✅ Can take assessments

**UI/Dashboard Access**:
- Student Dashboard at `/dashboard`
- Only see courses they're enrolled in or available for enrollment
- Cannot see Admin panel
- Learner page inaccessible
- Limited to course-related features only

**Limitations**:
- No administrative access
- Cannot view other students' progress
- Cannot create content

---

## Permission Hierarchy

```
Super Admin (all permissions)
    ↓
Admin (institution-scoped permissions)
    ↓
Instructor (course-scoped permissions)
    ↓
Student (learning-focused permissions)
```

## Key Differences Summary

| Feature | Super Admin | Admin | Instructor | Student |
|---------|------------|-------|-----------|---------|
| **Scope** | Global | Institution | Course | Self |
| **View All Users** | ✅ | ❌ (institution only) | ❌ (course students only) | ❌ |
| **Manage Courses** | ✅ | ✅ | ✅ (own only) | ❌ |
| **Manage Assessments** | ✅ | ✅ | ✅ (own only) | ❌ |
| **Manage Roles** | ✅ | ❌ | ❌ | ❌ |
| **View Analytics** | ✅ (all) | ✅ (institution) | ✅ (courses) | ❌ |
| **Manage Platform Settings** | ✅ | ❌ | ❌ | ❌ |
| **Create Users** | ✅ | ✅ (institution) | ❌ | ❌ |
| **Enroll Students** | ✅ | ✅ | ❌ | ✅ (self) |
| **View Audit Logs** | ✅ | ❌ | ❌ | ❌ |

## Custom Roles

In addition to the 4 system roles, administrators can create custom roles with specific permission combinations:

**System vs Custom Roles**:
- **System Roles**: Cannot be modified, deleted, or renamed (fixed by platform)
- **Custom Roles**: Fully configurable with specific permission sets (e.g., "Course Manager", "Department Head")

**Creating Custom Roles**:
1. Go to Admin → RBAC → Roles
2. Click "Create New Role"
3. Enter role name and description
4. Select required permissions from available modules
5. Click "Create Role"

## Workflow: Role Assignment

### Adding a New User

1. **Super Admin/Admin** initiates user creation via "Add User" button
2. System creates inactive user and sends invite email
3. User clicks link in email to set password
4. User is activated and assigned to their role group
5. User gains all permissions assigned to that role

### Changing a User's Role

1. Go to Admin → RBAC → Users
2. Click on the user to view details
3. Click "Edit" and select new role
4. System updates user's group membership
5. User immediately gains new role's permissions

## Permission Modules

Permissions are organized by module:
- **users_app**: User and profile management
- **courses_app**: Course creation and management
- **assessments_app**: Assessment and quiz management
- **enrollments_app**: Enrollment management
- **progress_app**: Progress tracking

Each role has specific permissions from these modules based on their scope.

## Institution Scoping

### For Admins

**Rule**: Non-superuser admins can only see and manage data from their assigned institution.

**What gets filtered**:
- Users list shows only users from the admin's institution
- Courses list shows only courses from the admin's institution
- Instructor assignments limited to institution
- All analytics scoped to institution

**What stays global**:
- System role definitions (same across all institutions)
- General platform settings
- Role permission structures

### For Instructors & Students

- Instructors see only courses and students they're assigned to
- Students see only courses they're enrolled in

## Security Implications

1. **Data Isolation**: Each institution's data is completely isolated from others
2. **Permission Inheritance**: Users inherit all permissions assigned to their role
3. **Audit Trail**: All role and permission changes are logged
4. **System Roles Protected**: Core roles cannot be accidentally modified
5. **Permission Verification**: Backend validates all role permissions on each request

## Troubleshooting Role Issues

### "Permission Denied" Error

**Cause**: User doesn't have required permission for action
**Solution**: Check user's role and verify required permissions are assigned

### Admin Can't See Other Institution's Users

**Cause**: Institution scoping is working correctly
**Solution**: Contact Super Admin if you need to see users from other institutions

### Can't Edit System Role

**Cause**: System roles are protected from modification
**Solution**: Create a custom role with desired permissions instead

### User Not Getting Expected Permissions

**Cause**: User's group membership might not be synced
**Solution**: 
1. Check user is assigned to correct role group
2. Contact admin to reassign role
3. User may need to log out and back in to refresh permissions
