from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("assessments_app", "0020_merge_20260910_1456"),
    ]

    operations = [
        migrations.AddField(
            model_name="attempt",
            name="assessment_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="attempt",
            name="question_snapshot",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="studentanswer",
            name="question",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="assessments_app.question",
            ),
        ),
        migrations.AddField(
            model_name="studentanswer",
            name="answer_snapshot",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
