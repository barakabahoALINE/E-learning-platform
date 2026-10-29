from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from users_app.models import TrainingUserProfile

from .models import AuditLog

User = get_user_model()


class AdminUserCreationAndAuditLogTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superuser = User.objects.create_user(
            email="admin@platform.test",
            password="StrongPass1!",
            full_name="Platform Admin",
            institution="NISR",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        self.superuser.is_superuser = True
        self.superuser.save(update_fields=["is_superuser", "is_staff", "is_verified", "is_active", "role"])
        self.client.force_authenticate(user=self.superuser)

    def test_admin_can_create_user_with_role_and_groups(self):
        payload = {
            "email": "new.instructor@platform.test",
            "full_name": "New Instructor",
            "institution": "NISR",
            "department": "Data Quality",
            "role": "instructor",
            "is_active": False,
            "is_verified": False,
            "groups": ["Instructor", "Viewer"],
        }

        response = self.client.post("/auth/admin-users/create/", payload, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "success")

        user = User.objects.get(email=payload["email"])
        self.assertEqual(user.role, "instructor")
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_verified)
        self.assertEqual(set(user.groups.values_list("name", flat=True)), {"Instructor", "Viewer"})

    @patch("users_app.serializers.send_invitation_email")
    def test_admin_can_create_training_user_from_add_user_endpoint(self, send_invitation_email):
        response = self.client.post(
            "/auth/add-user/",
            {
                "email": "training.user@platform.test",
                "full_name": "Training User",
                "institution": "NISR",
                "department": "Field Operations",
                "role": "training_user",
                "status": "inactive",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        user = User.objects.get(email="training.user@platform.test")
        self.assertEqual(user.role, "training_user")
        self.assertTrue(TrainingUserProfile.objects.filter(user=user).exists())
        self.assertTrue(user.groups.filter(name="TrainingUser").exists())
        send_invitation_email.assert_called_once()

    def test_audit_logs_are_listed_for_security_events(self):
        AuditLog.objects.create(
            actor=self.superuser,
            action="Created user",
            target="new.user@platform.test",
            details="Created access management user entry",
            module="Users",
            severity="info",
            status="success",
        )

        response = self.client.get("/auth/audit-logs/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "success")
        self.assertGreaterEqual(len(response.data["data"]), 1)
        self.assertIn("Created user", [entry["action"] for entry in response.data["data"]])

    def test_role_change_creates_audit_log(self):
        target = User.objects.create_user(
            email="learner@platform.test",
            password="StrongPass1!",
            full_name="Learner User",
            institution="NISR",
            role="student",
            is_active=True,
            is_verified=True,
        )

        response = self.client.patch(
            f"/auth/users/{target.id}/role-update/",
            {"role": "instructor"},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            AuditLog.objects.filter(action="Updated user role", target=target.email).exists()
        )

    def test_user_delete_creates_audit_log(self):
        target = User.objects.create_user(
            email="delete.me@platform.test",
            password="StrongPass1!",
            full_name="Delete Me",
            institution="NISR",
            role="student",
            is_active=True,
            is_verified=True,
        )

        response = self.client.delete(f"/auth/users/{target.id}/delete/")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(
            AuditLog.objects.filter(action="Deleted user", target=target.email).exists()
        )

    @patch("users_app.serializers.id_token.verify_oauth2_token")
    def test_google_login_returns_full_rbac_payload(self, mock_verify):
        mock_verify.return_value = {"email": "google.user@platform.test", "name": "Google User"}

        response = self.client.post("/auth/google-login/", {"token": "valid-token"}, format="json")

        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["user"]["email"], "google.user@platform.test")
        self.assertIn("groups", response.data["data"]["user"])
        self.assertIn("permissions", response.data["data"]["user"])
        self.assertIn("is_superuser", response.data["data"]["user"])

    def test_non_superuser_admin_only_sees_own_institution_users(self):
        admin = User.objects.create_user(
            email="institution.admin@platform.test",
            password="StrongPass1!",
            full_name="Institution Admin",
            institution="NISR",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.is_superuser = False
        admin.save(update_fields=["is_superuser", "is_staff", "is_active", "is_verified", "role", "institution"])

        same_institution_user = User.objects.create_user(
            email="same.institution@platform.test",
            password="StrongPass1!",
            full_name="Same Institution User",
            institution="NISR",
            role="student",
            is_active=True,
            is_verified=True,
        )
        other_institution_user = User.objects.create_user(
            email="other.institution@platform.test",
            password="StrongPass1!",
            full_name="Other Institution User",
            institution="OtherOrg",
            role="student",
            is_active=True,
            is_verified=True,
        )

        self.client.force_authenticate(user=admin)
        response = self.client.get("/auth/users/")

        self.assertEqual(response.status_code, 200, response.data)
        emails = {item["email"] for item in response.data}
        self.assertIn(same_institution_user.email, emails)
        self.assertNotIn(other_institution_user.email, emails)

    def test_non_superuser_admin_cannot_modify_other_institution_users(self):
        admin = User.objects.create_user(
            email="cross.institution.admin@platform.test",
            password="StrongPass1!",
            full_name="Cross Institutional Admin",
            institution="NISR",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.is_superuser = False
        admin.save(update_fields=["is_superuser", "is_staff", "is_active", "is_verified", "role", "institution"])

        other_user = User.objects.create_user(
            email="foreign.user@platform.test",
            password="StrongPass1!",
            full_name="Foreign User",
            institution="OtherOrg",
            role="student",
            is_active=True,
            is_verified=True,
        )

        self.client.force_authenticate(user=admin)

        role_response = self.client.patch(
            f"/auth/users/{other_user.id}/role-update/",
            {"role": "instructor"},
            format="json",
        )
        self.assertEqual(role_response.status_code, 403, role_response.data)

        delete_response = self.client.delete(f"/auth/users/{other_user.id}/delete/")
        self.assertEqual(delete_response.status_code, 403, delete_response.data)

    def test_non_superuser_admin_cannot_create_user_for_other_institution(self):
        admin = User.objects.create_user(
            email="foreign.admin@platform.test",
            password="StrongPass1!",
            full_name="Foreign Institution Admin",
            institution="NISR",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.is_superuser = False
        admin.save(update_fields=["is_superuser", "is_staff", "is_active", "is_verified", "role", "institution"])

        self.client.force_authenticate(user=admin)
        response = self.client.post(
            "/auth/admin-users/create/",
            {
                "email": "cross.institution.user@platform.test",
                "full_name": "Cross Institution User",
                "institution": "OtherOrg",
                "department": "Operations",
                "role": "student",
                "is_active": True,
                "is_verified": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(User.objects.filter(email="cross.institution.user@platform.test").exists())
