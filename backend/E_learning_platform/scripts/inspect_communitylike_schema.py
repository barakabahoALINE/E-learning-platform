import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'E_learning_platform.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    print('COLUMNS')
    cursor.execute("SHOW COLUMNS FROM community_app_communitylike")
    for row in cursor.fetchall():
        print(row)
    print('\nCREATE TABLE')
    cursor.execute("SHOW CREATE TABLE community_app_communitylike")
    row = cursor.fetchone()
    print(row[1] if row else 'none')
    print('\nCOUNT')
    cursor.execute("SELECT COUNT(*) FROM community_app_communitylike")
    print(cursor.fetchone()[0])
    print('\nSAMPLE')
    cursor.execute("SELECT id, discussion_id, reply_id, item_type, item_id, user_id FROM community_app_communitylike LIMIT 20")
    for row in cursor.fetchall():
        print(row)
