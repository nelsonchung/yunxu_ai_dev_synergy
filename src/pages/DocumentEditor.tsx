import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, FilePenLine, RefreshCcw, Save } from "lucide-react";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  createProjectDocument,
  createRequirementDocument,
  getProjectDocument,
  getRequirementDocument,
  listRequirementDocuments,
} from "@/lib/platformClient";
import MarkdownEditor from "@/components/MarkdownEditor";
import QuotationReview from "@/components/QuotationReview";

const projectDocTypes = [
  { value: "requirement", label: "需求文件" },
  { value: "system", label: "系統架構文件" },
  { value: "software", label: "軟體設計文件" },
  { value: "test", label: "測試文件" },
  { value: "delivery", label: "使用說明文件" },
];

type DocKind = "requirement" | "project";

type DocMeta = {
  id: string;
  version: number;
  status: string;
  updatedAt: string;
  createdAt: string;
  title?: string;
  type?: string;
};

export default function DocumentEditor() {
  const [location] = useLocation();
  const [docKind, setDocKind] = useState<DocKind | null>(null);
  const [targetId, setTargetId] = useState("");
  const [docId, setDocId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [docMeta, setDocMeta] = useState<DocMeta | null>(null);
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [projectDocType, setProjectDocType] = useState("");
  const [projectDocTitle, setProjectDocTitle] = useState("");
  const [projectDocStatus, setProjectDocStatus] = useState("draft");
  const [versionNote, setVersionNote] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = accountRole === "admin";
  const canEditRequirementDoc = isAdmin || permissions.includes("requirements.documents.manage");
  const canEditProjectDocType = (type: string) =>
    isAdmin || permissions.includes(`projects.documents.${type}`);

  const allowedProjectDocTypes = useMemo(() => {
    return projectDocTypes.filter((item) => canEditProjectDocType(item.value));
  }, [permissions, accountRole]);
  const projectDocTypeOptions = docId ? projectDocTypes : allowedProjectDocTypes;

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
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("kind");
    const requirementId = params.get("requirement") ?? "";
    const projectId = params.get("project") ?? "";
    const docParam = params.get("doc");

    if (kind === "requirement" && requirementId) {
      setDocKind("requirement");
      setTargetId(requirementId);
      setDocId(docParam);
      setStatus("");
      setError("");
      return;
    }

    if (kind === "project" && projectId) {
      setDocKind("project");
      setTargetId(projectId);
      setDocId(docParam);
      setStatus("");
      setError("");
      return;
    }

    setDocKind(null);
    setTargetId("");
    setDocId(null);
    setError("請從文件中心進入編輯頁面。");
  }, [location]);

  useEffect(() => {
    const loadRequirementDoc = async () => {
      if (!targetId) return;
      setIsLoading(true);
      try {
        setError("");
        if (!docId) {
          const docs = await listRequirementDocuments(targetId);
          if (docs.length === 0) {
            setDocMeta(null);
            setContent("");
            return;
          }
          setDocId(docs[0].id);
          return;
        }
        const data = await getRequirementDocument(targetId, docId);
        setContent(data.content);
        setDocMeta({
          id: data.id,
          version: data.version,
          status: data.status,
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入需求文件。");
      } finally {
        setIsLoading(false);
      }
    };

    if (docKind === "requirement") {
      loadRequirementDoc();
    }
  }, [docKind, targetId, docId]);

  useEffect(() => {
    const loadProjectDoc = async () => {
      if (!targetId) return;
      setIsLoading(true);
      try {
        setError("");
        if (!docId) {
          setDocMeta(null);
          setContent("");
          if (!projectDocType && allowedProjectDocTypes.length) {
            setProjectDocType(allowedProjectDocTypes[0].value);
          }
          return;
        }
        const data = await getProjectDocument(targetId, docId);
        setContent(data.content);
        setProjectDocType(data.type);
        setProjectDocTitle(data.title);
        setProjectDocStatus(data.status);
        setDocMeta({
          id: data.id,
          version: data.version,
          status: data.status,
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
          title: data.title,
          type: data.type,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入專案文件。");
      } finally {
        setIsLoading(false);
      }
    };

    if (docKind === "project") {
      loadProjectDoc();
    }
  }, [docKind, targetId, docId, allowedProjectDocTypes]);

  useEffect(() => {
    if (docKind !== "project" || docId) return;
    if (!projectDocType && allowedProjectDocTypes.length) {
      setProjectDocType(allowedProjectDocTypes[0].value);
    }
  }, [docKind, docId, projectDocType, allowedProjectDocTypes]);

  const handleReload = async () => {
    setStatus("");
    setError("");
    try {
      if (docKind === "requirement" && targetId && docId) {
        const data = await getRequirementDocument(targetId, docId);
        setContent(data.content);
        setDocMeta({
          id: data.id,
          version: data.version,
          status: data.status,
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        });
      }
      if (docKind === "project" && targetId && docId) {
        const data = await getProjectDocument(targetId, docId);
        setContent(data.content);
        setProjectDocType(data.type);
        setProjectDocTitle(data.title);
        setProjectDocStatus(data.status);
        setDocMeta({
          id: data.id,
          version: data.version,
          status: data.status,
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
          title: data.title,
          type: data.type,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "重新載入失敗。");
    }
  };

  const handleSave = async () => {
    setStatus("");
    setError("");

    if (docKind === "requirement") {
      if (!canEditRequirementDoc) {
        setError("目前角色無法編修需求文件，請洽管理者調整權限。");
        return;
      }
      if (!content.trim()) {
        setError("請輸入需求文件內容。");
        return;
      }
      try {
        setIsSaving(true);
        const result = await createRequirementDocument(targetId, content.trim());
        setDocId(result.document_id);
        setDocMeta({
          id: result.document_id,
          version: result.version,
          status: "pending_approval",
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        setStatus(`已新增需求文件版本 v${result.version}。`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "新增需求文件失敗。");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (docKind === "project") {
      if (!projectDocType) {
        setError("請選擇文件類型。");
        return;
      }
      if (!canEditProjectDocType(projectDocType)) {
        setError("目前角色無法建立此類型文件，請洽管理者調整權限。");
        return;
      }
      if (!projectDocTitle.trim()) {
        setError("請輸入文件標題。");
        return;
      }
      if (!content.trim()) {
        setError("請輸入文件內容。");
        return;
      }
      try {
        setIsSaving(true);
        const result = await createProjectDocument(targetId, {
          type: projectDocType,
          title: projectDocTitle.trim(),
          content: content.trim(),
          versionNote: versionNote.trim() || undefined,
          status: projectDocStatus,
        });
        setDocId(result.document_id);
        setDocMeta({
          id: result.document_id,
          version: result.version,
          status: projectDocStatus,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          title: projectDocTitle.trim(),
          type: projectDocType,
        });
        setStatus(`已新增專案文件版本 v${result.version}。`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "新增專案文件失敗。");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const docTitle = docKind === "requirement" ? "需求文件編輯" : "專案文件編輯";
  const backLink =
    accountRole === "developer"
      ? { href: "/workspace", label: "返回專案工作台" }
      : accountRole === "customer"
      ? { href: "/my/requirements", label: "返回我的需求" }
      : { href: "/projects", label: "返回專案管理" };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                <FilePenLine className="h-4 w-4" />
                文件編輯器
              </span>
              <Link
                href={backLink.href}
                className="text-sm text-muted-foreground hover:text-primary transition"
              >
                <ArrowLeft className="inline-block h-4 w-4" /> {backLink.label}
              </Link>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">{docTitle}</h1>
            <p className="text-muted-foreground">
              使用 Markdown 編輯文件內容，儲存時會建立新版本並保留歷史紀錄。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReload}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新載入
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading || !docKind}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" />
              儲存新版本
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

        {!docKind ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            請先從文件中心選擇需求或專案文件後再進入編輯器。
          </div>
        ) : (
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-white/90 p-4 text-sm">
                <p className="text-xs text-muted-foreground">目標 ID</p>
                <p className="font-semibold text-foreground break-all">{targetId || "未指定"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4 text-sm">
                <p className="text-xs text-muted-foreground">文件版本</p>
                <p className="font-semibold text-foreground">
                  {docMeta?.version ? `v${docMeta.version}` : "尚未建立"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">狀態：{docMeta?.status ?? "--"}</p>
              </div>
              <div className="rounded-2xl border bg-white/90 p-4 text-sm">
                <p className="text-xs text-muted-foreground">更新時間</p>
                <p className="font-semibold text-foreground">{docMeta?.updatedAt ?? "--"}</p>
                <p className="text-xs text-muted-foreground mt-2">建立：{docMeta?.createdAt ?? "--"}</p>
              </div>
            </div>

            {docKind === "project" ? (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm font-medium">
                  文件類型
                  <select
                    value={projectDocType}
                    onChange={(event) => setProjectDocType(event.target.value)}
                    disabled={Boolean(docId) || allowedProjectDocTypes.length === 0}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">選擇文件類型</option>
                    {projectDocTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  文件標題
                  <input
                    type="text"
                    value={projectDocTitle}
                    onChange={(event) => setProjectDocTitle(event.target.value)}
                    placeholder="例如：系統架構設計"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  文件狀態
                  <select
                    value={projectDocStatus}
                    onChange={(event) => setProjectDocStatus(event.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="draft">草稿</option>
                    <option value="pending_approval">待簽核</option>
                    <option value="approved">已核准</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium md:col-span-3">
                  版本備註
                  <input
                    type="text"
                    value={versionNote}
                    onChange={(event) => setVersionNote(event.target.value)}
                    placeholder="例如：補上模組流程圖"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                {allowedProjectDocTypes.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 md:col-span-3">
                    目前角色無法建立專案文件，請洽管理者調整權限。
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {!canEditRequirementDoc ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    目前角色無法編修需求文件，請洽管理者調整權限。
                  </div>
                ) : null}
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-700">
                  需求文件送出後會進入審核流程，請留意內容完整度。
                </div>
              </div>
            )}

            <MarkdownEditor
              value={content}
              onChange={setContent}
              readOnly={
                docKind === "requirement"
                  ? !canEditRequirementDoc
                  : projectDocType
                  ? !canEditProjectDocType(projectDocType)
                  : true
              }
              placeholder={
                docKind === "requirement"
                  ? "請輸入需求文件內容，例如背景、目標、範圍、限制、驗收標準。"
                  : "請輸入文件內容，例如架構圖、模組分工、介面規格。"
              }
            />

            {docKind === "project" && projectDocType === "software" ? (
              <QuotationReview
                markdown={content}
                projectId={targetId}
                documentId={docId}
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
