import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import { getSession } from "@/lib/authClient";
import {
  getProjectDocumentQuotation,
  listMyRequirements,
  listProjectDocuments,
  listRequirementDocuments,
  listRequirementProjects,
  type RequirementSummary,
} from "@/lib/platformClient";

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

const docStatusLabels: Record<string, string> = {
  draft: "草稿",
  pending_approval: "待簽核",
  approved: "已核准",
  archived: "已封存",
};

const docStatusTone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending_approval: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

const formatPrice = (value: number) => new Intl.NumberFormat("zh-TW").format(value);

type RequirementProgress = {
  requirementDocStatus: string | null;
  systemDocStatus: string | null;
  softwareDocStatus: string | null;
  quotationTotal: number | null;
  quotationCurrency: string | null;
  quotationStatus: "draft" | "submitted" | null;
  projectName: string | null;
  error?: string;
};

export default function MyRequirements() {
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, RequirementProgress>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await listMyRequirements();
      setRequirements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入需求清單。");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setIsLoggedIn(Boolean(session));
      if (session) {
        loadRequirements();
      }
    };
    syncSession();
  }, []);

  useEffect(() => {
    if (!requirements.length || !isLoggedIn) {
      setProgressMap({});
      return;
    }

    let active = true;

    const loadProgress = async () => {
      setProgressLoading(true);
      const entries = await Promise.all(
        requirements.map(async (requirement) => {
          try {
            const [requirementDocs, projects] = await Promise.all([
              listRequirementDocuments(requirement.id),
              listRequirementProjects(requirement.id),
            ]);

            const requirementDocStatus = requirementDocs[0]?.status ?? null;
            const latestProject =
              projects.length === 0
                ? null
                : projects.reduce((latest, current) =>
                    latest && latest.updatedAt > current.updatedAt ? latest : current
                  );

            if (!latestProject) {
              return [
                requirement.id,
                {
                  requirementDocStatus,
                  systemDocStatus: null,
                  softwareDocStatus: null,
                  quotationTotal: null,
                  quotationCurrency: null,
                  quotationStatus: null,
                  projectName: null,
                } satisfies RequirementProgress,
              ] as const;
            }

            const projectDocs = await listProjectDocuments(latestProject.id);
            const latestSystem = projectDocs
              .filter((doc) => doc.type === "system")
              .sort((a, b) => b.version - a.version)[0];
            const latestSoftware = projectDocs
              .filter((doc) => doc.type === "software")
              .sort((a, b) => b.version - a.version)[0];

            const quotation = latestSoftware
              ? await getProjectDocumentQuotation(latestProject.id, latestSoftware.id)
              : null;

            return [
              requirement.id,
              {
                requirementDocStatus,
                systemDocStatus: latestSystem?.status ?? null,
                softwareDocStatus: latestSoftware?.status ?? null,
                quotationTotal: quotation?.status === "submitted" ? quotation.total : null,
                quotationCurrency: quotation?.status === "submitted" ? quotation.currency : null,
                quotationStatus: quotation?.status ?? null,
                projectName: latestProject.name ?? null,
              } satisfies RequirementProgress,
            ] as const;
          } catch (err) {
            return [
              requirement.id,
              {
                requirementDocStatus: null,
                systemDocStatus: null,
                softwareDocStatus: null,
                quotationTotal: null,
                quotationCurrency: null,
                quotationStatus: null,
                projectName: null,
                error: err instanceof Error ? err.message : "無法載入專案狀況。",
              } satisfies RequirementProgress,
            ] as const;
          }
        })
      );

      if (!active) return;
      setProgressMap(Object.fromEntries(entries));
      setProgressLoading(false);
    };

    loadProgress();

    return () => {
      active = false;
    };
  }, [requirements, isLoggedIn]);

  const renderDocStatus = (status: string | null) => {
    const label = status ? docStatusLabels[status] ?? status : "尚未建立";
    const tone = status
      ? docStatusTone[status] ?? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-slate-200 bg-slate-50 text-slate-400";
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ClipboardCheck className="h-4 w-4" />
              我的需求
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">需求追蹤與協作</h1>
            <p className="text-muted-foreground">
              集中查看你提出的需求狀態、文件與後續進度。
            </p>
          </div>
          <button
            type="button"
            onClick={loadRequirements}
            disabled={!isLoggedIn}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            請先登入後查看你的需求列表。
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-bold">需求列表</h2>
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

                  <div className="rounded-xl border bg-secondary/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-semibold text-foreground">專案狀況</p>
                      {progressLoading && !progressMap[item.id] ? (
                        <span className="text-muted-foreground">載入中...</span>
                      ) : null}
                    </div>

                    {progressMap[item.id]?.error ? (
                      <div className="text-xs text-rose-600">{progressMap[item.id]?.error}</div>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground">
                          專案：{progressMap[item.id]?.projectName ?? "尚未建立"}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">需求簽核</span>
                            {renderDocStatus(progressMap[item.id]?.requirementDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">系統架構簽核</span>
                            {renderDocStatus(progressMap[item.id]?.systemDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">軟體設計簽核</span>
                            {renderDocStatus(progressMap[item.id]?.softwareDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">報價</span>
                            <span className="font-semibold text-foreground">
                              {progressMap[item.id]?.quotationStatus !== "submitted"
                                ? "評估中"
                                : `NT$ ${formatPrice(progressMap[item.id]?.quotationTotal ?? 0)}`}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/my/requirements/${item.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      查看詳情
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
