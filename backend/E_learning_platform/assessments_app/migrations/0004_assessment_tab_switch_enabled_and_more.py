# Minimal placeholder migration to restore missing migration node
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("assessments_app", "0003_initial"),
    ]

    operations = []
