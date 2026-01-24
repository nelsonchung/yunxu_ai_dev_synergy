import { apiRequest } from "@/lib/authClient";

export type PermissionDefinition = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export type RolePermissions = {
  customer: string[];
  developer: string[];
};

export type RolePermissionsResponse = {
  roles: RolePermissions;
  definitions: PermissionDefinition[];
};

export const getMyPermissions = async () => {
  return apiRequest<{ role: string; permissions: string[] }>("/api/permissions", {
    method: "GET",
  });
};

export const getRolePermissions = async () => {
  return apiRequest<RolePermissionsResponse>("/admin/role-permissions", { method: "GET" });
};

export const updateRolePermissions = async (roles: RolePermissions) => {
  const data = await apiRequest<{ roles: RolePermissions }>("/admin/role-permissions", {
    method: "PUT",
    body: JSON.stringify({ roles }),
  });
  return data.roles;
};

export const hasPermission = (
  role: string | null,
  permissions: string[],
  permissionId: string
) => {
  if (role === "admin") return true;
  return permissions.includes(permissionId);
};

