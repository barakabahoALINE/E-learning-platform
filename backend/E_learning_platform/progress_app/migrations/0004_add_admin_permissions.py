from django.db import migrations


def add_admin_default_permissions(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    core_apps = {"auth", "contenttypes", "sessions", "admin"}

    try:
        admin_group = Group.objects.get(name="admin")
    except Group.DoesNotExist:
        return

    admin_permissions = Permission.objects.exclude(content_type__app_label__in=core_apps)
    if admin_permissions.exists():
        admin_group.permissions.add(*admin_permissions)


def remove_admin_default_permissions(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    core_apps = {"auth", "contenttypes", "sessions", "admin"}

    try:
        admin_group = Group.objects.get(name="admin")
    except Group.DoesNotExist:
        return

    admin_permissions = Permission.objects.exclude(content_type__app_label__in=core_apps)
    if admin_permissions.exists():
        admin_group.permissions.remove(*admin_permissions)


class Migration(migrations.Migration):

    dependencies = [
        ("progress_app", "0003_alter_courseprogress_options"),
    ]

    operations = [
        migrations.RunPython(add_admin_default_permissions, remove_admin_default_permissions),
    ]
