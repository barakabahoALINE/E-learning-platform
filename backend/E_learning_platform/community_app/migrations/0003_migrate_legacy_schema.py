from django.db import migrations


def column_exists(cursor, table_name, column_name):
    cursor.execute(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_schema = DATABASE() AND table_name = %s AND column_name = %s",
        [table_name, column_name],
    )
    return cursor.fetchone()[0] > 0


def drop_foreign_key_if_exists(cursor, table_name, column_name):
    cursor.execute(
        "SELECT constraint_name FROM information_schema.key_column_usage "
        "WHERE table_schema = DATABASE() AND table_name = %s "
        "AND column_name = %s AND referenced_table_name IS NOT NULL",
        [table_name, column_name],
    )
    for row in cursor.fetchall():
        constraint_name = row[0]
        cursor.execute(f"ALTER TABLE `{table_name}` DROP FOREIGN KEY `{constraint_name}`")


def forwards(apps, schema_editor):
    cursor = schema_editor.connection.cursor()

    # CommunityDiscussion legacy schema fix
    if column_exists(cursor, 'community_app_communitydiscussion', 'course_id'):
        drop_foreign_key_if_exists(cursor, 'community_app_communitydiscussion', 'course_id')
        cursor.execute(
            "ALTER TABLE `community_app_communitydiscussion` "
            "MODIFY COLUMN `course_id` varchar(64) NOT NULL"
        )

    if not column_exists(cursor, 'community_app_communitydiscussion', 'course_title'):
        cursor.execute(
            "ALTER TABLE `community_app_communitydiscussion` "
            "ADD COLUMN `course_title` varchar(255) NOT NULL DEFAULT ''"
        )

    cursor.execute(
        "UPDATE community_app_communitydiscussion AS d "
        "LEFT JOIN courses_app_course AS c ON c.id = d.course_id "
        "SET d.course_title = COALESCE(c.title, '')"
    )

    # CommunityLike legacy schema fix
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
