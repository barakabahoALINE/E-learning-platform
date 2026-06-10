from django.contrib.auth.models import Group, Permission


ROLE_ADMIN = "Admin"
ROLE_INSTRUCTOR = "Instructor"
ROLE_STUDENT = "Student"
ROLE_VIEWER = "Viewer"

DEFAULT_ROLES = (ROLE_ADMIN, ROLE_INSTRUCTOR, ROLE_STUDENT, ROLE_VIEWER)

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

# VIEWER_PERMISSIONS = [
#     "courses_app.view_course",
#     "courses_app.view_published_course",
# ]

# INSTRUCTOR_PERMISSIONS = [
#     "courses_app.view_course",
#     "courses_app.view_published_course",
#     "assessments_app.view_assessment",
#     "assessments_app.view_attempt",
#     "progress_app.view_progress",
# ]


def _get_permissions(permission_names):
    permissions = []

    for permission_name in permission_names:
        if "." not in permission_name:
            continue

        app_label, codename = permission_name.split(".", 1)
        try:
            permissions.append(
                Permission.objects.get(
                    content_type__app_label=app_label,
                    codename=codename,
                )
            )
        except Permission.DoesNotExist:
            continue

    return permissions


def _assign_default_permissions(group):
    if group.name == ROLE_ADMIN:
        # Admins get all non-core permissions. Core system permissions (auth, admin, sessions, contenttypes)
        # are reserved for superusers.
        core_apps = {"auth", "contenttypes", "sessions", "admin"}
        perms = Permission.objects.exclude(content_type__app_label__in=core_apps)
        group.permissions.set(perms)
        return

    if group.name == ROLE_STUDENT:
        group.permissions.set(_get_permissions(STUDENT_PERMISSIONS))
        return

    # Do not auto-assign default permissions for Instructor or Viewer.
    # Instructors and Viewers should only have permissions explicitly assigned
    # via the role permission APIs.
    return


def _ensure_default_admin_permissions(group):
    if group.name != ROLE_ADMIN:
        return

    core_apps = {"auth", "contenttypes", "sessions", "admin"}
    all_admin_permissions = Permission.objects.exclude(content_type__app_label__in=core_apps)
    current_permission_ids = set(group.permissions.values_list("id", flat=True))
    missing_permissions = [perm for perm in all_admin_permissions if perm.id not in current_permission_ids]

    if missing_permissions:
        group.permissions.add(*missing_permissions)


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
        "admin": ROLE_ADMIN,
        "super_admin": ROLE_ADMIN,
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

    _assign_default_permissions(groups[ROLE_ADMIN])
    _ensure_default_admin_permissions(groups[ROLE_ADMIN])
    # _assign_default_permissions(groups[ROLE_INSTRUCTOR])
    _assign_default_permissions(groups[ROLE_STUDENT])
    # _assign_default_permissions(groups[ROLE_VIEWER])

    return groups
