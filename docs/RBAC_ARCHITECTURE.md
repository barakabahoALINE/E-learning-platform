# RBAC Architecture Plan for the E-Learning Platform

## 1. Background

The project was originally designed around two main user types: students and admins. After review, the current design was identified as too rigid because access control depends heavily on hardcoded role checks such as:

```python
request.user.role == "admin"
```

This approach makes the system difficult to extend. If a new role or permission is introduced later, many backend and frontend files would need to be changed manually.

The recommended improvement is to adopt a scalable Role-Based Access Control (RBAC) system where:

- Users are assigned roles.
- Roles contain permissions.
- Permissions control access to backend APIs and frontend features.
- Permissions can be enabled, disabled, or reassigned without rewriting major application logic.

The current Django + React stack can support this approach well. Switching to Laravel is not necessary at this stage because Django already includes strong user, group, and permission features.

## 2. Recommendation

Continue with:

```text
Backend: Django + Django REST Framework
Frontend: React
Authentication: JWT with SimpleJWT
Authorization: Django Groups + Permissions + DRF permission classes
```

Django already provides:

- Custom user model support
- Superuser support
- Groups
- Permissions
- Admin panel
- `user.has_perm(...)`
- Integration with Django REST Framework permissions

Laravel also supports RBAC well, especially through packages such as Spatie Permission, but rewriting the project now would likely cause unnecessary delay. The better decision is to improve the existing Django architecture.

## 3. Current Problem Areas

The current user model stores a fixed `role` string:

```python
role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
```

Current permission files use hardcoded role checks:

```python
request.user.role == "admin"
```

Examples of files that should be refactored:

```text
backend/E_learning_platform/users_app/models.py
backend/E_learning_platform/users_app/permissions.py
backend/E_learning_platform/courses_app/permissions.py
backend/E_learning_platform/enrollments_app/permissions.py
backend/E_learning_platform/assessments_app/permissions.py
backend/E_learning_platform/progress_app/permissions.py
backend/E_learning_platform/courses_app/views.py
backend/E_learning_platform/courses_app/serializers.py
frontend/src/app/App.tsx
frontend/src/app/components/layout/Sidebar.tsx
frontend/src/features/auth/types.ts
```

## 4. Target Backend Architecture

Use Django's built-in `Group` model to represent roles.

Example roles:

```text
Super User
Admin
Instructor
Learner
Student
Viewer
```

Use Django's built-in `Permission` model to represent actions.

Example permissions:

```text
users.view_user
users.change_user
users.delete_user
users.assign_role

roles.view_role
roles.change_role
roles.assign_permission

courses.view_course
courses.add_course
courses.change_course
courses.delete_course
courses.publish_course

enrollments.view_enrollment
enrollments.add_enrollment
enrollments.change_enrollment
enrollments.delete_enrollment

assessments.view_assessment
assessments.add_assessment
assessments.change_assessment
assessments.delete_assessment
assessments.grade_assessment
assessments.unlock_attempt

progress.view_progress
progress.change_progress

analytics.view_analytics
settings.change_platform_settings
```

## 5. Suggested Backend File Structure

Introduce or modify the following files:

```text
backend/E_learning_platform/users_app/
  models.py
  permissions.py
  serializers.py
  views.py
  urls.py
  services/
    __init__.py
    rbac.py
  management/
    __init__.py
    commands/
      __init__.py
      seed_roles.py
```

### Purpose of Each File

```text
models.py
```

Keep the custom `User` model. Over time, stop using the `role` field as the source of authorization. Role assignment should come from Django groups.

```text
permissions.py
```

Store reusable DRF permission classes such as `HasPermission`, `CanManageUsers`, `CanManageCourses`, and `CanViewAnalytics`.

```text
serializers.py
```

Return user groups and permissions in login/profile responses. Add serializers for role and permission management.

```text
views.py
```

Add APIs for:

- Listing users
- Updating users
- Assigning roles
- Listing roles
- Listing permissions
- Updating role permissions

```text
services/rbac.py
```

Store business logic for assigning roles, checking role restrictions, and preventing unsafe privilege escalation.

```text
management/commands/seed_roles.py
```

Create initial groups and assign default permissions.

## 6. Backend Permission Pattern

Instead of writing this:

```python
request.user.role == "admin"
```

Use this:

```python
request.user.has_perm("courses.add_course")
```

Reusable DRF permission example:

```python
from rest_framework.permissions import BasePermission


class HasPermission(BasePermission):
    required_permission = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        if not self.required_permission:
            return False

        return request.user.has_perm(self.required_permission)
```

Specific permission example:

```python
class CanAddCourse(HasPermission):
    required_permission = "courses_app.add_course"
```

View usage:

```python
class CourseCreateAPIView(APIView):
    permission_classes = [CanAddCourse]
```

## 7. User API Response

The backend should return permissions to the frontend after login and profile fetch.

Example response:

