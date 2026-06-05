from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed default roles and assign default permissions"

    def handle(self, *args, **options):
        from users_app.services.rbac import seed_roles

        groups = seed_roles()

        for name, group in groups.items():
            self.stdout.write(self.style.SUCCESS(f"Ensured role: {name} (id={group.id})"))

        self.stdout.write(self.style.SUCCESS("Default roles seeded."))
from django.core.management.base import BaseCommand

from users_app.services.rbac import seed_roles


class Command(BaseCommand):
    help = "Create default RBAC groups and permissions."

    def handle(self, *args, **options):
        groups = seed_roles()

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded roles: " + ", ".join(sorted(groups.keys()))
            )
        )
