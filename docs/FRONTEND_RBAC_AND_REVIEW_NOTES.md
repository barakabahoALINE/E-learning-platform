# Frontend RBAC and Review Implementation Notes

This file records the frontend work completed from `RBAC_ARCHITECTURE.md` and the project review feedback. Backend changes were intentionally not made.

## Completed Frontend Work

### 1. Final Assessment Attempts and Duration

Implemented in:

```text
frontend/src/app/pages/course-builder/AssessmentModal.tsx
frontend/src/app/pages/CourseBuilder.tsx
```

What changed:

- Final assessment creation now exposes:
  - Maximum attempts
  - Duration in minutes
- These values are sent through the existing `createAssessment` payload.
- Existing final assessment settings are displayed in the builder.

Backend note:

- Creating assessments appears to support `max_attempts` and `duration`.
- Updating those settings after an assessment already exists still needs a backend update endpoint if not already available.

### 2. Rich Text and URL Support

Implemented in:

```text
frontend/src/app/pages/course-builder/RichTextEditor.tsx
frontend/src/app/pages/course-builder/LessonModal.tsx
frontend/src/app/pages/CourseBuilder.tsx
frontend/src/app/components/course/ContentBlockRenderer.tsx
frontend/src/app/pages/course-builder/CourseBuilderComponents.tsx
frontend/src/features/courses/types.ts
```

What changed:

- Improved the current editor toolbar with:
  - Bold
  - Italic
  - Underline
  - Bullet list
  - Numbered list
  - Heading
  - Quote
  - Hyperlink insertion
- Added `link` as a content block type.
- Link blocks render in:
  - Course builder content preview
  - Course preview modal
  - Learner lesson content renderer

Backend note:

- Link blocks are stored inside the existing JSON content block payload.
- Replacing this editor with CKEditor later requires installing a frontend package and confirming backend HTML sanitization rules.

### 3. Course-Level Learner Enrollment

Implemented in:

```text
frontend/src/app/components/courses/ManageCourseLearnersModal.tsx
frontend/src/app/pages/Courses.tsx
```

What changed:

- Added a course-level learner management button to course cards.
- Added a modal with scalable learner source tabs:
  - Internal learners
  - Employees
  - Imported learners
  - External users
- Internal learners use current APIs:
  - `auth/users/`
  - `enrollments/`
  - `enrollments/create/`

Backend note:

- Employee, imported, and external learner sources need backend integration/import APIs.
- Bulk enrollment works by sending one enrollment request per selected learner.

### 4. User Management and Category Management

Implemented in:

```text
frontend/src/app/pages/UserManagement.tsx
frontend/src/app/pages/CategoryManagement.tsx
frontend/src/app/components/layout/Sidebar.tsx
frontend/src/app/App.tsx
```

What changed:

- Added Admin Sidebar entries:
  - User Management
  - Categories
  - Quiz Bank
- User Management supports:
  - View users
  - Create users
  - Edit users
  - Activate/deactivate users
  - Assign current role string where backend supports it
  - View a frontend-ready permission matrix
- Category Management supports:
  - View categories
  - Create categories
  - Display recommended category governance

Backend note:

- Real RBAC role/group/permission management needs backend endpoints for:
  - Listing roles/groups
  - Assigning groups to users
  - Listing permissions
  - Updating role permissions
- User creation currently uses signup, so direct role assignment during creation needs backend support.
- Category editing/deleting needs backend endpoints if required.

Recommended category governance:

```text
Institution administrators manage global categories.
Instructors can manage categories only when explicitly granted category permissions.
```

### 5. Subsection Support

Implemented as frontend planning notice in:

```text
frontend/src/app/pages/CourseBuilder.tsx
```

What changed:

- Added a visible builder notice explaining that subsection support is planned.

Backend note:

- Current structure is:

```text
Course > Module > Section > Content
```

- The requested hierarchy needs backend model/API changes before frontend creation is safe:

```text
Course > Module > Section > Subsection > Content
```

Expected backend impact:

- New subsection model or recursive section model.
- API changes for creating, listing, updating, deleting subsections.
- Course detail serializer must return nested hierarchy.
- Progress tracking may need to include subsection completion.
- Existing content migration may be needed if content moves below subsections.

Recommendation:

- Postpone full subsection implementation until backend is intentionally designed for it.

### 6. Independent Quiz Resources

Implemented as frontend shell in:

```text
frontend/src/app/pages/QuizBank.tsx
frontend/src/app/App.tsx
frontend/src/app/components/layout/Sidebar.tsx
```

What changed:

- Added a Quiz Bank admin page.
- Shows the target workflow:
  1. Create standalone quiz
  2. Add reusable questions
  3. Save quiz to quiz bank
  4. Attach quiz to one or more modules

Backend note:

- Current API creates assessments directly against a course or module.
- Independent quiz resources need backend support:
  - Quiz bank CRUD endpoints
  - Question bank or reusable question relationships
  - Attach/detach quiz to module endpoints
  - Rules for quiz reuse across courses

### 7. Open-Ended Questions

Implemented in:

```text
frontend/src/app/pages/course-builder/AssessmentModal.tsx
frontend/src/app/pages/CourseBuilder.tsx
```

What changed:

- Question creation now supports selecting:
  - Multiple Choice / True-False
  - Multiple Select
  - Open-Ended / Short Answer
- Multiple Select supports more than one correct answer.
- Open-ended questions show a manual-grading notice.

Backend note:

- The frontend sends `question_type: "text"` and empty `choices`.
- Backend must support:
  - Saving open-ended questions
  - Free-text learner answers
  - Manual grading
  - Attempt result recalculation after grading

## Frontend RBAC Work

Implemented in:

```text
frontend/src/features/auth/types.ts
frontend/src/features/auth/permissions.ts
frontend/src/app/components/auth/Can.tsx
frontend/src/app/components/auth/PermissionRoute.tsx
frontend/src/app/App.tsx
frontend/src/app/components/layout/Sidebar.tsx
```

What changed:

- User type now supports:
  - `groups`
  - `permissions`
  - `is_superuser`
- Added permission helper functions:
  - `hasPermission`
  - `hasAnyPermission`
- Added permission-aware route wrapper.
- Sidebar now hides permission-gated admin links.
- Backward compatibility remains: current `admin` role still receives frontend fallback permissions until backend returns real permissions.

Backend note:

- Login/profile responses should eventually return `groups`, `permissions`, and `is_superuser`.
- Backend must remain the source of truth. Frontend permission checks are only for routing and UI display.
