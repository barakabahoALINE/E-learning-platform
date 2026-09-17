from django.db import migrations


def column_exists(cursor, table_name, column_name):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s",
        [table_name, column_name],
    )
    return cursor.fetchone()[0] > 0


def forwards(apps, schema_editor):
    cursor = schema_editor.connection.cursor()

    if column_exists(cursor, 'community_app_communitydiscussion', 'course_id'):
        cursor.execute(
            "ALTER TABLE `community_app_communitydiscussion` "
            "MODIFY COLUMN `course_id` varchar(64) NOT NULL"
        )

    if not column_exists(cursor, 'community_app_communitydiscussion', 'course_title'):
        cursor.execute(
            "ALTER TABLE `community_app_communitydiscussion` "
            "ADD COLUMN `course_title` varchar(255) NOT NULL DEFAULT ''"
        )

    if column_exists(cursor, 'community_app_communitylike', 'discussion_id') or column_exists(cursor, 'community_app_communitylike', 'reply_id'):
        cursor.execute(
            "UPDATE community_app_communitylike "
            "SET item_type = CASE "
            "WHEN discussion_id IS NOT NULL THEN 'discussion' "
            "WHEN reply_id IS NOT NULL THEN 'reply' "
            "ELSE 'discussion' END, "
            "item_id = CASE "
            "WHEN discussion_id IS NOT NULL THEN CAST(discussion_id AS CHAR) "
            "WHEN reply_id IS NOT NULL THEN CAST(reply_id AS CHAR) "
            "ELSE '' END"
        )

    if not column_exists(cursor, 'community_app_communitylike', 'item_type'):
        cursor.execute(
            "ALTER TABLE `community_app_communitylike` "
            "ADD COLUMN `item_type` varchar(20) NOT NULL DEFAULT 'discussion'"
        )

    if not column_exists(cursor, 'community_app_communitylike', 'item_id'):
        cursor.execute(
            "ALTER TABLE `community_app_communitylike` "
            "ADD COLUMN `item_id` varchar(64) NOT NULL DEFAULT ''"
        )

    if column_exists(cursor, 'community_app_communitylike', 'discussion_id') or column_exists(cursor, 'community_app_communitylike', 'reply_id'):
        cursor.execute(
            "UPDATE community_app_communitylike "
            "SET item_type = CASE "
            "WHEN discussion_id IS NOT NULL THEN 'discussion' "
            "WHEN reply_id IS NOT NULL THEN 'reply' "
            "ELSE 'discussion' END, "
            "item_id = CASE "
            "WHEN discussion_id IS NOT NULL THEN CAST(discussion_id AS CHAR) "
            "WHEN reply_id IS NOT NULL THEN CAST(reply_id AS CHAR) "
            "ELSE '' END"
        )


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('community_app', '0002_alter_communitydiscussion_options_and_more'),
    ]

    operations = [
        migrations.RunPython(forwards, reverse),
    ]
