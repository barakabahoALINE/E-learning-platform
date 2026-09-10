from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assessments_app", "0017_repair_missing_assessment_links"),
    ]

    operations = [
        migrations.AlterField(
            model_name="assessment",
            name="course",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="assessments",
                to="courses_app.course",
            ),
        ),
        migrations.AlterField(
            model_name="assessment",
            name="module",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="assessments",
                to="courses_app.module",
            ),
        ),
    ]