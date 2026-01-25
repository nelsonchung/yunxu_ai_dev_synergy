import { apiRequest } from "@/lib/authClient";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

const EVENT_NAME = "yunxu-notifications";

export const onNotificationsChange = (handler: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};

export const notifyNotificationsChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

export const listNotifications = async (status?: "unread") => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const data = await apiRequest<{ notifications: NotificationItem[] }>(
    `/api/notifications${query}`,
    { method: "GET" }
  );
  return data.notifications;
};

export const getUnreadNotificationCount = async () => {
  const data = await apiRequest<{ count: number }>("/api/notifications/unread-count", {
    method: "GET",
  });
  return data.count;
};

export const markNotificationRead = async (notificationId: string) => {
  await apiRequest(`/api/notifications/${notificationId}/read`, { method: "POST" });
  notifyNotificationsChange();
};

export const markAllNotificationsRead = async () => {
  const data = await apiRequest<{ updated: number }>("/api/notifications/read-all", {
    method: "POST",
  });
  notifyNotificationsChange();
  return data.updated;
};
