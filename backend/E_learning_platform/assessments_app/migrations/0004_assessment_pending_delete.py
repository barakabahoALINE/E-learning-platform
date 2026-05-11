from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assessments_app", "0003_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="assessment",
            name="pending_delete",
            field=models.BooleanField(default=False),
        ),
    ]
