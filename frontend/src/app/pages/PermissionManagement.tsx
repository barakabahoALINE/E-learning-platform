import { useState } from "react";
import { useData } from "../context/DataContext";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { updateRBACRolePermissions } from "../../features/rbac/rbacSlice";
import { selectRBACLoading } from "../../features/rbac/rbacSelectors";
import { selectCurrentUser } from "../../features/auth/authSelectors";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Search, Key, Shield, CheckCircle2, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export function PermissionManagementPage() {
  const { permissions, roles, updateRolePermissions } = useData();
  const currentUser = useAppSelector(selectCurrentUser);
  const [searchQuery, setSearchQuery] = useState("");

  const isCheckboxDisabled = (targetRoleName: string) => {
    if (!currentUser) return true;
    if (currentUser.is_superuser) return false;

    const userRole = currentUser.role?.toLowerCase();
    const target = targetRoleName.toLowerCase();

    if (userRole === "viewer") {
      return true; // Viewer cannot modify any permissions
    }

    if (userRole === "instructor") {
      // Instructor can only manage Student
      return target !== "student";
    }

    if (userRole === "admin") {
      // Admin can only manage Instructor, Viewer, Student
      return !["instructor", "viewer", "student"].includes(target);
    }

    return true;
  };
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Deduplicate permissions by id in case the backend contains duplicate rows.
  const uniquePermissions = Array.from(new Map(permissions.map((p) => [p.id, p])).values());

  const permissionsByModule = uniquePermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const filteredPermissions = uniquePermissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule = !selectedModule || permission.module === selectedModule;
    return matchesSearch && matchesModule;
  });

  const modules = [...new Set(uniquePermissions.map((p) => p.module))];
  const customPermissionIds = new Set(filteredPermissions.map((p) => p.id));

  const dispatch = useAppDispatch();
  const rbacLoading = useAppSelector(selectRBACLoading);

  const toggleRolePermission = async (roleId: number, permissionId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const newPermissions = role.permissions.includes(permissionId)
      ? role.permissions.filter((p) => p !== permissionId)
      : [...role.permissions, permissionId];

    const toastId = toast.loading("Updating role permissions...");
    try {
      await dispatch(updateRBACRolePermissions({ roleId, permissions: newPermissions })).unwrap();
      toast.success("Permissions updated", { id: toastId });
    } catch (err: any) {
      const message = err?.message || "Failed to update permissions";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Permission Management</h1>
        <p className="text-gray-600 mt-1">View and manage system permissions across roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Permissions</p>
              <p className="text-2xl font-semibold text-gray-900">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : filteredPermissions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Modules</p>
              <p className="text-2xl font-semibold text-gray-900">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : modules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Roles</p>
              <p className="text-2xl font-semibold text-gray-900">{rbacLoading ? <Loader2 className="animate-spin inline-block" /> : roles.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Permissions/Role</p>
              <p className="text-2xl font-semibold text-gray-900">
                {rbacLoading ? <Loader2 className="animate-spin inline-block" /> : Math.round(roles.reduce((sum, role) => sum + role.permissions.filter((pid) => customPermissionIds.has(pid)).length, 0) / roles.length)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={selectedModule === null ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setSelectedModule(null)}
            >
              All Modules
            </Badge>
            {modules.map((module) => (
              <Badge
                key={module}
                variant={selectedModule === module ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setSelectedModule(module)}
              >
                {module}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Permission Matrix</h2>
          <p className="text-sm text-gray-600 mb-4">
            Toggle checkboxes to grant or revoke permissions for each role
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px] sticky left-0 bg-white z-10">
                    Permission
                  </TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.id} className="text-center min-w-[120px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium">{role.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {role.permissions.filter((pid) => customPermissionIds.has(pid)).length}
                        </Badge>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermissions.map((permission, pIdx) => (
                  <TableRow key={`${permission.id}-${pIdx}`}>
                    <TableCell className="sticky left-0 bg-white z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm text-gray-900">
                            {permission.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-6">{permission.description}</p>
                        <Badge variant="secondary" className="text-xs mt-1 ml-6">
                          {permission.module}
                        </Badge>
                      </div>
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={`${permission.id}-${role.id}`} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={role.permissions.includes(permission.id)}
                            onCheckedChange={() => toggleRolePermission(role.id, permission.id)}
                            disabled={isCheckboxDisabled(role.name)}
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Permissions by Module</h2>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(permissionsByModule).map(([module, perms]) => (
            <AccordionItem key={module} value={module}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{module}</span>
                  </div>
                  <Badge variant="secondary">{perms.length} permissions</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-4">
                  {perms.map((permission, idx) => (
                    <div
                      key={`${permission.id}-${idx}`}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Key className="w-4 h-4 text-gray-400" />
                          <h4 className="font-medium text-sm text-gray-900">{permission.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 ml-6">{permission.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3 ml-6">
                          {roles
                            .filter((role) => role.permissions.includes(permission.id))
                            .map((role) => (
                              <Badge key={`${permission.id}-${role.id}`} variant="secondary" className="text-xs">
                                {role.name}
                              </Badge>
                            ))}
                          {roles.filter((role) => role.permissions.includes(permission.id))
                            .length === 0 && (
                              <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-500">
                                Not assigned to any role
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permission Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{role.name}</h3>
                  <p className="text-xs text-gray-500">
                    {role.permissions.filter((pid) => customPermissionIds.has(pid)).length} permissions
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(permissionsByModule).map(([module, perms]) => {
                  const roleModulePerms = perms.filter((p) => role.permissions.includes(p.id));
                  if (roleModulePerms.length === 0) return null;
                  return (
                    <div key={module} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{module}</span>
                      <Badge variant="secondary" className="text-xs">
                        {roleModulePerms.length}/{perms.length}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
