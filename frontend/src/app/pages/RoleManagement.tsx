import { useState } from "react";
import { useAppSelector } from "../../hooks/reduxHooks";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { useData, Role } from "../context/DataContext";
import { toast } from "sonner";
import { useAppDispatch } from "../../hooks/reduxHooks";
import { createRBACRole, deleteRBACRole, updateRBACRolePermissions } from "../../features/rbac/rbacSlice";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { Shield, Users, Calendar, MoreVertical, Plus, Lock, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Checkbox } from "../components/ui/checkbox";

export function RoleManagementPage() {
  const { roles, permissions, users, updateRole } = useData();
  const dispatch = useAppDispatch();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermissionsSheet, setShowPermissionsSheet] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isLoadingDelete, setIsLoadingDelete] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  const customPermissions = permissions;
  const permissionsByModule = customPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof customPermissions>);
  const customPermissionIds = new Set(customPermissions.map((p) => p.id));
  const currentUser = useAppSelector(selectCurrentUser);

  const handleCreateRole = async () => {
    if (!roleName.trim()) return;

    setIsLoadingCreate(true);
    const toastId = toast.loading("Creating role...");

    try {
      await dispatch(
        createRBACRole({
          name: roleName,
          description: roleDescription,
          permissions: selectedPermissions,
        })
      ).unwrap();

      toast.success("Role created successfully!", { id: toastId });
      setShowCreateDialog(false);
      resetForm();
    } catch (error: any) {
      const message = error?.message || "Failed to create role";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoadingCreate(false);
    }
  };

  const handleUpdateRole = () => {
    if (selectedRole) {
      updateRole(selectedRole.id, {
        name: roleName,
        description: roleDescription,
      });
      toast.success("Role updated successfully!");
      setShowEditDialog(false);
      resetForm();
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setIsLoadingDelete(true);
    const toastId = toast.loading("Deleting role...");

    try {
      await dispatch(deleteRBACRole(selectedRole.id)).unwrap();

      toast.success("Role deleted successfully!", { id: toastId });
      setShowDeleteDialog(false);
      setSelectedRole(null);
    } catch (error: any) {
      const message = error?.message || "Failed to delete role";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoadingDelete(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;

    setIsLoadingPermissions(true);
    const toastId = toast.loading("Updating permissions...");

    try {
      await dispatch(
        updateRBACRolePermissions({
          roleId: selectedRole.id,
          permissions: selectedPermissions,
        })
      ).unwrap();

      toast.success("Permissions updated successfully!", { id: toastId });
      setShowPermissionsSheet(false);
      setSelectedRole(null);
      setSelectedPermissions([]);
    } catch (error: any) {
      const message = error?.message || "Failed to update permissions";
      toast.error(message, { id: toastId });
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const resetForm = () => {
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setSelectedRole(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setShowEditDialog(true);
  };

  const openPermissionsSheet = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions);
    setShowPermissionsSheet(true);
  };

  const canEditSelectedRole = (role?: Role) => {
    if (!role) return false;
    if (!currentUser) return false;
    if (currentUser.is_superuser) return true;

    const userRole = currentUser.role?.toLowerCase();
    const target = role.name.toLowerCase();

    if (userRole === "viewer") {
      return false; // Viewer cannot modify any role permissions
    }

    if (userRole === "instructor") {
      // Instructor can only manage Student
      return target === "student";
    }

    if (userRole === "admin") {
      // Admin can manage Instructor, Viewer, Student
      return ["instructor", "viewer", "student"].includes(target);
    }

    return false;
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleAllInModule = (module: string) => {
    const modulePermissions = permissionsByModule[module].map((p) => p.id);
    const allSelected = modulePermissions.every((id) => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((id) => !modulePermissions.includes(id)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...modulePermissions])]);
    }
  };

  const getRoleUsers = (roleName: string) => {
    return users.filter(user => user.roles.includes(roleName));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Create and manage user roles and permissions</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map((role) => {
          const roleUsers = getRoleUsers(role.name);
          return (
            <Card key={role.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    {role.isSystemRole && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        System Role
                      </Badge>
                    )}
                  </div>
                </div>
                {!role.isSystemRole && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(role)}>
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openPermissionsSheet(role)}>
                        Manage Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(role)} className="text-red-600">
                        Delete Role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{role.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Users</span>
                  </div>
                  <span className="font-semibold text-gray-900">{role.userCount}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Lock className="w-4 h-4" />
                    <span>Permissions</span>
                  </div>
                  <span className="font-semibold text-gray-900">{role.permissions.filter((pid) => customPermissionIds.has(pid)).length}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Last Modified</span>
                  </div>
                  <span className="text-gray-500">{role.lastModified}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => openPermissionsSheet(role)}
                >
                  View Permissions
                </Button>
              </div>

              {roleUsers.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Assigned to:</p>
                  <div className="flex flex-wrap gap-1">
                    {roleUsers.slice(0, 3).map(user => (
                      <Badge key={user.id} variant="secondary" className="text-xs">
                        {user.name}
                      </Badge>
                    ))}
                    {roleUsers.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{roleUsers.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a custom role with specific permissions for your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-900">Role Name</label>
              <Input
                placeholder="e.g., Content Manager"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900">Description</label>
              <Textarea
                placeholder="Describe the purpose and responsibilities of this role..."
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 mb-2 block">Select Permissions</label>
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module}>
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={perms.every((p) => selectedPermissions.includes(p.id))}
                        onCheckedChange={() => toggleAllInModule(module)}
                      />
                      <span className="font-medium text-sm text-gray-900">{module}</span>
                    </div>
                    <div className="ml-6 space-y-2">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <label className="text-sm text-gray-600">{permission.name}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={!roleName.trim() || isLoadingCreate}>
              {isLoadingCreate ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span>
              ) : (
                "Create Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Update role name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-900">Role Name</label>
              <Input
                placeholder="Role name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900">Description</label>
              <Textarea
                placeholder="Role description"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={showPermissionsSheet} onOpenChange={setShowPermissionsSheet}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          {selectedRole && (
            <>
              <SheetHeader>
                <SheetTitle>Manage Permissions: {selectedRole.name}</SheetTitle>
                <SheetDescription>
                  Select the permissions for this role. Users with this role will have access to these
                  features.
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedPermissions.length} of {customPermissions.length} permissions selected
                  </span>
                  {canEditSelectedRole(selectedRole) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPermissions(customPermissions.map((p) => p.id))}
                      >
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedPermissions([])}>
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>

                {Object.entries(permissionsByModule).map(([module, perms]) => (
                  <div key={module} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        checked={perms.every((p) => selectedPermissions.includes(p.id))}
                        onCheckedChange={() => toggleAllInModule(module)}
                        disabled={!canEditSelectedRole(selectedRole)}
                      />
                      <h3 className="font-semibold text-gray-900">{module}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {perms.filter((p) => selectedPermissions.includes(p.id)).length}/{perms.length}
                      </Badge>
                    </div>
                    <div className="ml-8 space-y-3">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedPermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                            className="mt-1"
                            disabled={!canEditSelectedRole(selectedRole)}
                          />
                          <div>
                            <label className="text-sm font-medium text-gray-900">
                              {permission.name}
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">{permission.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPermissionsSheet(false)}
                    disabled={isLoadingPermissions}
                  >
                    {canEditSelectedRole(selectedRole) ? "Cancel" : "Close"}
                  </Button>
                  {canEditSelectedRole(selectedRole) && (
                    <Button className="flex-1" onClick={handleSavePermissions} disabled={isLoadingPermissions}>
                      {isLoadingPermissions ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span> : 'Save Permissions'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"? This will remove the role
              from all users who have it assigned. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={isLoadingDelete}>
              {isLoadingDelete ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</span> : 'Delete Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
