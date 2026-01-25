import { randomUUID } from "node:crypto";
import {
  ensureFile,
  readJsonFile,
  resolveDataPath,
  withWriteLock,
  writeJsonFile,
} from "./jsonStore.js";

export type Notification = {
  id: string;
  recipientId: string;
  actorId: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

const NOTIFICATIONS_FILE = resolveDataPath(
  process.env.DATA_NOTIFICATIONS_FILE ?? "./data/notifications.json"
);

const readNotifications = async () => {
  const data = await readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  return Array.isArray(data) ? data : [];
};

const writeNotifications = async (notifications: Notification[]) => {
  await writeJsonFile(NOTIFICATIONS_FILE, notifications, []);
};

export const initNotificationsStore = async () => {
  await ensureFile(NOTIFICATIONS_FILE, []);
};

export const listNotificationsByRecipient = async (
  recipientId: string,
  options?: { status?: "unread" }
) => {
  const notifications = await readNotifications();
  const filtered = notifications.filter((item) => item.recipientId === recipientId);
  const unreadOnly =
    options?.status === "unread"
      ? filtered.filter((item) => item.readAt === null)
      : filtered;
  return [...unreadOnly].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createNotification = async (payload: {
  recipientId: string;
  actorId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}) => {
  return withWriteLock(async () => {
    const notifications = await readNotifications();
    const now = new Date().toISOString();
    const notification: Notification = {
      id: randomUUID(),
      recipientId: payload.recipientId,
      actorId: payload.actorId ?? null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link ?? null,
      createdAt: now,
      readAt: null,
    };
    notifications.push(notification);
    await writeNotifications(notifications);
    return notification;
  });
};

export const markNotificationRead = async (recipientId: string, notificationId: string) => {
  return withWriteLock(async () => {
    const notifications = await readNotifications();
    const index = notifications.findIndex(
      (item) => item.id === notificationId && item.recipientId === recipientId
    );
    if (index === -1) return null;
    const existing = notifications[index];
    if (existing.readAt) return existing;
    const updated = { ...existing, readAt: new Date().toISOString() };
    notifications[index] = updated;
    await writeNotifications(notifications);
    return updated;
  });
};

export const markAllNotificationsRead = async (recipientId: string) => {
  return withWriteLock(async () => {
    const notifications = await readNotifications();
    const now = new Date().toISOString();
    let updatedCount = 0;
    const updated = notifications.map((item) => {
      if (item.recipientId === recipientId && item.readAt === null) {
        updatedCount += 1;
        return { ...item, readAt: now };
      }
      return item;
    });
    await writeNotifications(updated);
    return updatedCount;
  });
};

export const countUnreadNotifications = async (recipientId: string) => {
  const notifications = await readNotifications();
  return notifications.filter((item) => item.recipientId === recipientId && item.readAt === null)
    .length;
};
