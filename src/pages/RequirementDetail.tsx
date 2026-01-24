import { useEffect, useState } from "react";
import { ArrowLeft, FileText, RefreshCcw, Sparkles } from "lucide-react";
import { Link, useRoute } from "wouter";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  createProject,
  getRequirement,
  getRequirementDocument,
  listRequirementDocuments,
  type RequirementDetail,
  type RequirementDocumentSummary,
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

export default function RequirementDetail() {
  const [match, params] = useRoute("/requirements/:id");
  const requirementId = match ? params?.id ?? "" : "";
  const [requirement, setRequirement] = useState<RequirementDetail | null>(null);
  const [docMeta, setDocMeta] = useState<RequirementDocumentSummary | null>(null);
  const [docContent, setDocContent] = useState("");
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const canCreateProject =
    accountRole === "admin" || permissions.includes("projects.create");

  const loadRequirement = async () => {
    if (!requirementId) return;
    try {
      setError("");
      setStatus("載入需求內容...");
      const data = await getRequirement(requirementId);
      setRequirement(data);
      const docs = await listRequirementDocuments(requirementId);
      if (docs.length) {
        const latestDoc = docs[0];
        setDocMeta(latestDoc);
        const docData = await getRequirementDocument(requirementId, latestDoc.id);
        setDocContent(docData.content);
      } else {
        setDocMeta(null);
        setDocContent("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入需求內容。");
    } finally {
      setStatus("");
    }
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setAccountRole(session?.role ?? null);
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
    };
    syncSession();
  }, []);

  useEffect(() => {
    loadRequirement();
  }, [requirementId]);

  const handleCreateProject = async () => {
    if (!canCreateProject) {
      setError("目前角色無法建立專案，請洽管理者調整權限。");
      return;
    }
    if (!projectName.trim()) {
      setError("請輸入專案名稱。");
      return;
    }
    try {
      setError("");
      setStatus("正在建立專案...");
      await createProject({ requirementId, name: projectName.trim() });
      setProjectName("");
      setStatus("專案已建立，可前往專案工作台查看。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立專案失敗。");
      setStatus("");
    }
  };

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/requirements"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
            >
              <ArrowLeft className="h-4 w-4" />
              返回需求中心
            </Link>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              {requirement?.title ?? "需求詳情"}
            </h1>
            <p className="text-sm text-muted-foreground">
              需求編號 {requirementId} · 狀態{" "}
              {statusLabels[requirement?.status ?? ""] ?? requirement?.status ?? "--"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadRequirement}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-serif text-2xl font-bold">需求摘要</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs">公司 / 單位</p>
                <p className="mt-1 font-semibold text-foreground">
                  {requirement?.companyName || "未提供"}
                </p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs">專案類型</p>
                <p className="mt-1 font-semibold text-foreground">
                  {requirement?.projectType || "未提供"}
                </p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs">預算範圍</p>
                <p className="mt-1 font-semibold text-foreground">
                  {requirement?.budgetRange || "未提供"}
                </p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs">預計時程</p>
                <p className="mt-1 font-semibold text-foreground">
                  {requirement?.timeline || "未提供"}
                </p>
              </div>
            </div>
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs text-muted-foreground">需求背景</p>
                <p className="mt-2 whitespace-pre-wrap">{requirement?.background || "未提供"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs text-muted-foreground">專案目標</p>
                <p className="mt-2 whitespace-pre-wrap">{requirement?.goals || "未提供"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs text-muted-foreground">功能範圍</p>
                <p className="mt-2 whitespace-pre-wrap">{requirement?.scope || "未提供"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs text-muted-foreground">限制與備註</p>
                <p className="mt-2 whitespace-pre-wrap">{requirement?.constraints || "未提供"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4">
                <p className="text-xs text-muted-foreground">既有規格文件</p>
                <p className="mt-2 whitespace-pre-wrap">{requirement?.specDoc || "未提供"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-serif text-2xl font-bold">需求文件</h2>
              </div>
              {docMeta ? (
                <>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>版本 v{docMeta.version}</span>
                    <span>{docMeta.updatedAt}</span>
                  </div>
                  <div className="rounded-2xl border bg-white/90 p-4 text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap">{docContent || "尚無文件內容。"}</pre>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無需求文件。
                </div>
              )}
            </div>

            <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-3">
              <h2 className="font-serif text-xl font-bold">建立專案</h2>
              {!canCreateProject ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  目前角色無法建立專案，請洽管理者調整權限。
                </div>
              ) : null}
              <input
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="輸入專案名稱"
                disabled={!canCreateProject}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={!canCreateProject}
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                建立專案
              </button>
              <Link
                href="/workspace"
                className="inline-flex items-center justify-center rounded-full border border-primary/30 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition"
              >
                前往專案工作台
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
