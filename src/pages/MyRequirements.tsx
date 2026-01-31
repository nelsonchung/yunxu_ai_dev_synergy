import { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw } from "lucide-react";
import { Link } from "wouter";
import { getSession } from "@/lib/authClient";
import {
  approveRequirement,
  closeProject,
  getProjectDocumentQuotation,
  getProjectChecklist,
  getProjectVerificationChecklist,
  listMyRequirements,
  listProjectDocuments,
  listRequirementDocuments,
  listRequirementProjects,
  reviewProjectDocument,
  reviewProjectDocumentQuotation,
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
  closed: "已結案",
};

const statusTone: Record<string, string> = {
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  under_review: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  matched: "border-indigo-200 bg-indigo-50 text-indigo-700",
  converted: "border-emerald-200 bg-emerald-50 text-emerald-700",
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  closed: "border-slate-200 bg-slate-50 text-slate-600",
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

const quotationStatusLabels: Record<string, string> = {
  draft: "評估中",
  submitted: "待簽核",
  approved: "已核准",
  changes_requested: "需調整",
};

const quotationStatusTone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  changes_requested: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatPrice = (value: number) => new Intl.NumberFormat("zh-TW").format(value);

const projectStatusOrder = [
  "intake",
  "requirements_signed",
  "architecture_review",
  "system_architecture_signed",
  "software_design_review",
  "software_design_signed",
  "implementation",
  "system_verification_review",
  "system_verification_signed",
  "delivery_review",
  "closed",
] as const;

const projectStatusLabels: Record<string, string> = {
  intake: "需求受理",
  requirements_signed: "需求簽核",
  architecture_review: "架構審查",
  system_architecture_signed: "架構簽核",
  software_design_review: "設計審查",
  software_design_signed: "設計簽核",
  implementation: "實作開發",
  system_verification_review: "系統驗證審查",
  system_verification_signed: "系統驗證簽核",
  delivery_review: "交付審查",
  on_hold: "暫停中",
  canceled: "已取消",
  closed: "已結案",
};

type RequirementProgress = {
  projectId: string | null;
  projectStatus: string | null;
  projectPreviousStatus: string | null;
  checklistTotal: number;
  checklistDone: number;
  verificationChecklistTotal: number;
  verificationChecklistDone: number;
  requirementDocId: string | null;
  requirementDocStatus: string | null;
  systemDocId: string | null;
  systemDocStatus: string | null;
  softwareDocId: string | null;
  softwareDocStatus: string | null;
  testDocId: string | null;
  testDocStatus: string | null;
  deliveryDocId: string | null;
  deliveryDocStatus: string | null;
  quotationDocId: string | null;
  quotationTotal: number | null;
  quotationCurrency: string | null;
  quotationStatus: "draft" | "submitted" | "approved" | "changes_requested" | null;
  projectName: string | null;
  error?: string;
};

export default function MyRequirements() {
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, RequirementProgress>>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [isQuickAction, setIsQuickAction] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const canViewPage = userRole === "customer" || userRole === "admin";

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
      setUserRole(session?.role ?? null);
      if (session && (session.role === "customer" || session.role === "admin")) {
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
                  projectId: null,
                  projectStatus: null,
                  projectPreviousStatus: null,
                  checklistTotal: 0,
                  checklistDone: 0,
                  verificationChecklistTotal: 0,
                  verificationChecklistDone: 0,
                  requirementDocId: requirementDocs[0]?.id ?? null,
                  requirementDocStatus,
                  systemDocId: null,
                  systemDocStatus: null,
                  softwareDocId: null,
                  softwareDocStatus: null,
                  testDocId: null,
                  testDocStatus: null,
                  deliveryDocId: null,
                  deliveryDocStatus: null,
                  quotationDocId: null,
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
            const latestTest = projectDocs
              .filter((doc) => doc.type === "test")
              .sort((a, b) => b.version - a.version)[0];
            const latestDelivery = projectDocs
              .filter((doc) => doc.type === "delivery")
              .sort((a, b) => b.version - a.version)[0];

            const [quotation, checklist, verificationChecklist] = await Promise.all([
              latestSoftware
                ? getProjectDocumentQuotation(latestProject.id, latestSoftware.id)
                : Promise.resolve(null),
              getProjectChecklist(latestProject.id),
              getProjectVerificationChecklist(latestProject.id),
            ]);
            const checklistTotal = checklist?.items?.length ?? 0;
            const checklistDone = checklist?.items?.filter((item) => item.done).length ?? 0;
            const verificationChecklistTotal = verificationChecklist?.items?.length ?? 0;
            const verificationChecklistDone =
              verificationChecklist?.items?.filter((item) => item.done).length ?? 0;

            return [
              requirement.id,
              {
                projectId: latestProject.id,
                projectStatus: latestProject.status ?? null,
                projectPreviousStatus: latestProject.previousStatus ?? null,
                checklistTotal,
                checklistDone,
                verificationChecklistTotal,
                verificationChecklistDone,
                requirementDocId: requirementDocs[0]?.id ?? null,
                requirementDocStatus,
                systemDocId: latestSystem?.id ?? null,
                systemDocStatus: latestSystem?.status ?? null,
                softwareDocId: latestSoftware?.id ?? null,
                softwareDocStatus: latestSoftware?.status ?? null,
                testDocId: latestTest?.id ?? null,
                testDocStatus: latestTest?.status ?? null,
                deliveryDocId: latestDelivery?.id ?? null,
                deliveryDocStatus: latestDelivery?.status ?? null,
                quotationDocId: latestSoftware?.id ?? null,
                quotationTotal: quotation && quotation.status !== "draft" ? quotation.total : null,
                quotationCurrency: quotation && quotation.status !== "draft" ? quotation.currency : null,
                quotationStatus: quotation?.status ?? null,
                projectName: latestProject.name ?? null,
              } satisfies RequirementProgress,
            ] as const;
          } catch (err) {
            return [
              requirement.id,
              {
                projectId: null,
                projectStatus: null,
                projectPreviousStatus: null,
                checklistTotal: 0,
                checklistDone: 0,
                verificationChecklistTotal: 0,
                verificationChecklistDone: 0,
                requirementDocId: null,
                requirementDocStatus: null,
                systemDocId: null,
                systemDocStatus: null,
                softwareDocId: null,
                softwareDocStatus: null,
                testDocId: null,
                testDocStatus: null,
                deliveryDocId: null,
                deliveryDocStatus: null,
                quotationDocId: null,
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

  const renderQuotationStatus = (status: RequirementProgress["quotationStatus"]) => {
    const label = status ? quotationStatusLabels[status] ?? status : "評估中";
    const tone = status
      ? quotationStatusTone[status] ?? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-slate-200 bg-slate-50 text-slate-400";
    return (
      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
        {label}
      </span>
    );
  };

  const getProjectProgress = (status: string | null, previousStatus: string | null) => {
    if (!status) return 0;
    if (status === "canceled") return 0;
    const effective = status === "on_hold" ? previousStatus ?? status : status;
    const index = projectStatusOrder.indexOf(effective as (typeof projectStatusOrder)[number]);
    if (index < 0) return 0;
    return Math.round(((index + 1) / projectStatusOrder.length) * 100);
  };

  const getChecklistProgress = (done: number, total: number) => {
    if (!total) return 0;
    return Math.round((done / total) * 100);
  };

  const handleQuickApproveRequirement = async (requirementId: string) => {
    try {
      setIsQuickAction(true);
      await approveRequirement(requirementId, true, "");
      await loadRequirements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "需求簽核失敗。");
    } finally {
      setIsQuickAction(false);
    }
  };

  const handleQuickApproveProjectDoc = async (projectId: string, docId: string) => {
    try {
      setIsQuickAction(true);
      await reviewProjectDocument(projectId, docId, { approved: true });
      await loadRequirements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "專案文件簽核失敗。");
    } finally {
      setIsQuickAction(false);
    }
  };

  const handleQuickApproveQuotation = async (
    requirementId: string,
    projectId: string,
    docId: string
  ) => {
    try {
      setIsQuickAction(true);
      await reviewProjectDocumentQuotation(projectId, docId, { approved: true });
      setProgressMap((prev) => {
        const current = prev[requirementId];
        if (!current) return prev;
        return {
          ...prev,
          [requirementId]: {
            ...current,
            quotationStatus: "approved",
          },
        };
      });
      await loadRequirements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "報價簽核失敗。");
    } finally {
      setIsQuickAction(false);
    }
  };

  const handleAgreeClose = async (projectId: string) => {
    try {
      setIsQuickAction(true);
      await closeProject(projectId);
      await loadRequirements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "結案失敗。");
    } finally {
      setIsQuickAction(false);
    }
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
        ) : !canViewPage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <p className="font-medium">此頁面僅供客戶或管理員權限瀏覽</p>
            <p className="mt-1">
              如有需要，請透過{" "}
              <Link href="/support" className="text-primary underline hover:no-underline">
                客服中心
              </Link>{" "}
              與我們聯繫。
            </p>
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
              {requirements.map((item) => {
                const progress = progressMap[item.id];
                const canApproveRequirement =
                  progress?.requirementDocId && progress.requirementDocStatus === "pending_approval";
                const canApproveSystem =
                  progress?.projectId &&
                  progress.systemDocId &&
                  progress.systemDocStatus === "pending_approval";
                const canApproveSoftware =
                  progress?.projectId &&
                  progress.softwareDocId &&
                  progress.softwareDocStatus === "pending_approval";
                const canApproveTest =
                  progress?.projectId &&
                  progress.testDocId &&
                  progress.testDocStatus === "pending_approval";
                const canApproveDelivery =
                  progress?.projectId &&
                  progress.deliveryDocId &&
                  progress.deliveryDocStatus === "pending_approval";
                const canApproveQuotation =
                  progress?.projectId &&
                  progress.quotationDocId &&
                  progress.quotationStatus === "submitted";
                const canAgreeClose =
                  progress?.projectId &&
                  progress.deliveryDocStatus === "approved" &&
                  progress.projectStatus !== "closed";

                const hasVerificationChecklist = Boolean(progress?.verificationChecklistTotal);
                const hasChecklist = Boolean(progress?.checklistTotal);
                const developmentPercent = hasChecklist
                  ? getChecklistProgress(progress?.checklistDone ?? 0, progress?.checklistTotal ?? 0)
                  : null;
                const verificationPercent = hasVerificationChecklist
                  ? getChecklistProgress(
                      progress?.verificationChecklistDone ?? 0,
                      progress?.verificationChecklistTotal ?? 0
                    )
                  : null;
                const projectStatusPercent = getProjectProgress(
                  progress?.projectStatus ?? null,
                  progress?.projectPreviousStatus ?? null
                );
                const projectStageLabel = projectStatusLabels[progress?.projectStatus ?? ""] ?? progress?.projectStatus ?? "--";

                const displayStatus = progress?.projectStatus === "closed" ? "closed" : item.status;

                return (
                <div key={item.id} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                      <p className="text-lg font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.companyName || "未提供公司"}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusTone[displayStatus] ?? "border-primary/20 bg-primary/10 text-primary"
                      }`}
                    >
                      {statusLabels[displayStatus] ?? displayStatus}
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
                      {progressLoading && !progress ? (
                        <span className="text-muted-foreground">載入中...</span>
                      ) : null}
                    </div>

                    {progress?.error ? (
                      <div className="text-xs text-rose-600">{progress?.error}</div>
                    ) : (
                      <>
                        <div className="text-xs text-muted-foreground">
                          專案：{progress?.projectName ?? "尚未建立"}
                        </div>
                        {progress?.projectStatus ? (
                          <div className="text-xs text-muted-foreground">
                            階段：{projectStageLabel}
                          </div>
                        ) : null}
                        {hasChecklist ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                開發進度：完成 {progress?.checklistDone ?? 0}/{progress?.checklistTotal ?? 0}
                              </span>
                              <span>{developmentPercent ?? 0}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${developmentPercent ?? 0}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        {hasVerificationChecklist ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                系統驗證進度：完成 {progress?.verificationChecklistDone ?? 0}/{progress?.verificationChecklistTotal ?? 0}
                              </span>
                              <span>{verificationPercent ?? 0}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${verificationPercent ?? 0}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        {!hasChecklist && !hasVerificationChecklist && progress?.projectStatus ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>專案進度：{projectStageLabel}</span>
                              <span>{projectStatusPercent}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${projectStatusPercent}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">需求簽核</span>
                            {renderDocStatus(progress?.requirementDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">系統架構簽核</span>
                            {renderDocStatus(progress?.systemDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">軟體設計簽核</span>
                            {renderDocStatus(progress?.softwareDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">系統驗證簽核</span>
                            {renderDocStatus(progress?.testDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">使用說明簽核</span>
                            {renderDocStatus(progress?.deliveryDocStatus ?? null)}
                          </div>
                          <div className="flex items-center justify-between rounded-lg border bg-white px-2 py-1 text-xs">
                            <span className="text-muted-foreground">報價</span>
                            <div className="flex items-center gap-2">
                              {renderQuotationStatus(progress?.quotationStatus ?? null)}
                              <span className="font-semibold text-foreground">
                                {progress?.quotationStatus && progress?.quotationStatus !== "draft"
                                  ? `NT$ ${formatPrice(progress?.quotationTotal ?? 0)}`
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-dashed p-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">快速簽核</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickApproveRequirement(item.id)}
                        disabled={!canApproveRequirement || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核需求
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          progress?.projectId && progress.systemDocId
                            ? handleQuickApproveProjectDoc(progress.projectId, progress.systemDocId)
                            : undefined
                        }
                        disabled={!canApproveSystem || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核系統架構
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          progress?.projectId && progress.softwareDocId
                            ? handleQuickApproveProjectDoc(progress.projectId, progress.softwareDocId)
                            : undefined
                        }
                        disabled={!canApproveSoftware || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核軟體設計
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          progress?.projectId && progress.testDocId
                            ? handleQuickApproveProjectDoc(progress.projectId, progress.testDocId)
                            : undefined
                        }
                        disabled={!canApproveTest || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核系統驗證
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          progress?.projectId && progress.deliveryDocId
                            ? handleQuickApproveProjectDoc(progress.projectId, progress.deliveryDocId)
                            : undefined
                        }
                        disabled={!canApproveDelivery || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核使用說明
                      </button>
                      {progress?.projectId &&
                      (progress.deliveryDocStatus === "approved" || progress.projectStatus === "closed") ? (
                        <button
                          type="button"
                          onClick={() =>
                            progress.projectId ? handleAgreeClose(progress.projectId) : undefined
                          }
                          disabled={!canAgreeClose || isQuickAction}
                          className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          同意結案
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          progress?.projectId && progress.quotationDocId
                            ? handleQuickApproveQuotation(
                                item.id,
                                progress.projectId,
                                progress.quotationDocId
                              )
                            : undefined
                        }
                        disabled={!canApproveQuotation || isQuickAction}
                        className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        簽核報價
                      </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      需要提出修改時請進入詳情頁。
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/my/requirements/${item.id}?tab=documents`}
                      className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      查看詳情
                    </Link>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
