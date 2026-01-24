import { useEffect, useMemo, useState } from "react";
import { FileStack, FolderOpen, PencilLine, RefreshCcw, ScrollText, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  approveRequirement,
  createProject,
  createProjectDocument,
  deleteRequirement,
  deleteProject,
  deleteProjectDocument,
  deleteRequirementDocument,
  getProjectDocument,
  getRequirementDocument,
  listProjectDocuments,
  listProjects,
  listRequirementDocuments,
  listRequirements,
  type ProjectDocumentSummary,
  type ProjectSummary,
  type RequirementDocumentSummary,
  type RequirementSummary,
} from "@/lib/platformClient";

const projectDocTypes = [
  { value: "requirement", label: "需求文件" },
  { value: "system", label: "系統開發文件" },
  { value: "software", label: "軟體設計文件" },
  { value: "test", label: "測試文件" },
  { value: "delivery", label: "交付文件" },
];

const documentStatusTone: Record<string, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending_approval: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function Documents() {
  const [location] = useLocation();
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [requirementDocs, setRequirementDocs] = useState<RequirementDocumentSummary[]>([]);
  const [projectDocs, setProjectDocs] = useState<ProjectDocumentSummary[]>([]);

  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [selectedRequirementDocId, setSelectedRequirementDocId] = useState<string | null>(null);
  const [requirementContent, setRequirementContent] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectDocId, setSelectedProjectDocId] = useState<string | null>(null);
  const [projectContent, setProjectContent] = useState("");

  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [compareLeftContent, setCompareLeftContent] = useState("");
  const [compareRightContent, setCompareRightContent] = useState("");

  const [requirementStatus, setRequirementStatus] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [requirementError, setRequirementError] = useState("");
  const [projectError, setProjectError] = useState("");

  const [approvalComment, setApprovalComment] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [deletingRequirementId, setDeletingRequirementId] = useState<string | null>(null);
  const [deletingRequirementDocId, setDeletingRequirementDocId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingProjectDocId, setDeletingProjectDocId] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectRequirementId, setNewProjectRequirementId] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("");

  const [newDocType, setNewDocType] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocNote, setNewDocNote] = useState("");
  const [newDocStatus, setNewDocStatus] = useState("draft");
  const [newDocFeedback, setNewDocFeedback] = useState("");

  const isAdmin = accountRole === "admin";
  const canCreateProject = isAdmin || permissions.includes("projects.create");
  const canCreateDocType = (type: string) =>
    isAdmin || permissions.includes(`projects.documents.${type}`);
  const availableDocTypes = useMemo(
    () => projectDocTypes.filter((item) => canCreateDocType(item.value)),
    [permissions, accountRole]
  );

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
    if (availableDocTypes.length === 0) {
      setNewDocType("");
      return;
    }
    const matches = availableDocTypes.some((item) => item.value === newDocType);
    if (!matches) {
      setNewDocType(availableDocTypes[0].value);
    }
  }, [availableDocTypes, newDocType]);

  const loadRequirements = async () => {
    try {
      setRequirementError("");
      const data = await listRequirements();
      setRequirements(data);
    } catch (error) {
      setRequirementError(error instanceof Error ? error.message : "無法載入需求清單。");
    }
  };

  const loadProjects = async () => {
    try {
      setProjectError("");
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "無法載入專案清單。");
    }
  };

  useEffect(() => {
    loadRequirements();
    loadProjects();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requirementParam = params.get("requirement");
    const projectParam = params.get("project");
    if (requirementParam) {
      setSelectedRequirementId(requirementParam);
    }
    if (projectParam) {
      setSelectedProjectId(projectParam);
    }
  }, [location]);

  useEffect(() => {
    if (!selectedRequirementId) {
      setRequirementDocs([]);
      setSelectedRequirementDocId(null);
      setRequirementContent("");
      return;
    }
    const loadDocs = async () => {
      try {
        setRequirementStatus("載入需求文件...");
        const docs = await listRequirementDocuments(selectedRequirementId);
        setRequirementDocs(docs);
        setSelectedRequirementDocId(docs[0]?.id ?? null);
      } catch (error) {
        setRequirementError(error instanceof Error ? error.message : "無法載入需求文件。");
      } finally {
        setRequirementStatus("");
      }
    };
    loadDocs();
  }, [selectedRequirementId]);

  useEffect(() => {
    if (!selectedRequirementId || !selectedRequirementDocId) {
      setRequirementContent("");
      return;
    }
    const loadContent = async () => {
      try {
        setRequirementStatus("讀取文件內容...");
        const doc = await getRequirementDocument(selectedRequirementId, selectedRequirementDocId);
        setRequirementContent(doc.content);
      } catch (error) {
        setRequirementError(error instanceof Error ? error.message : "無法讀取文件內容。");
      } finally {
        setRequirementStatus("");
      }
    };
    loadContent();
  }, [selectedRequirementDocId, selectedRequirementId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectDocs([]);
      setSelectedProjectDocId(null);
      setProjectContent("");
      return;
    }
    const loadDocs = async () => {
      try {
        setProjectStatus("載入專案文件...");
        const docs = await listProjectDocuments(selectedProjectId);
        setProjectDocs(docs);
        setSelectedProjectDocId(docs[0]?.id ?? null);
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : "無法載入專案文件。");
      } finally {
        setProjectStatus("");
      }
    };
    loadDocs();
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || !selectedProjectDocId) {
      setProjectContent("");
      return;
    }
    const loadContent = async () => {
      try {
        setProjectStatus("讀取文件內容...");
        const doc = await getProjectDocument(selectedProjectId, selectedProjectDocId);
        setProjectContent(doc.content);
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : "無法讀取文件內容。");
      } finally {
        setProjectStatus("");
      }
    };
    loadContent();
  }, [selectedProjectDocId, selectedProjectId]);

  useEffect(() => {
    const loadCompare = async () => {
      if (!selectedProjectId || !compareLeftId || !compareRightId) return;
      try {
        const [left, right] = await Promise.all([
          getProjectDocument(selectedProjectId, compareLeftId),
          getProjectDocument(selectedProjectId, compareRightId),
        ]);
        setCompareLeftContent(left.content);
        setCompareRightContent(right.content);
      } catch (error) {
        setProjectError(error instanceof Error ? error.message : "無法載入版本內容。");
      }
    };
    loadCompare();
  }, [compareLeftId, compareRightId, selectedProjectId]);

  const compareSummary = useMemo(() => {
    if (!compareLeftContent || !compareRightContent) return null;
    const leftLines = compareLeftContent.split("\n").filter((line) => line.trim());
    const rightLines = compareRightContent.split("\n").filter((line) => line.trim());
    const leftSet = new Set(leftLines);
    const rightSet = new Set(rightLines);
    const added = rightLines.filter((line) => !leftSet.has(line));
    const removed = leftLines.filter((line) => !rightSet.has(line));
    return { added, removed };
  }, [compareLeftContent, compareRightContent]);

  const handleApprove = async (approved: boolean) => {
    if (!selectedRequirementId) return;
    setIsApproving(true);
    setRequirementError("");
    try {
      await approveRequirement(selectedRequirementId, approved, approvalComment.trim());
      setApprovalComment("");
      await loadRequirements();
      if (selectedRequirementId) {
        const docs = await listRequirementDocuments(selectedRequirementId);
        setRequirementDocs(docs);
      }
      setRequirementStatus(approved ? "需求文件已核准。" : "需求已退回審查。");
    } catch (error) {
      setRequirementError(error instanceof Error ? error.message : "簽核失敗。");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    if (!window.confirm("確定要刪除此需求？相關需求文件將一併移除。")) return;
    setRequirementError("");
    setDeletingRequirementId(requirementId);
    try {
      await deleteRequirement(requirementId);
      await loadRequirements();
      if (selectedRequirementId === requirementId) {
        setSelectedRequirementId(null);
        setSelectedRequirementDocId(null);
        setRequirementDocs([]);
        setRequirementContent("");
      }
      setRequirementStatus("已刪除需求。");
    } catch (error) {
      setRequirementError(error instanceof Error ? error.message : "刪除需求失敗。");
    } finally {
      setDeletingRequirementId(null);
    }
  };

  const handleDeleteRequirementDoc = async (docId: string) => {
    if (!selectedRequirementId) return;
    if (!window.confirm("確定要刪除這個需求文件版本？此動作無法復原。")) return;
    setRequirementError("");
    setDeletingRequirementDocId(docId);
    try {
      await deleteRequirementDocument(selectedRequirementId, docId);
      const docs = await listRequirementDocuments(selectedRequirementId);
      setRequirementDocs(docs);
      const nextId = docs[0]?.id ?? null;
      setSelectedRequirementDocId(nextId);
      setRequirementContent("");
      setRequirementStatus("已刪除文件版本。");
    } catch (error) {
      setRequirementError(error instanceof Error ? error.message : "刪除文件失敗。");
    } finally {
      setDeletingRequirementDocId(null);
    }
  };

  const handleCreateProject = async () => {
    if (!canCreateProject) {
      setNewProjectStatus("目前角色無法建立專案。");
      return;
    }
    if (!newProjectRequirementId || !newProjectName.trim()) {
      setNewProjectStatus("請選擇需求並輸入專案名稱。");
      return;
    }
    try {
      const result = await createProject({
        requirementId: newProjectRequirementId,
        name: newProjectName.trim(),
      });
      setNewProjectStatus(`已建立專案（${result.project_id}）。`);
      setNewProjectName("");
      await loadProjects();
    } catch (error) {
      setNewProjectStatus(error instanceof Error ? error.message : "建立專案失敗。");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("確定要刪除此專案？相關文件與任務也會一併移除。")) return;
    setProjectError("");
    setDeletingProjectId(projectId);
    try {
      await deleteProject(projectId);
      await loadProjects();
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        setSelectedProjectDocId(null);
        setProjectDocs([]);
        setProjectContent("");
        setCompareLeftId("");
        setCompareRightId("");
        setCompareLeftContent("");
        setCompareRightContent("");
      }
      setProjectStatus("已刪除專案。");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "刪除專案失敗。");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDeleteProjectDoc = async (docId: string) => {
    if (!selectedProjectId) return;
    if (!window.confirm("確定要刪除這個專案文件版本？此動作無法復原。")) return;
    setProjectError("");
    setDeletingProjectDocId(docId);
    try {
      await deleteProjectDocument(selectedProjectId, docId);
      const docs = await listProjectDocuments(selectedProjectId);
      setProjectDocs(docs);
      const nextId = docs[0]?.id ?? null;
      setSelectedProjectDocId(nextId);
      setProjectContent("");
      setProjectStatus("已刪除文件版本。");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "刪除文件失敗。");
    } finally {
      setDeletingProjectDocId(null);
    }
  };

  const handleCreateDocument = async () => {
    if (!selectedProjectId) {
      setNewDocFeedback("請先選擇專案。");
      return;
    }
    if (!newDocType || !newDocTitle.trim() || !newDocContent.trim()) {
      setNewDocFeedback("請填寫文件類型、標題與內容。");
      return;
    }
    if (!canCreateDocType(newDocType)) {
      setNewDocFeedback("目前角色無法建立此類型文件。");
      return;
    }
    try {
      await createProjectDocument(selectedProjectId, {
        type: newDocType,
        title: newDocTitle.trim(),
        content: newDocContent.trim(),
        versionNote: newDocNote.trim(),
        status: newDocStatus,
      });
      setNewDocFeedback("已新增文件版本。");
      setNewDocTitle("");
      setNewDocContent("");
      setNewDocNote("");
      await loadProjects();
      const docs = await listProjectDocuments(selectedProjectId);
      setProjectDocs(docs);
      setSelectedProjectDocId(docs[0]?.id ?? null);
    } catch (error) {
      setNewDocFeedback(error instanceof Error ? error.message : "新增文件失敗。");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <ScrollText className="h-4 w-4" />
              文件中心
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">需求與文件版本控管</h1>
            <p className="text-muted-foreground">
              追蹤需求文件、專案文件版本與簽核狀態，保持協作一致。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadRequirements}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新載入需求
            </button>
            <button
              type="button"
              onClick={loadProjects}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
            >
              <RefreshCcw className="h-4 w-4" />
              重新載入專案
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">需求列表</h2>
              <span className="text-xs text-muted-foreground">共 {requirements.length} 筆</span>
            </div>
            {requirementError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {requirementError}
              </div>
            ) : null}
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {requirements.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無需求紀錄。
                </div>
              ) : (
                requirements.map((item) => {
                  const isActive = selectedRequirementId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                        isActive ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRequirementId(item.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                            <p className="mt-1 font-semibold">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.companyName || "未提供公司"}</p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              documentStatusTone[item.status] ?? "border-primary/20 bg-primary/10 text-primary"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {item.projectType ? (
                            <span className="rounded-full border px-3 py-1">{item.projectType}</span>
                          ) : null}
                          {item.budgetRange ? (
                            <span className="rounded-full border px-3 py-1">{item.budgetRange}</span>
                          ) : null}
                          {item.timeline ? (
                            <span className="rounded-full border px-3 py-1">{item.timeline}</span>
                          ) : null}
                        </div>
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteRequirement(item.id)}
                          disabled={deletingRequirementId === item.id}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingRequirementId === item.id ? "刪除中" : "刪除"}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <FileStack className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold">需求文件版本</h2>
            </div>
            {selectedRequirementId ? (
              <div className="grid gap-4 lg:grid-cols-[0.4fr_0.6fr]">
                <div className="space-y-3">
                  <div className="rounded-2xl border bg-white/90 p-4 text-sm text-muted-foreground">
                    {requirementStatus || "選擇版本以檢視內容"}
                  </div>
                  <div className="space-y-2">
                    {requirementDocs.map((doc) => {
                      const isActive = selectedRequirementDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                            isActive ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedRequirementDocId(doc.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">版本 v{doc.version}</p>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  documentStatusTone[doc.status] ?? "border-primary/20 bg-primary/10 text-primary"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            {doc.reviewComment ? (
                              <p className="mt-2 text-xs text-muted-foreground">備註：{doc.reviewComment}</p>
                            ) : null}
                          </button>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteRequirementDoc(doc.id)}
                              disabled={deletingRequirementDocId === doc.id}
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingRequirementDocId === doc.id ? "刪除中" : "刪除"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border bg-white/90 p-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">文件內容</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{requirementContent || "尚未選擇版本。"}</pre>
                  </div>
                  {isAdmin ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                        <ShieldCheck className="h-4 w-4" />
                        需求文件簽核
                      </div>
                      <textarea
                        value={approvalComment}
                        onChange={(event) => setApprovalComment(event.target.value)}
                        rows={2}
                        placeholder="簽核備註（可選填）"
                        className="w-full rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(true)}
                          disabled={isApproving}
                          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition disabled:opacity-70"
                        >
                          核准
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(false)}
                          disabled={isApproving}
                          className="inline-flex items-center justify-center rounded-full border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-70"
                        >
                          退回審查
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                請先選擇需求以檢視文件版本。
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">專案列表</h2>
              <span className="text-xs text-muted-foreground">共 {projects.length} 筆</span>
            </div>
            {projectError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {projectError}
              </div>
            ) : null}
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無專案紀錄。
                </div>
              ) : (
                projects.map((item) => {
                  const isActive = selectedProjectId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition ${
                        isActive ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedProjectId(item.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                            <p className="mt-1 font-semibold">{item.name}</p>
                            <p className="text-xs text-muted-foreground">需求：{item.requirementId.slice(0, 8)}</p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              documentStatusTone[item.status] ?? "border-primary/20 bg-primary/10 text-primary"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(item.id)}
                          disabled={deletingProjectId === item.id}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingProjectId === item.id ? "刪除中" : "刪除"}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <PencilLine className="h-4 w-4 text-primary" />
                建立專案
              </div>
              {!canCreateProject ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                  {accountRole ? "目前角色無法建立專案，請洽管理者調整權限。" : "請先登入後建立專案。"}
                </div>
              ) : null}
              <select
                value={newProjectRequirementId}
                onChange={(event) => setNewProjectRequirementId(event.target.value)}
                disabled={!canCreateProject}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">選擇需求</option>
                {requirements.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.id.slice(0, 6)})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
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
              {newProjectStatus ? (
                <p className="text-xs text-muted-foreground">{newProjectStatus}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <h2 className="font-serif text-2xl font-bold">專案文件版本</h2>
            </div>
            {selectedProjectId ? (
              <div className="space-y-4">
                <div className="rounded-2xl border bg-white/90 p-4 text-sm text-muted-foreground">
                  {projectStatus || "選擇版本以檢視內容"}
                </div>
                <div className="grid gap-4 lg:grid-cols-[0.4fr_0.6fr]">
                  <div className="space-y-2">
                    {projectDocs.map((doc) => {
                      const isActive = selectedProjectDocId === doc.id;
                      return (
                        <div
                          key={doc.id}
                          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                            isActive ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedProjectDocId(doc.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{doc.title}</p>
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  documentStatusTone[doc.status] ?? "border-primary/20 bg-primary/10 text-primary"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {doc.type} · v{doc.version}
                            </div>
                            {doc.versionNote ? (
                              <p className="mt-1 text-xs text-muted-foreground">備註：{doc.versionNote}</p>
                            ) : null}
                          </button>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteProjectDoc(doc.id)}
                              disabled={deletingProjectDocId === doc.id}
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingProjectDocId === doc.id ? "刪除中" : "刪除"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border bg-white/90 p-4 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">文件內容</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{projectContent || "尚未選擇版本。"}</pre>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <p className="text-sm font-semibold">新增文件版本</p>
                  {availableDocTypes.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                      {accountRole ? "目前角色無法新增專案文件，請洽管理者調整權限。" : "請先登入後新增文件。"}
                    </div>
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={newDocType}
                      onChange={(event) => setNewDocType(event.target.value)}
                      disabled={availableDocTypes.length === 0}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">選擇文件類型</option>
                      {availableDocTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(event) => setNewDocTitle(event.target.value)}
                      placeholder="文件標題"
                      disabled={availableDocTypes.length === 0}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <textarea
                    value={newDocContent}
                    onChange={(event) => setNewDocContent(event.target.value)}
                    rows={4}
                    placeholder="輸入文件內容"
                    disabled={availableDocTypes.length === 0}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={newDocNote}
                      onChange={(event) => setNewDocNote(event.target.value)}
                      placeholder="版本備註（可選填）"
                      disabled={availableDocTypes.length === 0}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <select
                      value={newDocStatus}
                      onChange={(event) => setNewDocStatus(event.target.value)}
                      disabled={availableDocTypes.length === 0}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="draft">草稿</option>
                      <option value="pending_approval">待簽核</option>
                      <option value="approved">已核准</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateDocument}
                    disabled={availableDocTypes.length === 0}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    新增版本
                  </button>
                  {newDocFeedback ? (
                    <p className="text-xs text-muted-foreground">{newDocFeedback}</p>
                  ) : null}
                </div>

                <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <p className="text-sm font-semibold">版本比較</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={compareLeftId}
                      onChange={(event) => setCompareLeftId(event.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">選擇舊版本</option>
                      {projectDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.type} v{doc.version}
                        </option>
                      ))}
                    </select>
                    <select
                      value={compareRightId}
                      onChange={(event) => setCompareRightId(event.target.value)}
                      className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">選擇新版本</option>
                      {projectDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.type} v{doc.version}
                        </option>
                      ))}
                    </select>
                  </div>
                  {compareSummary ? (
                    <div className="grid gap-4 md:grid-cols-2 text-xs text-muted-foreground">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="font-semibold text-emerald-700">新增內容 ({compareSummary.added.length})</p>
                        <ul className="mt-2 space-y-1">
                          {compareSummary.added.slice(0, 6).map((line, index) => (
                            <li key={`${line}-${index}`} className="truncate">
                              + {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="font-semibold text-rose-700">移除內容 ({compareSummary.removed.length})</p>
                        <ul className="mt-2 space-y-1">
                          {compareSummary.removed.slice(0, 6).map((line, index) => (
                            <li key={`${line}-${index}`} className="truncate">
                              - {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">選擇兩個版本以產生差異預覽。</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                請先選擇專案以檢視文件版本。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
