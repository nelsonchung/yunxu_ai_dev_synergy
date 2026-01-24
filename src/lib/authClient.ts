export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: "customer" | "developer" | "admin";
  status: "pending" | "active" | "suspended";
};

const resolveApiHost = () => {
  if (typeof window === "undefined") return "localhost";
  return window.location.hostname;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? `http://${resolveApiHost()}:8787`;
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? "8000");
const EVENT_NAME = "yunxu-auth-session";

const notifySessionChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
};

export const onSessionChange = (handler: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
};

export const apiRequest = async <T>(path: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const { headers, ...rest } = options;
    const hasBody = typeof options.body !== "undefined";
    const mergedHeaders: Record<string, string> = {
      ...(headers as Record<string, string> | undefined),
    };
    if (hasBody && !("Content-Type" in mergedHeaders)) {
      mergedHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: mergedHeaders,
      signal: controller.signal,
      ...rest,
    });

    const data = (await response.json().catch(() => ({}))) as T & { message?: string };
    if (!response.ok) {
      throw new Error(data?.message ?? "請求失敗，請稍後再試。");
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("連線逾時，請確認後端服務是否啟動。");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const registerAccount = async (payload: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}) => {
  const data = await apiRequest<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  notifySessionChange();
  return data.user;
};

export const loginAccount = async (payload: { identifier: string; password: string }) => {
  const data = await apiRequest<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  notifySessionChange();
  return data.user;
};

export const logoutAccount = async () => {
  await apiRequest("/auth/logout", { method: "POST" });
  notifySessionChange();
};

export const getSession = async () => {
  try {
    const data = await apiRequest<{ user: AuthUser | null }>("/auth/me", { method: "GET" });
    return data.user ?? null;
  } catch {
    return null;
  }
};
