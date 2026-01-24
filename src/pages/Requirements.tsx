import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw, ScrollText } from "lucide-react";
import { Link } from "wouter";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import { listRequirements, type RequirementSummary } from "@/lib/platformClient";

const statusLabels: Record<string, string> = {
  submitted: "已送出",
  under_review: "審查中",
  rejected: "退回",
  approved: "已核准",
  matched: "媒合中",
  converted: "已轉專案",
  draft: "草稿",
};

const statusTone: Record<string, string> = {
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  matched: "border-indigo-200 bg-indigo-50 text-indigo-700",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function Requirements() {
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [canSubmitRequirement, setCanSubmitRequirement] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const canEditRequirementDoc = accountRole === "admin" || permissions.includes("requirements.documents.manage");

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listRequirements();
      setRequirements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入需求清單。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequirements();
  }, []);

  useEffect(() => {
    const loadPermissions = async () => {
      const session = await getSession();
      setAccountRole(session?.role ?? null);
      if (!session) {
        setCanSubmitRequirement(false);
        setPermissions([]);
        return;
      }
      try {
        const permissionData = await getMyPermissions();
        setPermissions(permissionData.permissions);
        setCanSubmitRequirement(
          session.role === "admin" || permissionData.permissions.includes("requirements.create")
        );
      } catch {
        setCanSubmitRequirement(session.role === "admin");
        setPermissions([]);
      }
    };
    loadPermissions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ClipboardCheck className="h-4 w-4" />
              需求中心
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">需求提案與對齊</h1>
            <p className="text-muted-foreground">
              統一管理需求狀態、簽核流程與後續文件產出。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadRequirements}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新整理
            </button>
            {!accountRole ? (
              <Link
                href="/auth"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              >
                登入後提交需求
              </Link>
            ) : canSubmitRequirement ? (
              <Link
                href="/request"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
              >
                提交需求
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
                提交需求（無權限）
              </span>
            )}
          </div>
        </div>

        {accountRole && !canSubmitRequirement ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            目前角色無法提交需求，請洽管理者調整權限。
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-2xl font-bold">需求列表</h2>
            </div>
            <span className="text-xs text-muted-foreground">共 {requirements.length} 筆</span>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              正在載入需求清單...
            </div>
          ) : requirements.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              尚無需求資料，請先提交需求。
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {requirements.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.companyName || "未提供公司"}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusTone[item.status] ?? "border-primary/20 bg-primary/10 text-primary"
                      }`}
                    >
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {item.projectType ? <span className="rounded-full border px-3 py-1">{item.projectType}</span> : null}
                    {item.budgetRange ? <span className="rounded-full border px-3 py-1">{item.budgetRange}</span> : null}
                    {item.timeline ? <span className="rounded-full border px-3 py-1">{item.timeline}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>建立：{item.createdAt}</span>
                    <span>更新：{item.updatedAt}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/documents?requirement=${item.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      {canEditRequirementDoc ? "查看 / 編輯文件" : "查看文件"}
                    </Link>
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
