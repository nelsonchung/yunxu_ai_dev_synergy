import { useEffect, useState } from "react";
import { ClipboardList, RefreshCcw, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/authClient";
import { listUsers, type AdminUser } from "@/lib/adminClient";
import { listAuditLogs, type AuditLog } from "@/lib/platformClient";

const actionLabels: Record<string, string> = {
  ROLE_CHANGED: "更新使用者角色",
  STATUS_CHANGED: "更新使用者狀態",
  PASSWORD_RESET: "重設使用者密碼",
  USER_DELETED: "刪除使用者",
  ROLE_PERMISSIONS_UPDATED: "更新角色權限",
  PROJECT_CREATED: "建立專案",
  PROJECT_STATUS_UPDATED: "更新專案狀態",
  PROJECT_DOCUMENT_CREATED: "新增專案文件",
  PROJECT_DOCUMENT_REVIEWED: "簽核專案文件",
  PROJECT_DOCUMENT_DELETED: "刪除專案文件",
  PROJECT_DELETED: "刪除專案",
  PROJECT_DOCUMENT_QUOTATION_UPDATED: "更新報價內容",
  PROJECT_DOCUMENT_QUOTATION_SUBMITTED: "提交報價",
  PROJECT_DOCUMENT_QUOTATION_REVIEWED: "審核報價",
  PROJECT_CHECKLIST_ITEM_UPDATED: "更新開發清單項目",
  PROJECT_VERIFICATION_CHECKLIST_ITEM_UPDATED: "更新系統驗證清單項目",
  REQUIREMENT_DOCUMENT_CREATED: "新增需求文件",
  REQUIREMENT_APPROVED: "需求簽核同意",
  REQUIREMENT_REJECTED: "需求退回",
  REQUIREMENT_DOCUMENT_COMMENTED: "需求文件留言",
  REQUIREMENT_DOCUMENT_DELETED: "刪除需求文件",
  REQUIREMENT_DELETED: "刪除需求",
  MATCHING_EVALUATED: "媒合估工",
  MATCHING_ASSIGNED: "指派媒合團隊",
  TASK_CREATED: "建立任務",
  TASK_UPDATED: "更新任務",
  MILESTONE_CREATED: "建立里程碑",
  MILESTONE_UPDATED: "更新里程碑",
  TESTING_GENERATED: "產生測試文件",
  CODE_REVIEW_REQUESTED: "提交 code review",
};

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const getUserLabel = (userId: string | null) => {
    if (!userId) return "系統";
    const user = users.find((item) => item.id === userId);
    if (!user) return userId;
    const roleLabel =
      user.role === "admin" ? "管理員" : user.role === "developer" ? "開發者" : "客戶";
    return `${roleLabel}｜${user.username || user.email}`;
  };

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
              placeholder="操作者 ID"
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
                    <p className="font-semibold">{actionLabels[log.action] ?? log.action}</p>
                    <span className="text-xs text-muted-foreground">{log.createdAt}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">代碼：{log.action}</p>
                  <p className="text-xs text-muted-foreground">操作者：{getUserLabel(log.actorId)}</p>
                  <p className="text-xs text-muted-foreground">對象：{getUserLabel(log.targetUserId)}</p>
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
