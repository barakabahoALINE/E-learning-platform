import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'E_learning_platform.settings')
django.setup()

from community_app.models import CommunityDiscussion, CommunityLike
from django.db import connection

print('CommunityDiscussion fields:', [f.name for f in CommunityDiscussion._meta.fields])
print('CommunityLike fields:', [f.name for f in CommunityLike._meta.fields])

with connection.cursor() as cursor:
    cursor.execute("SHOW COLUMNS FROM community_app_communitydiscussion")
    print('discussion columns:', cursor.fetchall())
    cursor.execute("SHOW COLUMNS FROM community_app_communityreply")
    print('reply columns:', cursor.fetchall())
    cursor.execute("SHOW COLUMNS FROM community_app_communitylike")
    print('like columns:', cursor.fetchall())
