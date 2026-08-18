from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assessments_app", "0013_question_draft_choices_question_draft_marks_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="assessment",
            name="draft_course_additions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="assessment",
            name="draft_course_removals",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="assessment",
            name="draft_module_additions",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="assessment",
            name="draft_module_removals",
            field=models.JSONField(blank=True, default=list),
        ),
    ]