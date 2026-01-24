import { apiRequest, type AuthUser } from "@/lib/authClient";

export type AdminUser = AuthUser & {
  createdAt: string;
};

export const listUsers = async () => {
  const data = await apiRequest<{ users: AdminUser[] }>("/admin/users", { method: "GET" });
  return data.users;
};

export const updateUserRole = async (userId: string, role: AdminUser["role"]) => {
  const data = await apiRequest<{ user: AdminUser }>(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return data.user;
};

export const resetUserPassword = async (userId: string, password: string) => {
  await apiRequest(`/admin/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
};
