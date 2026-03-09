Project: Improve and fix functionality and UI behavior of an existing Admin Dashboard for an E-Learning Platform.
Apply the following changes while keeping all other existing features unchanged. Ensure the design and interactions follow modern SaaS dashboard UX standards and look professional.

1. Admin Profile (Top Right Corner)

When clicking the Admin Profile avatar in the top-right corner:

The dropdown menu must contain:

Profile Settings

Account Settings

Logout

Both Profile Settings and Account Settings must navigate to their respective pages and work properly.


2. Learners Page Improvements
Actions Menu

On the Learners page, the Actions dropdown must work correctly with the following options:

View Details

Opens a detailed learner profile page.

Displays learner information such as name, email, enrollment status, courses taken, and account status.

Edit

Opens an editable form with the learner’s existing information.

Allows updating learner details.

Delete Learner Modal

When deleting a learner:

Replace the black background overlay with a clean modal dialog over the page background.

Use a professional confirmation modal with:

Warning message

Cancel button

Confirm Delete button

Suspension Synchronization

When a learner is suspended in the Learners page:

The learner must automatically appear in the Security Page → Suspended Accounts card.

When the learner is re-activated in the Security page:

The learner must automatically return to Active status in the Learners page.

Ensure real-time synchronization between the Learners page and Security page.

3. Courses Page Improvements
Course Creation

When creating a course:

Remove the Course Type field (Video / Text).

Content type will instead be selected during lesson creation inside the course builder.

Course Builder

Inside the Course Builder, allow the admin to add:

Lessons

Video lessons

Text lessons

Image lessons

Quizzes

Final assessment

Each lesson should allow selecting the content type at the lesson level.

Preview Function

The Preview button must display the entire course structure, including:

All lessons

All quizzes

Final assessment

Course flow exactly as learners will see it

This preview must work before publishing the course.

Publish Function

The Publish button must successfully publish the course.

After publishing:

The course must appear as Published in the Courses list.

The admin must still be able to edit the course content when necessary.

Partial Save (Draft Feature)

While building a course:

Allow the admin to save progress partially.

If the course is not completed:

It should be saved as a Draft.

Draft courses must appear in the Courses page with Draft status.

When reopening a draft:

The admin must continue from the last saved point, not start from scratch.

Editing Existing Courses

When editing a course (Draft or Published):

The admin must see all existing course content already filled in.

The admin can:

Edit lessons

Edit quizzes

Modify assessments

After saving changes, the updated course should retain its structure and update accordingly.

Do not require rebuilding the course from scratch.

4. Analytics Page

Fix issues in the Analytics Dashboard:

Some bar charts in the Course Performance card are not displaying.

Ensure all charts render correctly.

Use clear visual data representation such as:

Bar charts

Line charts

Completion metrics

Enrollment statistics

Charts must display accurate data and consistent layout.

5. Settings Page

When updating the Admin Avatar:

If the admin uploads a new profile image:

The avatar must update immediately across the dashboard.

If no avatar image is uploaded:

Display the initials of the admin’s name as the profile avatar.

Example:
Louis Prince → LP

Ensure the avatar updates in the top navigation bar and profile page.
Final Instruction

Keep all other features of the dashboard unchanged.
Implement the above improvements with a clean, professional SaaS dashboard design, maintaining consistent spacing, modern UI components, and intuitive user interactions.