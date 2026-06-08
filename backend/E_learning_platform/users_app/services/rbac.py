from django.contrib.auth.models import Group, Permission


ROLE_SUPERADMIN = "SuperAdmin"
ROLE_ADMIN = "Admin"
ROLE_INSTRUCTOR = "Instructor"
ROLE_STUDENT = "Student"
ROLE_VIEWER = "Viewer"

DEFAULT_ROLES = (ROLE_SUPERADMIN, ROLE_ADMIN, ROLE_INSTRUCTOR, ROLE_STUDENT, ROLE_VIEWER)

STUDENT_PERMISSIONS = [
    "courses_app.view_course",
    "courses_app.view_published_course",
    "enrollments_app.add_enrollment",
    "enrollments_app.view_enrollment",
    "assessments_app.view_assessment",
    "assessments_app.add_attempt",
    "assessments_app.view_attempt",
    "assessments_app.change_attempt",
    "assessments_app.lock_attempt",
    "assessments_app.start_assessment",
    "progress_app.view_progress",
    "progress_app.change_progress",
]

VIEWER_PERMISSIONS = [
    "users_app.view_user",
    "courses_app.view_course",
    "courses_app.view_published_course",
    "enrollments_app.view_enrollment",
    "assessments_app.view_assessment",
    "assessments_app.view_attempt",
    "progress_app.view_progress",
    # Allow viewers to see RBAC read-only details
    "auth.view_group",
    "auth.view_permission",
    "users_app.view_analytics",
    "users_app.change_platform_settings",
]

ADMIN_PERMISSIONS = [
    # User management within institution
    "users_app.view_user",
    "users_app.add_user",
    "users_app.change_user",
    "users_app.delete_user",
    # Analytics & settings (view-level)
    "users_app.view_analytics",
    # Course management (institution-scoped)
    "courses_app.view_course",
    "courses_app.add_course",
    "courses_app.change_course",
    "courses_app.delete_course",
    # Enrollment management
    "enrollments_app.view_enrollment",
    "enrollments_app.add_enrollment",
    "enrollments_app.change_enrollment",
    # Assessments and progress (view-level)
    "assessments_app.view_assessment",
    "progress_app.view_progress",
    # Read-only RBAC visibility
    "auth.view_group",
    "auth.view_permission",
    # Allow admins to modify role permissions within institution scope
    "users_app.modify_permission",
]

INSTRUCTOR_PERMISSIONS = [
    # User management
    "users_app.view_user",
    # Roles and permissions (read-only)
    "auth.view_group",
    "auth.view_permission",
    # Course management
    "courses_app.view_course",
    "courses_app.add_course",
    "courses_app.change_course",
    "courses_app.publish_course",
    "courses_app.view_published_course",
    # Enrollment and student management
    "enrollments_app.view_enrollment",
    # Assessment and grading
    "assessments_app.view_assessment",
    "assessments_app.add_assessment",
    "assessments_app.change_assessment",
    "assessments_app.view_attempt",
    "assessments_app.add_attempt",
    "assessments_app.change_attempt",
    "assessments_app.grade_assessment",
    "assessments_app.start_assessment",
    # Progress tracking
    "progress_app.view_progress",
    "progress_app.change_progress",
]

def _get_permissions(permission_names):
    permissions = []

    for permission_name in permission_names:
        if "." not in permission_name:
            continue

        app_label, codename = permission_name.split(".", 1)
        queryset = Permission.objects.filter(
            content_type__app_label=app_label,
            codename=codename,
        )
        if not queryset.exists():
            continue
        permission = Permission.objects.filter(
            content_type__app_label=app_label,
            codename=codename,
        ).order_by("id").first()

        if permission:
            permissions.append(permission)

        permissions.extend(list(queryset))

    return permissions


def _assign_default_permissions(group):
    if group.name == ROLE_SUPERADMIN:
        # SuperAdmin group is seeded with all permissions available in the system.
        all_perms = list(Permission.objects.all())
        group.permissions.set(all_perms)
        return

    if group.name == ROLE_ADMIN:
        # Admins receive a curated set of permissions (institution-scoped).
        group.permissions.set(_get_permissions(ADMIN_PERMISSIONS))
        return

    if group.name == ROLE_INSTRUCTOR:
        group.permissions.set(_get_permissions(INSTRUCTOR_PERMISSIONS))
        return

    if group.name == ROLE_STUDENT:
        group.permissions.set(_get_permissions(STUDENT_PERMISSIONS))
        return

    if group.name == ROLE_VIEWER:
        group.permissions.set(_get_permissions(VIEWER_PERMISSIONS))
        return

    return


def _ensure_default_admin_permissions(group):
    if group.name != ROLE_ADMIN:
        return
    # Ensure the admin group contains the curated ADMIN_PERMISSIONS but do not
    # promiscuously add all system permissions. SuperAdmin should have full
    # access; Admin remains institution-scoped.
    expected = set(
        f"{perm.content_type.app_label}.{perm.codename}"
        for perm in _get_permissions(ADMIN_PERMISSIONS)
    )
    current = set(
        f"{perm.content_type.app_label}.{perm.codename}"
        for perm in group.permissions.all()
    )
    missing = expected - current
    if missing:
        group.permissions.add(*[perm for perm in _get_permissions(ADMIN_PERMISSIONS) if f"{perm.content_type.app_label}.{perm.codename}" in missing])


def _ensure_default_student_permissions(group):
    if group.name != ROLE_STUDENT:
        return

    expected_permissions = set(
        f"{perm.content_type.app_label}.{perm.codename}"
        for perm in _get_permissions(STUDENT_PERMISSIONS)
    )
    current_permissions = set(
        f"{perm.content_type.app_label}.{perm.codename}"
        for perm in group.permissions.all()
    )
    if expected_permissions - current_permissions:
        group.permissions.add(
            *[perm for perm in _get_permissions(STUDENT_PERMISSIONS) if f"{perm.content_type.app_label}.{perm.codename}" in expected_permissions - current_permissions]
        )


def sync_user_role_group(user):
    role_to_group = {
        "super_admin": ROLE_SUPERADMIN,
        "admin": ROLE_ADMIN,
        "instructor": ROLE_INSTRUCTOR,
        "student": ROLE_STUDENT,
        "viewer": ROLE_VIEWER,
    }
    group_name = role_to_group.get(user.role)

    if not group_name:
        return

    group, created = Group.objects.get_or_create(name=group_name)
    if created or group.permissions.count() == 0:
        _assign_default_permissions(group)
    elif group.name == ROLE_ADMIN:
        _ensure_default_admin_permissions(group)
    elif group.name == ROLE_STUDENT:
        _ensure_default_student_permissions(group)

    user.groups.remove(*Group.objects.filter(name__in=DEFAULT_ROLES).exclude(name=group_name))
    user.groups.add(group)


def seed_roles():
    groups = {
        role_name: Group.objects.get_or_create(name=role_name)[0]
        for role_name in DEFAULT_ROLES
    }

    # Seed permissions for all default roles
    _assign_default_permissions(groups[ROLE_SUPERADMIN])
    _assign_default_permissions(groups[ROLE_ADMIN])
    _ensure_default_admin_permissions(groups[ROLE_ADMIN])
    _assign_default_permissions(groups[ROLE_INSTRUCTOR])
    _assign_default_permissions(groups[ROLE_STUDENT])
    _assign_default_permissions(groups[ROLE_VIEWER])

    return groups
