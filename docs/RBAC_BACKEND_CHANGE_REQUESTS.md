# RBAC Backend Change Requests

The frontend RBAC integration now uses the existing backend APIs without modifying backend code. The items below are backend changes needed for complete persistence and parity with the RBAC architecture.

## 1. Persist role metadata and role renaming

Current impact:
- The frontend can create/delete roles and update role permissions through existing APIs.
- The existing role update endpoint does not persist role descriptions, and role rename support is not currently exposed by the serializer used by the role detail endpoint.

Required change:
- Add backend support for role display metadata, such as description and last modified timestamp, or expose an agreed metadata model.
- Update the role detail update flow to safely rename non-reserved roles when permitted.

Expected impact:
- Role details edited in Access Management will survive page reloads and backend refreshes.
- Custom roles can be managed fully from the frontend instead of only partially.

## 2. Add server-side audit logs

Current impact:
- The frontend records Access Management actions in local storage for immediate UI feedback.
- Audit events are not shared across devices or retained as authoritative backend records.

Required change:
- Add an audit log model and API for listing security events.
- Record sensitive actions such as user deletion, user activation changes, role assignment, role permission updates, and role deletion.

Expected impact:
- Audit Logs will become authoritative, durable, and available across sessions.
- Security reporting will match the RBAC architecture requirements.

## 3. Return full RBAC payload from Google login

Current impact:
- Email/password login returns groups, permissions, and `is_superuser`.
- The Google login view constructs a smaller user payload directly.

Required change:
- Reuse the same auth payload serializer/helper for Google login responses.

Expected impact:
- Permission-based routing works consistently for all login methods.

## 4. Add admin user creation endpoint

Current impact:
- The frontend currently reuses signup for user creation because no dedicated admin user creation endpoint exists.
- Signup creates an unverified account and triggers the public registration flow.

Required change:
- Add an authenticated admin user creation endpoint that can create a user, set initial active/verified status according to policy, and assign groups in one transaction.

Expected impact:
- Access Management user creation will be cleaner, auditable, and aligned with admin workflows.
