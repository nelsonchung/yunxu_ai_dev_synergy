import { createJsonStore, resolveDataPath } from "./jsonStore.js";
import {
  defaultRolePermissions,
  isKnownRole,
  permissionDefinitions,
  permissionIdSet,
  type RolePermissions,
} from "./permissions.js";
import type { UserRole } from "./store.js";

const ROLE_PERMISSIONS_FILE = resolveDataPath(
  process.env.DATA_ROLE_PERMISSIONS_FILE ?? "./data/role_permissions.json"
);

const store = createJsonStore<RolePermissions>(ROLE_PERMISSIONS_FILE, defaultRolePermissions);

const normalizePermissions = (value: unknown): RolePermissions => {
  if (!value || typeof value !== "object") {
    return defaultRolePermissions;
  }

  const roles = value as Partial<Record<keyof RolePermissions, unknown>>;

  return (Object.keys(defaultRolePermissions) as Array<keyof RolePermissions>).reduce(
    (acc, role) => {
      const rawList = roles[role];
      if (!Array.isArray(rawList)) {
        acc[role] = [...defaultRolePermissions[role]];
      } else {
        acc[role] = rawList
          .map((item) => String(item))
          .filter((item) => permissionIdSet.has(item));
      }
      return acc;
    },
    {} as RolePermissions
  );
};

export const initPermissionsStore = async () => {
  await store.ensure();
};

export const listPermissionDefinitions = () => permissionDefinitions;

export const getRolePermissions = async () => {
  const data = await store.read();
  return normalizePermissions(data);
};

export const updateRolePermissions = async (payload: unknown) => {
  const normalized = normalizePermissions(payload);
  await store.write(normalized);
  return normalized;
};

export const getRolePermissionList = async (role: UserRole) => {
  if (role === "admin") {
    return permissionDefinitions.map((item) => item.id);
  }
  const data = await getRolePermissions();
  return data[role] ?? [];
};

export const hasPermission = async (role: UserRole, permissionId: string) => {
  if (role === "admin") return true;
  if (!isKnownRole(role)) return false;
  const data = await getRolePermissions();
  return data[role]?.includes(permissionId) ?? false;
};

