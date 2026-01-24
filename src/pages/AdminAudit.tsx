import { useEffect, useState } from "react";
import { ClipboardList, RefreshCcw, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/authClient";
import { listAuditLogs, type AuditLog } from "@/lib/platformClient";

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actorId, setActorId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const loadLogs = async () => {
    try {
      setError("");
      setStatus("載入稽核紀錄...");
      const data = await listAuditLogs({
        actorId: actorId.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(data);
      setStatus("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入稽核紀錄。");
      setStatus("");
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setIsAdmin(session?.role === "admin");
    };
    syncSession();
    loadLogs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              管理與稽核
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">稽核紀錄</h1>
            <p className="text-muted-foreground">查詢需求、媒合、品質與權限變更的稽核軌跡。</p>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            僅管理者可查看稽核紀錄。
          </div>
        ) : null}

        {(error || status) && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {error || status}
          </div>
        )}

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" />
            查詢條件
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="text"
              placeholder="Actor ID"
              value={actorId}
              onChange={(event) => setActorId(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            依條件查詢
          </button>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-serif text-2xl font-bold">稽核清單</h2>
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              尚無稽核紀錄。
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border bg-white/90 p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{log.action}</p>
                    <span className="text-xs text-muted-foreground">{log.createdAt}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Actor: {log.actorId ?? "system"}</p>
                  <p className="text-xs text-muted-foreground">Target: {log.targetUserId ?? "-"}</p>
                  {log.after ? (
                    <pre className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
{JSON.stringify(log.after, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
