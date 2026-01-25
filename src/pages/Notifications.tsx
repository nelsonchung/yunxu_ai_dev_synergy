import { useEffect, useState } from "react";
import { Bell, CheckCircle2, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/notificationsClient";

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入通知清單。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const handleMarkRead = async (notificationId: string) => {
    try {
      setError("");
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "標記已讀失敗。");
    }
  };

  const handleMarkAll = async () => {
    try {
      setError("");
      setStatus("正在更新通知狀態...");
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() }))
      );
      setStatus("已標記全部已讀。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新通知失敗。");
      setStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <Bell className="h-4 w-4" />
              訊息中心
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">最新通知</h1>
            <p className="text-muted-foreground">追蹤需求與專案狀態更新、文件簽核與回覆。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadNotifications}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新整理
            </button>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={notifications.length === 0 || unreadCount === 0}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              全部標記已讀
            </button>
          </div>
        </div>

        {(error || status) && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold">通知列表</h2>
              {unreadCount > 0 ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  未讀 {unreadCount}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-muted-foreground">共 {notifications.length} 筆</span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              正在載入通知...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              目前沒有通知。
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 space-y-2 ${
                    item.readAt ? "bg-white/90" : "border-primary/40 bg-primary/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">{item.createdAt}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.link ? (
                      <Link
                        href={item.link}
                        className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 font-semibold text-primary hover:bg-primary/10 transition"
                        onClick={() => {
                          if (!item.readAt) {
                            void handleMarkRead(item.id);
                          }
                        }}
                      >
                        查看詳情
                      </Link>
                    ) : null}
                    {!item.readAt ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(item.id)}
                        className="inline-flex items-center justify-center rounded-full border border-emerald-200 px-3 py-1 font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                      >
                        標記已讀
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">已讀</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
