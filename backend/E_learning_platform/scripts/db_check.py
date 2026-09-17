import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'E_learning_platform.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SHOW TABLES LIKE 'community_app_%'")
    tables = cursor.fetchall()
    print('tables:', tables)
