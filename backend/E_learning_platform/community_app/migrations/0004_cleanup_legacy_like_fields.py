from django.db import migrations


def forwards(apps, schema_editor):
    connection = schema_editor.connection
    cursor = connection.cursor()

    def safe_execute(sql):
        try:
            cursor.execute(sql)
        except Exception:
            pass

    # Drop the legacy like constraint and columns no longer used by the model.
    safe_execute(
        "ALTER TABLE `community_app_communitylike` DROP FOREIGN KEY `community_app_like_discussion_id_2eb8b159_fk_community`"
    )
    safe_execute(
        "ALTER TABLE `community_app_communitylike` DROP FOREIGN KEY `community_app_like_reply_id_332b5286_fk_community_app_reply_id`"
    )
    safe_execute(
        "ALTER TABLE `community_app_communitylike` DROP FOREIGN KEY `community_app_like_user_id_92dec849_fk_users_app_user_id`"
    )
    safe_execute(
        "ALTER TABLE `community_app_communitylike` DROP CHECK `like_targets_one_item`"
    )
    safe_execute(
        "ALTER TABLE `community_app_communitylike` DROP COLUMN `discussion_id`, DROP COLUMN `reply_id`"
    )

    # MySQL may still reference index definitions after dropping columns, but dropping columns should remove them automatically.


def reverse(apps, schema_editor):
    # Reverse migration not implemented because legacy columns are deprecated and not needed.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('community_app', '0003_migrate_legacy_schema'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
