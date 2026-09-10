from django.db import migrations


def restore_missing_columns(apps, schema_editor):
    Assessment = apps.get_model("assessments_app", "Assessment")
    connection = schema_editor.connection
    existing_columns = {
        column.name
        for column in connection.introspection.get_table_description(
            connection.cursor(),
            Assessment._meta.db_table,
        )
    }

    for field_name in ("course", "module"):
        field = Assessment._meta.get_field(field_name)
        if field.column not in existing_columns:
            schema_editor.add_field(Assessment, field)


class Migration(migrations.Migration):

    dependencies = [
        ("assessments_app", "0016_assessment_links_set_null"),
    ]

    operations = [
        migrations.RunPython(
            restore_missing_columns,
            migrations.RunPython.noop,
        ),
    ]