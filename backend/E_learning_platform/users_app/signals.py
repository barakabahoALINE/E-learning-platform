from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .services.rbac import seed_roles


@receiver(post_migrate)
def create_default_rbac_groups(sender, **kwargs):
    if getattr(sender, "name", None) != "users_app":
        return

    seed_roles()