```json
{
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "full_name": "Admin User",
    "institution": "LearnHub",
    "groups": ["Admin"],
    "permissions": [
      "courses_app.view_course",
      "courses_app.add_course",
      "courses_app.change_course",
      "users_app.view_user"
    ],
    "is_superuser": false
  },
  "access": "jwt-access-token",
  "refresh": "jwt-refresh-token"
}
```

Frontend authorization should rely on the `permissions` array, not on hardcoded role checks.

## 8. Role Definitions

### Super User

Full access to the entire system.

Allowed actions:

- Manage all users
- Create admins
- Delete users
- Assign any role
- Create, edit, and delete roles
- Assign or remove permissions
- Manage all courses
- Manage enrollments
- Manage assessments
- View and modify progress
- View analytics
- Access Django admin
- Change platform settings

Restrictions:

- None, except normal security rules such as password requirements and audit logging.

### Admin

Platform manager with broad access, but cannot manage the highest privilege areas.

Allowed actions:

- View users
- Create learners/students
- Edit learner/student accounts
- Deactivate learner/student accounts
- Manage courses
- Manage course content
- Publish courses
- Manage enrollments
- Manage assessments
- Unlock assessment attempts
- View learner progress
- Mark course completion when needed
- View analytics

Restrictions:

- Cannot create other admins
- Cannot create super users
- Cannot modify roles
- Cannot modify permissions
- Cannot assign Admin or Super User roles
- Cannot access sensitive platform settings unless explicitly allowed

### Instructor

Responsible for course delivery and assessment management.

Allowed actions:

- View assigned courses
- Create course content if permitted
- Edit own or assigned courses
- Add modules, lessons, resources, quizzes, and assessments
- View learners enrolled in assigned courses
- Grade or review assessments
- View progress for learners in assigned courses
- View analytics for assigned courses

Restrictions:

- Cannot manage all users
- Cannot assign roles
- Cannot delete users
- Cannot edit roles or permissions
- Cannot access global platform analytics unless granted
- Cannot modify courses they are not assigned to

### Learner

General authenticated learning user.

Allowed actions:

- View published courses
- Enroll in available courses
- Access enrolled course content
- Complete lessons
- Take quizzes
- Submit assessments
- View own progress
- View own certificates
- Update own profile

Restrictions:

- Cannot access admin dashboard
- Cannot create, edit, or delete courses
- Cannot view other learners' progress
- Cannot manage users
- Cannot manage assessments globally

### Student

The Student role should only be separate from Learner if the project has a clear reason.

Recommended distinction:

```text
Learner = a registered user who can browse and enroll
Student = a user formally enrolled in a course or institution program
```

Allowed actions:

- Same as Learner
- Access institution-specific courses if applicable
- View official academic progress if applicable

Restrictions:

- Same as Learner
- Cannot access instructor or admin features

If no strong distinction exists, merge Student and Learner into one role to avoid confusion.

### Viewer

Read-only user.

Allowed actions:

- View public or published courses
- View limited course previews
- View basic dashboard information if authenticated

Restrictions:

- Cannot enroll unless upgraded to Learner or Student
- Cannot submit assessments
- Cannot track course progress
- Cannot create, edit, or delete anything
- Cannot access admin dashboard

## 9. Suggested Permission Matrix

| Permission | Super User | Admin | Instructor | Learner | Student | Viewer |
|---|---:|---:|---:|---:|---:|---:|
| View users | Yes | Yes | No | No | No | No |
| Create users | Yes | Yes | No | No | No | No |
| Edit users | Yes | Yes | No | Own only | Own only | No |
| Delete users | Yes | Limited | No | No | No | No |
| Assign roles | Yes | Limited | No | No | No | No |
| Modify roles | Yes | No | No | No | No | No |
| Modify permissions | Yes | No | No | No | No | No |
| View courses | Yes | Yes | Yes | Yes | Yes | Limited |
| Create courses | Yes | Yes | Yes | No | No | No |
| Edit courses | Yes | Yes | Assigned only | No | No | No |
| Delete courses | Yes | Yes | Assigned only or No | No | No | No |
| Publish courses | Yes | Yes | Optional | No | No | No |
| Enroll in courses | Yes | Optional | Optional | Yes | Yes | No |
| View own progress | Yes | Optional | Optional | Yes | Yes | No |
| View all progress | Yes | Yes | Assigned courses only | No | No | No |
| Take assessments | Optional | Optional | Optional | Yes | Yes | No |
| Grade assessments | Yes | Yes | Assigned courses only | No | No | No |
| Unlock attempts | Yes | Yes | Optional | No | No | No |
| View analytics | Yes | Yes | Assigned courses only | No | No | No |
| Platform settings | Yes | Limited or No | No | No | No | No |

## 10. Frontend Architecture

The frontend should not check only:

```tsx
user?.role === "admin"
```

Instead, use permissions.

Suggested files:

```text
frontend/src/features/auth/types.ts
frontend/src/features/auth/authSelectors.ts
frontend/src/features/auth/permissions.ts
frontend/src/app/components/auth/Can.tsx
frontend/src/app/components/auth/PermissionRoute.tsx
frontend/src/features/admin/rbacAPI.ts
frontend/src/app/pages/RolesPage.tsx
frontend/src/app/pages/PermissionsPage.tsx
```

