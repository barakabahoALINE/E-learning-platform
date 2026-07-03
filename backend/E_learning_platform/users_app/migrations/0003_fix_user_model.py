from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users_app', '0002_rolemetadata'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='user',
            name='level',
            field=models.CharField(blank=True, choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')], max_length=20, null=True),
        ),
    ]
