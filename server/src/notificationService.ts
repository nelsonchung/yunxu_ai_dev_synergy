import { broadcastNewNotification } from "./notificationHub.js";
import { createNotification } from "./notificationsStore.js";
import { listUsers, type UserRole } from "./store.js";

export const listActiveUserIdsByRole = async (roles: UserRole[]) => {
  const users = await listUsers();
  return users
    .filter((user) => roles.includes(user.role) && user.status === "active")
    .map((user) => user.id);
};

export const notifyUsers = async (payload: {
  recipientIds: string[];
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  linkByRole?: Partial<Record<UserRole, string>>;
}) => {
  const uniqueRecipients = Array.from(new Set(payload.recipientIds)).filter(
    (id) => id && id !== payload.actorId
  );
  if (uniqueRecipients.length === 0) return [];
  const roleLinkMap = payload.linkByRole ?? null;
  let userRoleById: Map<string, UserRole> | null = null;
  if (roleLinkMap) {
    const users = await listUsers();
    userRoleById = new Map(users.map((user) => [user.id, user.role]));
  }
  const notifications = await Promise.all(
    uniqueRecipients.map((recipientId) => {
      const role = userRoleById?.get(recipientId);
      const roleLink = role && roleLinkMap ? roleLinkMap[role] : undefined;
      return createNotification({
        recipientId,
        actorId: payload.actorId ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: roleLink ?? payload.link ?? null,
      });
    })
  );
  await Promise.all(notifications.map((item) => broadcastNewNotification(item)));
  return notifications;
};
