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

const resolveApiHost = () => {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? `http://${resolveApiHost()}:8787`;
const WS_BASE = API_BASE.replace(/^http/i, "ws");

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let shouldReconnect = false;

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

const scheduleReconnect = () => {
  if (!shouldReconnect || typeof window === "undefined") return;
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connectNotificationsSocket();
  }, 3000);
};

export const connectNotificationsSocket = () => {
  if (typeof window === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  shouldReconnect = true;
  const url = `${WS_BASE}/api/notifications/ws`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    notifyNotificationsChange();
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as { type?: string };
      if (data.type?.startsWith("notifications.")) {
        notifyNotificationsChange();
      }
    } catch {
      notifyNotificationsChange();
    }
  };

  socket.onerror = () => {
    socket?.close();
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
};

export const disconnectNotificationsSocket = () => {
  shouldReconnect = false;
  if (typeof window !== "undefined" && reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
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
