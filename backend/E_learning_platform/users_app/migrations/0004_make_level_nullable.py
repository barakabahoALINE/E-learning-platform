from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users_app', '0003_fix_user_model'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE `users_app_user` MODIFY COLUMN `level` varchar(20) NULL;",
            reverse_sql="ALTER TABLE `users_app_user` MODIFY COLUMN `level` varchar(20) NOT NULL;",
        ),
    ]
