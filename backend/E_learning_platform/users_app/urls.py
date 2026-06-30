from django.urls import path
from django.contrib.auth import views as auth_views
from django.urls import path
from .views import *
urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('password-rules/', PasswordRulesView.as_view(), name='password-rules'),
    path("verify-email/<uidb64>/<token>/", VerifyEmailView.as_view(), name="verify-email"),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('google-login/', GoogleLoginAPIView.as_view()),
    path('forgot-password/', forgot_password, name='forgot-password'),
    path('reset-password/<uidb64>/<token>/', reset_password, name='reset-password'),
    path('add-user/', AddUserApiView.as_view(), name='add-user'),
    path('create-password/', CreatePasswordApiView.as_view(), name='create-password'),
    path("users/", UserListView.as_view(), name="users-list"),
    path("users/<int:id>/update/", UserUpdateView.as_view(), name="user-update"),
    path("users/<int:id>/delete/", UserDeleteView.as_view(), name="user-delete"),
    path('profile/', ProfileAPIView.as_view(), name='profile'),
    path('profile/update-picture/', UpdateProfilePictureAPIView.as_view()),
    path('profile/update-name/', UpdateNameAPIView.as_view()),
    path('profile/update-password/', UpdatePasswordAPIView.as_view()),
    path('users/<int:user_id>/role-update/', UserRoleUpdateView.as_view(), name='role-update'),
    path('users/<int:user_id>/permissions-update/', UserPermissionsUpdateView.as_view(), name='user-permissions-update'),
    path('users/<int:user_id>/groups-update/', UserGroupsUpdateView.as_view(), name='user-groups-update'),
    path('roles/', RoleListView.as_view(), name='roles-list'),
    path('roles/create/', RoleCreateView.as_view(), name='roles-create'),
    path('roles/<int:role_id>/', RoleDetailView.as_view(), name='roles-detail'),
    path('roles/<int:role_id>/delete/', RoleDeleteView.as_view(), name='roles-delete'),
    path('roles/<int:role_id>/permissions/', RolePermissionUpdateView.as_view(), name='role-permissions-update'),
    path('roles/<int:role_id>/assign-permissions/', RolePermissionAssignView.as_view(), name='role-assign-permissions'),
    path('permissions/', PermissionListView.as_view(), name='permissions-list'),
    path('permissions/create/', PermissionCreateView.as_view(), name='permissions-create'),

]



