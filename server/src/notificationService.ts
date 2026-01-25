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
}) => {
  const uniqueRecipients = Array.from(new Set(payload.recipientIds)).filter(
    (id) => id && id !== payload.actorId
  );
  if (uniqueRecipients.length === 0) return [];
  return Promise.all(
    uniqueRecipients.map((recipientId) =>
      createNotification({
        recipientId,
        actorId: payload.actorId ?? null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link ?? null,
      })
    )
  );
};
