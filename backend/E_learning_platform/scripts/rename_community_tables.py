import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'E_learning_platform.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    for tbl in [
        'community_app_discussion',
        'community_app_reply',
        'community_app_like',
    ]:
        cursor.execute(f"SHOW TABLES LIKE '{tbl}'")
        found = cursor.fetchall()
        print(tbl, 'found:' , found)
        if found:
            cursor.execute(f"SHOW CREATE TABLE `{tbl}`")
            row = cursor.fetchone()
            print('SHOW CREATE TABLE', tbl)
            print(row[1])

    if all(
        connection.introspection.table_names().count(t) > 0
        for t in ['community_app_discussion', 'community_app_reply', 'community_app_like']
    ):
        print('ready to rename')
        cursor.execute(
            "RENAME TABLE community_app_discussion TO community_app_communitydiscussion, "
            "community_app_reply TO community_app_communityreply, "
            "community_app_like TO community_app_communitylike"
        )
        print('renamed tables')
        for tbl in [
            'community_app_communitydiscussion',
            'community_app_communityreply',
            'community_app_communitylike',
        ]:
            cursor.execute(f"SHOW TABLES LIKE '{tbl}'")
            print(tbl, cursor.fetchall())