Update the user type:

```ts
export interface User {
  id?: number;
  email: string;
  full_name: string;
  institution: string;
  groups?: string[];
  permissions?: string[];
  is_superuser?: boolean;
  avatar?: string;
  profile_picture?: string | null;
}
```

Create a permission helper:

```ts
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return user.permissions?.includes(permission) ?? false;
}
```

Create a reusable UI wrapper:

```tsx
type CanProps = {
  permission: string;
  children: React.ReactNode;
};

export function Can({ permission, children }: CanProps) {
  const user = useAppSelector(selectCurrentUser);

  if (!hasPermission(user, permission)) {
    return null;
  }

  return <>{children}</>;
}
```

Create a permission route:

```tsx
type PermissionRouteProps = {
  permission: string;
  children: React.ReactNode;
};

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user, permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
```

Example route:

```tsx
<Route
  path="/admin/courses"
  element={
    <PermissionRoute permission="courses_app.view_course">
      <AdminCoursesPage />
    </PermissionRoute>
  }
/>
```

Example button:

```tsx
<Can permission="courses_app.add_course">
  <Button>Create Course</Button>
</Can>
```

## 11. Admin Controls for RBAC

Add a Security or Access Control section in the admin dashboard.

Suggested pages:

```text
/admin/security/users
/admin/security/roles
/admin/security/permissions
/admin/security/audit-logs
```

### Users Page

Features:

- List users
- Search users
- Filter by role/group
- Filter by active/inactive
- View user details
- Assign role
- Activate/deactivate user
- Reset user role

Important restrictions:

- Admin cannot assign Admin role.
- Admin cannot assign Super User role.
- Admin cannot edit Super User.
- Only Super User can manage Admin users.

### Roles Page

Features:

- List roles
- View permissions under each role
- Create role
- Rename role
- Delete role
- Assign permissions to role

Restriction:

- Only Super User should modify roles.

### Permissions Page

Features:

- List permissions by module
- Display permission matrix
- Enable or disable permissions per role

Example matrix:

```text
Permission                    Admin   Instructor   Learner   Viewer
courses_app.view_course       Yes     Yes          Yes       Yes
courses_app.add_course        Yes     Yes          No        No
users_app.assign_role         No      No           No        No
analytics.view_analytics      Yes     Limited      No        No
```

### Audit Logs Page

Track security-sensitive events:

- User role changed
- Permission changed
- User deactivated
- Admin action performed
- Course deleted
- Assessment unlocked

Suggested audit model:

```python
class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100)
    target_id = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## 12. Implementation Phases

### Phase 1: Prepare RBAC Foundation

- Keep the existing `role` field temporarily for compatibility.
- Add a seed command for groups and permissions.
- Create default groups:
  - Admin
  - Instructor
  - Learner
  - Student
  - Viewer
- Assign default permissions to each group.

### Phase 2: Update Authentication Response

- Return `groups`, `permissions`, and `is_superuser` in login response.
- Update frontend auth types.
- Store permissions in Redux/localStorage with the user object.

### Phase 3: Replace Backend Role Checks

Replace checks like:

```python
request.user.role == "admin"
```

With:

```python
request.user.has_perm("courses_app.change_course")
```

Start with:

```text
users_app/permissions.py
courses_app/permissions.py
enrollments_app/permissions.py
assessments_app/permissions.py
progress_app/permissions.py
```

### Phase 4: Replace Frontend Role Checks

Replace checks like:

```tsx
user?.role === "admin"
```

With:

```tsx
hasPermission(user, "courses_app.view_course")
```

Update:

```text
frontend/src/app/App.tsx
frontend/src/app/components/layout/Sidebar.tsx
```

### Phase 5: Build Admin RBAC UI

Build:

- User role management
- Role list
- Permission matrix
- Audit logs

### Phase 6: Add Tests

Backend tests should prove:

- Super User can do everything.
- Admin cannot create another Admin.
- Admin cannot modify roles.
- Instructor cannot edit unassigned courses.
- Learner cannot access admin APIs.
- Viewer cannot submit assessments.
- Permissions control access even if role names change.

Frontend tests should prove:

- Navigation hides inaccessible links.
- Protected routes redirect unauthorized users.
- Buttons/actions do not render without required permissions.

## 13. Final Decision

The project should continue with Django + React.

Reasons:

- Django already supports RBAC through groups and permissions.
- The current backend can be refactored without a full rewrite.
- React can consume permissions dynamically from the API.
- Switching to Laravel would delay the project.
- A permission-based Django design will satisfy the scalability concerns raised by supervisors.

The main architectural change is to stop treating `role` as the authorization source and instead use permissions as the source of truth.

## 14. Summary

The final system should follow this rule:

```text
Roles are labels.
Permissions are authority.
```

A user's role should describe who they are. A user's permissions should determine what they can do.

This makes the platform cleaner, safer, easier to extend, and more professional.
