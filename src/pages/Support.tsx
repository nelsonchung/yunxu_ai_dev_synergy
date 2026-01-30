import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { MessageSquare, RefreshCcw } from "lucide-react";
import { getSession } from "@/lib/authClient";
import {
  listSupportMessages,
  listSupportThreads,
  sendSupportMessage,
  type SupportMessage,
  type SupportThread,
} from "@/lib/platformClient";
import { onNotificationsChange } from "@/lib/notificationsClient";

const roleLabels: Record<string, string> = {
  customer: "客戶",
  developer: "開發者",
  admin: "管理員",
};

const formatUserLabel = (thread: SupportThread | null) => {
  if (!thread?.user) return `使用者 #${thread?.threadId?.slice(0, 8) ?? "--"}`;
  const roleLabel = roleLabels[thread.user.role] ?? thread.user.role;
  const name = thread.user.username || thread.user.email;
  return `${roleLabel}「${name}」`;
};

export default function Support() {
  const [sessionId, setSessionId] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = role === "admin";

  const loadMessages = async (threadId?: string) => {
    const id = isAdmin ? threadId ?? selectedThreadId : undefined;
    if (isAdmin && !id) return;
    const data = await listSupportMessages(id);
    setMessages(data);
  };

  const loadThreads = async (preferredThreadId?: string) => {
    const data = await listSupportThreads();
    setThreads(data);
    if (data.length === 0) {
      setSelectedThreadId("");
      setMessages([]);
      return;
    }
    const target = preferredThreadId || selectedThreadId || data[0]?.threadId || "";
    if (target && target !== selectedThreadId) {
      setSelectedThreadId(target);
      await loadMessages(target);
    } else if (target) {
      await loadMessages(target);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setStatus("");
    setError("");
    try {
      if (isAdmin) {
        await loadThreads();
      } else {
        await loadMessages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入客服訊息。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setIsLoggedIn(Boolean(session));
      setSessionId(session?.id ?? "");
      setRole(session?.role ?? null);
      if (session) {
        if (session.role === "admin") {
          const params = new URLSearchParams(window.location.search);
          const thread = params.get("thread") ?? "";
          await loadThreads(thread || undefined);
        } else {
          await loadMessages();
        }
      }
    };
    syncSession();
  }, []);

  useEffect(() => {
    const unsubscribe = onNotificationsChange(() => {
      if (!isLoggedIn) return;
      if (isAdmin) {
        loadThreads();
      } else {
        loadMessages();
      }
    });
    return () => unsubscribe();
  }, [isLoggedIn, isAdmin, selectedThreadId]);

  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    setStatus("");
    setError("");
    try {
      await loadMessages(threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入客服訊息。");
    }
  };

  const handleSend = async () => {
    if (!draft.trim()) {
      setError("請輸入訊息內容。");
      return;
    }
    if (isAdmin && !selectedThreadId) {
      setError("請先選擇對話對象。");
      return;
    }
    try {
      setStatus("送出中...");
      setError("");
      await sendSupportMessage({
        message: draft.trim(),
        threadId: isAdmin ? selectedThreadId : undefined,
      });
      setDraft("");
      if (isAdmin) {
        await loadThreads(selectedThreadId);
      } else {
        await loadMessages();
      }
      setStatus("訊息已送出。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送出訊息失敗。");
      setStatus("");
    }
  };

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <MessageSquare className="h-4 w-4" />
              客服中心
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">即時客服訊息</h1>
            <p className="text-muted-foreground">與管理員保持即時溝通，掌握每一則回覆。</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={!isLoggedIn || isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            請先登入後使用客服中心。
            <Link href="/auth" className="ml-2 underline">
              前往登入
            </Link>
          </div>
        ) : null}

        {(error || status) && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || status}
          </div>
        )}

        <div className={`grid gap-6 ${isAdmin ? "lg:grid-cols-[0.35fr_0.65fr]" : ""}`}>
          {isAdmin ? (
            <div className="rounded-3xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">對話列表</p>
                <span className="text-xs text-muted-foreground">共 {threads.length} 筆</span>
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    尚無客服訊息。
                  </div>
                ) : (
                  threads.map((thread) => (
                    <button
                      key={thread.threadId}
                      type="button"
                      onClick={() => handleSelectThread(thread.threadId)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                        selectedThreadId === thread.threadId
                          ? "border-primary bg-primary/10"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{formatUserLabel(thread)}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{thread.lastMessage}</p>
                      <p className="text-[11px] text-muted-foreground">更新：{thread.lastAt}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">
                {isAdmin ? (selectedThread ? formatUserLabel(selectedThread) : "請選擇對話") : "客服對話"}
              </p>
              <span className="text-xs text-muted-foreground">共 {messages.length} 則</span>
            </div>
            <div className="rounded-2xl border bg-white/80 p-4 space-y-3 max-h-[420px] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center">
                  尚無訊息，開始留言給客服吧。
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = isAdmin ? message.senderRole === "admin" : message.senderId === sessionId;
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          isMine ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-line">{message.message}</p>
                        <p className={`mt-1 text-[10px] ${isMine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {message.createdAt}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isAdmin ? "輸入回覆內容" : "輸入訊息給客服"}
                rows={3}
                disabled={!isLoggedIn || (isAdmin && !selectedThreadId)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!isLoggedIn || (isAdmin && !selectedThreadId)}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  送出訊息
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
