import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  approveRequirement,
  commentRequirementDocument,
  getProjectDocumentQuotation,
  listMilestones,
  listMyRequirements,
  listProjectDocuments,
  listProjectsByRequirement,
  listQualityReports,
  listRequirementDocuments,
  listTasks,
  reviewProjectDocumentQuotation,
  reviewProjectDocument,
  type Milestone,
  type ProjectDocumentSummary,
  type ProjectSummary,
  type QualityReport,
  type QuotationReview,
  type RequirementDocumentSummary,
  type RequirementSummary,
  type Task,
} from "@/lib/platformClient";

const tabs = [
  { id: "project", label: "專案概況", icon: LayoutGrid },
  { id: "documents", label: "文件與簽核", icon: FileText },
  { id: "collaboration", label: "協作細節", icon: ClipboardList },
  { id: "quality", label: "品質交付", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

const statusLabels: Record<string, string> = {
  submitted: "已送出",
  under_review: "審查中",
  rejected: "退回",
  approved: "已核准",
  matched: "媒合中",
  converted: "已轉專案",
  draft: "草稿",
};

const projectStatusLabels: Record<string, string> = {
  intake: "需求受理",
  requirements_signed: "需求簽核",
  architecture_review: "架構審查",
  system_architecture_signed: "架構簽核",
  software_design_review: "設計審查",
  software_design_signed: "設計簽核",
  implementation: "實作開發",
  system_verification: "系統驗證",
  system_verification_signed: "系統驗證簽核",
  delivery_review: "交付審查",
  on_hold: "暫停中",
  canceled: "已取消",
  closed: "已結案",
};

const documentStatusLabels: Record<string, string> = {
  draft: "草稿",
  pending_approval: "待簽核",
  approved: "已核准",
  archived: "已封存",
};

const docTypeLabels: Record<string, string> = {
  requirement: "需求",
  system: "系統架構",
  software: "軟體設計",
  test: "測試",
  delivery: "交付",
};

const quotationStatusLabels: Record<string, string> = {
  draft: "評估中",
  submitted: "待你審核",
  approved: "已核准",
  changes_requested: "已要求調整",
};

const formatPrice = (value: number) => new Intl.NumberFormat("zh-TW").format(value);

export default function RequirementDetailTabs() {
  const [match, params] = useRoute("/my/requirements/:id");
  const requirementId = match ? params?.id ?? "" : "";

  const [activeTab, setActiveTab] = useState<TabId>("project");
  const [requirement, setRequirement] = useState<RequirementSummary | null>(null);
  const [requirementDocs, setRequirementDocs] = useState<RequirementDocumentSummary[]>([]);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [projectDocs, setProjectDocs] = useState<ProjectDocumentSummary[]>([]);
  const [quotation, setQuotation] = useState<QuotationReview | null>(null);
  const [quotationDoc, setQuotationDoc] = useState<ProjectDocumentSummary | null>(null);
  const [quotationComment, setQuotationComment] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewingQuotation, setIsReviewingQuotation] = useState(false);

  const canReviewRequirementDocs = permissions.includes("requirements.documents.review");
  const canReviewProjectDocs = permissions.includes("projects.documents.review");

  const latestRequirementDocId = requirementDocs[0]?.id ?? null;

  const formatProjectStatus = (item: ProjectSummary | null) => {
    if (!item) return "--";
    const label = projectStatusLabels[item.status] ?? item.status;
    if (item.status === "on_hold" && item.previousStatus) {
      const previous = projectStatusLabels[item.previousStatus] ?? item.previousStatus;
      return `${label}（原：${previous}）`;
    }
    return label;
  };

  const loadData = async () => {
    if (!requirementId) return;
    setStatus("");
    setError("");

    try {
      const session = await getSession();
      setIsLoggedIn(Boolean(session));
      if (!session) {
        setPermissions([]);
        return;
      }

      try {
        const permissionData = await getMyPermissions();
        setPermissions(permissionData.permissions);
      } catch {
        setPermissions([]);
      }

      const [myRequirements, projects] = await Promise.all([
        listMyRequirements(),
        listProjectsByRequirement(requirementId),
      ]);

      const ownedRequirement = myRequirements.find((item) => item.id === requirementId);
      if (!ownedRequirement) {
        setRequirement(null);
        setError("找不到你的需求資料。");
        return;
      }
      setRequirement(ownedRequirement);

      const docs = await listRequirementDocuments(requirementId);
      setRequirementDocs(docs);

      const matchedProject = projects.find((item) => item.requirementId === requirementId) ?? null;
      setProject(matchedProject);

      if (matchedProject) {
        const [projectDocsData, taskData, milestoneData, qualityData] = await Promise.all([
          listProjectDocuments(matchedProject.id),
          listTasks(matchedProject.id),
          listMilestones(matchedProject.id),
          listQualityReports(matchedProject.id),
        ]);
        setProjectDocs(projectDocsData);
        setTasks(taskData);
        setMilestones(milestoneData);
        setQualityReports(qualityData);

        const latestSoftware = projectDocsData
          .filter((doc) => doc.type === "software")
          .sort((a, b) => b.version - a.version)[0];
        setQuotationDoc(latestSoftware ?? null);
        if (latestSoftware) {
          try {
            const quote = await getProjectDocumentQuotation(matchedProject.id, latestSoftware.id);
            setQuotation(quote);
          } catch (err) {
            setQuotation(null);
          }
        } else {
          setQuotation(null);
        }
      } else {
        setProjectDocs([]);
        setTasks([]);
        setMilestones([]);
        setQualityReports([]);
        setQuotation(null);
        setQuotationDoc(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入需求詳情。");
    }
  };

  useEffect(() => {
    loadData();
  }, [requirementId]);

  const handleApproveRequirement = async (docId: string) => {
    if (!requirementId) return;
    if (!canReviewRequirementDocs) {
      setError("目前角色無法簽核需求文件。");
      return;
    }
    const comment = commentDrafts[docId] ?? "";
    try {
      setIsSaving(true);
      await approveRequirement(requirementId, true, comment.trim());
      setStatus("需求文件已核准。");
      setCommentDrafts((prev) => ({ ...prev, [docId]: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "簽核失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommentRequirement = async (docId: string) => {
    if (!requirementId) return;
    if (!canReviewRequirementDocs) {
      setError("目前角色無法留言需求文件。");
      return;
    }
    const comment = commentDrafts[docId] ?? "";
    if (!comment.trim()) {
      setError("請輸入留言內容。");
      return;
    }
    try {
      setIsSaving(true);
      await commentRequirementDocument(requirementId, docId, comment.trim());
      setStatus("已送出留言。");
      setCommentDrafts((prev) => ({ ...prev, [docId]: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "留言失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewProjectDoc = async (docId: string, approved: boolean) => {
    if (!project) return;
    if (!canReviewProjectDocs) {
      setError("目前角色無法簽核專案文件。");
      return;
    }
    const comment = commentDrafts[docId] ?? "";
    try {
      setIsSaving(true);
      await reviewProjectDocument(project.id, docId, {
        approved,
        comment: comment.trim() || undefined,
      });
      setStatus(approved ? "專案文件已核准。" : "已送出修改意見。");
      setCommentDrafts((prev) => ({ ...prev, [docId]: "" }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "簽核失敗。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReviewQuotation = async (approved: boolean) => {
    if (!project || !quotationDoc) return;
    if (!canReviewProjectDocs) {
      setError("目前角色無法審核報價。");
      return;
    }
    if (!approved && !quotationComment.trim()) {
      setError("請輸入修改建議。");
      return;
    }
    try {
      setIsReviewingQuotation(true);
      await reviewProjectDocumentQuotation(project.id, quotationDoc.id, {
        approved,
        comment: quotationComment.trim() || undefined,
      });
      setStatus(approved ? "報價已簽核。" : "已送出修改建議。");
      setQuotationComment("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "審核報價失敗。");
    } finally {
      setIsReviewingQuotation(false);
    }
  };

  const updateCommentDraft = (docId: string, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [docId]: value }));
  };

  const activeLabel = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.label ?? "";
  }, [activeTab]);

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
        <section className="container py-12">
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            找不到需求資訊。
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" />
              客戶視角 · 需求詳情
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              {requirement?.title ?? "需求詳情"}
            </h1>
            <p className="text-muted-foreground">
              需求編號 {requirementId} · 更新 {requirement?.updatedAt ?? "--"}
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
            <div className="text-sm text-muted-foreground">
              狀態：{statusLabels[requirement?.status ?? ""] ?? requirement?.status ?? "--"}
            </div>
            <div className="text-sm text-muted-foreground">對接團隊：{project?.name ?? "尚未媒合"}</div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <RefreshCcw className="mr-1 h-4 w-4" />
              重新整理
            </button>
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            請先登入後查看需求詳情。
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

        <div className="rounded-3xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-primary hover:border-primary/40"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{activeLabel}</p>
          </div>

          {activeTab === "project" ? (
            <div className="space-y-3">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">目前階段</p>
                  <p className="mt-2 text-lg font-semibold">{formatProjectStatus(project)}</p>
                </div>
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">專案編號</p>
                  <p className="mt-2 text-lg font-semibold">{project?.id ?? "尚未建立"}</p>
                </div>
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">需求狀態</p>
                  <p className="mt-2 text-lg font-semibold">
                    {statusLabels[requirement?.status ?? ""] ?? requirement?.status ?? "--"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                文件簽核由你在此頁完成；簽核後請由開發者到「專案工作台」推進下一階段。
              </p>
            </div>
          ) : null}

          {activeTab === "documents" ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
                這裡是客戶簽核入口：請先簽核需求文件，再依序簽核系統架構、軟體設計、測試與交付文件。
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">需求文件</p>
                  <Link
                    href={`/editor?kind=requirement&requirement=${requirementId}${latestRequirementDocId ? `&doc=${latestRequirementDocId}` : ""}`}
                    className="text-xs font-semibold text-primary hover:text-primary/80"
                  >
                    前往編輯器
                  </Link>
                </div>
                {requirementDocs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    尚無需求文件。
                  </div>
                ) : (
                  requirementDocs.map((doc) => (
                    <div key={doc.id} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">版本 v{doc.version}</p>
                          <p className="text-lg font-semibold">需求文件</p>
                          <p className="text-xs text-muted-foreground">更新：{doc.updatedAt}</p>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {documentStatusLabels[doc.status] ?? doc.status}
                        </span>
                      </div>
                      <textarea
                        value={commentDrafts[doc.id] ?? ""}
                        onChange={(event) => updateCommentDraft(doc.id, event.target.value)}
                        placeholder="留下簽核或修改意見"
                        rows={2}
                        disabled={!canReviewRequirementDocs}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/editor?kind=requirement&requirement=${requirementId}&doc=${doc.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                        >
                          開啟編輯器
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleApproveRequirement(doc.id)}
                          disabled={!canReviewRequirementDocs || isSaving || doc.id !== latestRequirementDocId}
                          className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          簽核同意
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommentRequirement(doc.id)}
                          disabled={!canReviewRequirementDocs || isSaving}
                          className="inline-flex items-center justify-center rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          提出修改
                        </button>
                      </div>
                      {doc.reviewComment ? (
                        <p className="text-xs text-muted-foreground">最新留言：{doc.reviewComment}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">專案文件</p>
                </div>
                {project ? (
                  projectDocs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      尚無專案文件。
                    </div>
                  ) : (
                    projectDocs.map((doc) => (
                      <div key={doc.id} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {docTypeLabels[doc.type] ?? doc.type} · v{doc.version}
                            </p>
                            <p className="text-lg font-semibold">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">更新：{doc.updatedAt}</p>
                          </div>
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {documentStatusLabels[doc.status] ?? doc.status}
                          </span>
                        </div>
                        <textarea
                          value={commentDrafts[doc.id] ?? ""}
                          onChange={(event) => updateCommentDraft(doc.id, event.target.value)}
                          placeholder="留下簽核或修改意見"
                          rows={2}
                          disabled={!canReviewProjectDocs}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/editor?kind=project&project=${project.id}&doc=${doc.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                          >
                            開啟編輯器
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleReviewProjectDoc(doc.id, true)}
                            disabled={!canReviewProjectDocs || isSaving}
                            className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            簽核同意
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewProjectDoc(doc.id, false)}
                            disabled={!canReviewProjectDocs || isSaving}
                            className="inline-flex items-center justify-center rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            提出修改
                          </button>
                        </div>
                        {doc.reviewComment ? (
                          <p className="text-xs text-muted-foreground">最新留言：{doc.reviewComment}</p>
                        ) : null}
                      </div>
                    ))
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    專案尚未建立，待媒合後將提供文件。
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">報價審核</p>
                  {quotationDoc ? (
                    <span className="text-xs text-muted-foreground">
                      來源：{quotationDoc.title} v{quotationDoc.version}
                    </span>
                  ) : null}
                </div>
                {!quotationDoc ? (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    尚無軟體設計文件，報價尚未建立。
                  </div>
                ) : quotation && quotation.status !== "draft" ? (
                  <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-foreground">
                        狀態：{quotationStatusLabels[quotation.status] ?? quotation.status}
                      </span>
                      <span className="text-muted-foreground">
                        總計 NT$ {formatPrice(quotation.total)}
                      </span>
                    </div>
                    {quotation.reviewComment ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                        最新留言：{quotation.reviewComment}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {quotation.items.map((item) => (
                        <div
                          key={item.key}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-secondary/10 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="text-muted-foreground">
                              {item.h1} / {item.h2 ?? "未分類"}
                            </p>
                            <p className="font-medium text-foreground">{item.h3}</p>
                          </div>
                          <div className="font-semibold text-foreground">
                            {item.price === null ? "未填" : `NT$ ${formatPrice(item.price)}`}
                          </div>
                        </div>
                      ))}
                    </div>

                    {quotation.status === "submitted" ? (
                      <>
                        <textarea
                          value={quotationComment}
                          onChange={(event) => setQuotationComment(event.target.value)}
                          placeholder="提出修改建議（若需調整）"
                          rows={2}
                          disabled={!canReviewProjectDocs}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewQuotation(true)}
                            disabled={!canReviewProjectDocs || isReviewingQuotation}
                            className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            簽核同意
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewQuotation(false)}
                            disabled={!canReviewProjectDocs || isReviewingQuotation}
                            className="inline-flex items-center justify-center rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            提出修改
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                    報價評估中，請等待開發者提交。
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                <MessageSquare className="inline-block h-4 w-4" />  可在文件內留言，紀錄意見與回覆。
              </div>
            </div>
          ) : null}

          {activeTab === "collaboration" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                <p className="text-sm font-semibold">任務列表</p>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">尚無任務紀錄。</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <span>{task.title}</span>
                      <span className="text-xs text-muted-foreground">{task.status}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                <p className="text-sm font-semibold">里程碑</p>
                {milestones.length === 0 ? (
                  <p className="text-xs text-muted-foreground">尚無里程碑。</p>
                ) : (
                  milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between text-sm">
                      <span>{milestone.title}</span>
                      <span className="text-xs text-muted-foreground">{milestone.dueDate ?? "--"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "quality" ? (
            <div className="space-y-3">
              {qualityReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  尚無品質報告。
                </div>
              ) : (
                qualityReports.map((report) => (
                  <div key={report.id} className="rounded-2xl border bg-white/90 p-4">
                    <p className="font-semibold">{report.type}</p>
                    <p className="text-sm text-muted-foreground">{report.summary}</p>
                    <p className="mt-2 text-xs text-muted-foreground">更新：{report.updatedAt}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
