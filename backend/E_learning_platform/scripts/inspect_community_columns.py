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
        'community_app_communitydiscussion',
        'community_app_communityreply',
        'community_app_communitylike',
    ]:
        print('\nTABLE', tbl)
        cursor.execute(f"SHOW COLUMNS FROM {tbl}")
        for row in cursor.fetchall():
            print(row)

    print('\nSAMPLE discussion row:')
    cursor.execute('SELECT * FROM community_app_communitydiscussion LIMIT 3')
    for row in cursor.fetchall():
        print(row)

    print('\nSAMPLE like row:')
    cursor.execute('SELECT * FROM community_app_communitylike LIMIT 5')
    for row in cursor.fetchall():
        print(row)
