import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  FileText,
  LayoutGrid,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  createMilestone,
  createTask,
  listMilestones,
  listProjectDocuments,
  listProjects,
  listQualityReports,
  listTasks,
  updateMilestone,
  updateTask,
  type Milestone,
  type ProjectDocumentSummary,
  type ProjectSummary,
  type QualityReport,
  type Task,
} from "@/lib/platformClient";

const tabs = [
  { id: "overview", label: "專案概況", icon: LayoutGrid },
  { id: "documents", label: "文件與簽核", icon: FileText },
  { id: "collaboration", label: "協作細節", icon: ClipboardList },
  { id: "quality", label: "品質交付", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

const taskColumns = [
  { key: "todo", label: "待處理" },
  { key: "in_progress", label: "進行中" },
  { key: "review", label: "審查中" },
  { key: "done", label: "完成" },
];

const milestoneStatuses = [
  { value: "planned", label: "規劃中" },
  { value: "active", label: "進行中" },
  { value: "done", label: "完成" },
];

export default function ProjectWorkspace() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [projectDocs, setProjectDocs] = useState<ProjectDocumentSummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneStatus, setNewMilestoneStatus] = useState("planned");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");

  const canManageTasks =
    accountRole === "admin" || permissions.includes("projects.tasks.manage");
  const canManageMilestones =
    accountRole === "admin" || permissions.includes("projects.milestones.manage");
  const canCreateAnyProjectDoc =
    accountRole === "admin" || permissions.some((permission) => permission.startsWith("projects.documents."));

  const activeLabel = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.label ?? "";
  }, [activeTab]);

  const loadProjects = async () => {
    try {
      setError("");
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入專案清單。");
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      setStatus("載入專案資料...");
      setError("");
      const [docData, taskData, milestoneData, reportData] = await Promise.all([
        listProjectDocuments(projectId),
        listTasks(projectId),
        listMilestones(projectId),
        listQualityReports(projectId),
      ]);
      setProjectDocs(docData);
      setTasks(taskData);
      setMilestones(milestoneData);
      setQualityReports(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入專案內容。");
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
    loadProjects();
  }, []);

  useEffect(() => {
    if (!projects.length) {
      setSelectedProjectId("");
      return;
    }
    if (!selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      setProjectDocs([]);
      setTasks([]);
      setMilestones([]);
      setQualityReports([]);
      return;
    }
    const project = projects.find((item) => item.id === selectedProjectId) ?? null;
    setSelectedProject(project);
    loadProjectData(selectedProjectId);
  }, [selectedProjectId, projects]);

  const handleReload = async () => {
    await loadProjects();
    if (selectedProjectId) {
      await loadProjectData(selectedProjectId);
    }
  };

  const handleCreateTask = async () => {
    if (!canManageTasks) {
      setError("目前角色無法管理任務，請洽管理者調整權限。");
      return;
    }
    if (!selectedProjectId || !newTaskTitle.trim()) {
      setError("請輸入任務標題。");
      return;
    }
    try {
      setError("");
      setStatus("正在建立任務...");
      await createTask(selectedProjectId, { title: newTaskTitle.trim(), status: newTaskStatus });
      setNewTaskTitle("");
      await loadProjectData(selectedProjectId);
      setStatus("任務已建立。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立任務失敗。");
      setStatus("");
    }
  };

  const handleUpdateTask = async (task: Task, statusValue: string) => {
    if (!canManageTasks || !selectedProjectId) return;
    try {
      await updateTask(selectedProjectId, task.id, { status: statusValue });
      await loadProjectData(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新任務失敗。");
    }
  };

  const handleCreateMilestone = async () => {
    if (!canManageMilestones) {
      setError("目前角色無法管理里程碑，請洽管理者調整權限。");
      return;
    }
    if (!selectedProjectId || !newMilestoneTitle.trim()) {
      setError("請輸入里程碑標題。");
      return;
    }
    try {
      setError("");
      setStatus("正在建立里程碑...");
      await createMilestone(selectedProjectId, {
        title: newMilestoneTitle.trim(),
        status: newMilestoneStatus,
        dueDate: newMilestoneDue || null,
      });
      setNewMilestoneTitle("");
      setNewMilestoneDue("");
      await loadProjectData(selectedProjectId);
      setStatus("里程碑已建立。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立里程碑失敗。");
      setStatus("");
    }
  };

  const handleUpdateMilestone = async (milestone: Milestone, statusValue: string) => {
    if (!canManageMilestones || !selectedProjectId) return;
    try {
      await updateMilestone(selectedProjectId, milestone.id, { status: statusValue });
      await loadProjectData(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新里程碑失敗。");
    }
  };

  const groupedTasks = useMemo(() => {
    return taskColumns.reduce<Record<string, Task[]>>((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <LayoutGrid className="h-4 w-4" />
              專案工作台
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">專案協作與交付</h1>
            <p className="text-muted-foreground">集中查看專案進度、文件、協作與品質報告。</p>
          </div>
          <button
            type="button"
            onClick={handleReload}
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

        <div className="grid gap-6 lg:grid-cols-[0.35fr_0.65fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-bold">專案列表</h2>
              <span className="text-xs text-muted-foreground">共 {projects.length} 筆</span>
            </div>
            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {projects.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無專案紀錄。
                </div>
              ) : (
                projects.map((item) => {
                  const isActive = selectedProjectId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedProjectId(item.id)}
                      className={`w-full text-left rounded-2xl border p-4 transition ${
                        isActive ? "border-primary bg-primary/10" : "border-border bg-white hover:border-primary/40"
                      }`}
                    >
                      <p className="text-xs text-muted-foreground">#{item.id.slice(0, 8)}</p>
                      <p className="mt-1 font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">需求：{item.requirementId.slice(0, 8)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">狀態：{item.status}</p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
            {selectedProject ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl font-bold">{selectedProject.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      專案編號 {selectedProject.id} · 需求 {selectedProject.requirementId}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                    {selectedProject.status}
                  </span>
                </div>

                <div className="rounded-3xl border bg-white/80 p-4 shadow-sm">
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

                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{activeLabel}</p>
                  </div>

                  {activeTab === "overview" ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border bg-white/90 p-4">
                        <p className="text-xs text-muted-foreground">專案狀態</p>
                        <p className="mt-2 text-lg font-semibold">{selectedProject.status}</p>
                      </div>
                      <div className="rounded-2xl border bg-white/90 p-4">
                        <p className="text-xs text-muted-foreground">需求編號</p>
                        <p className="mt-2 text-lg font-semibold">{selectedProject.requirementId.slice(0, 8)}</p>
                      </div>
                      <div className="rounded-2xl border bg-white/90 p-4">
                        <p className="text-xs text-muted-foreground">更新時間</p>
                        <p className="mt-2 text-lg font-semibold">{selectedProject.updatedAt}</p>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "documents" ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">專案文件清單</p>
                        {canCreateAnyProjectDoc ? (
                          <Link
                            href={`/editor?kind=project&project=${selectedProject.id}`}
                            className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                          >
                            新增文件版本
                          </Link>
                        ) : null}
                      </div>
                      {projectDocs.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          尚無專案文件。
                        </div>
                      ) : (
                        projectDocs.map((doc) => (
                          <div key={doc.id} className="rounded-2xl border bg-white/90 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {doc.type} · v{doc.version}
                                </p>
                                <p className="text-lg font-semibold">{doc.title}</p>
                                <p className="text-xs text-muted-foreground">更新：{doc.updatedAt}</p>
                              </div>
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                {doc.status}
                              </span>
                            </div>
                            {doc.reviewComment ? (
                              <p className="text-xs text-muted-foreground">最新回饋：{doc.reviewComment}</p>
                            ) : null}
                            <Link
                              href={`/editor?kind=project&project=${selectedProject.id}&doc=${doc.id}`}
                              className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                            >
                              開啟編輯器
                            </Link>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}

                  {activeTab === "collaboration" ? (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                        <p className="text-sm font-semibold">任務列表</p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {taskColumns.map((column) => (
                            <div key={column.key} className="rounded-xl border border-border/60 p-3">
                              <p className="text-xs font-semibold text-muted-foreground">{column.label}</p>
                              <div className="mt-2 space-y-2">
                                {groupedTasks[column.key]?.length ? (
                                  groupedTasks[column.key].map((task) => (
                                    <div key={task.id} className="rounded-lg border bg-white/80 px-3 py-2 text-xs">
                                      <p className="font-semibold text-foreground">{task.title}</p>
                                      {canManageTasks ? (
                                        <select
                                          value={task.status}
                                          onChange={(event) => handleUpdateTask(task, event.target.value)}
                                          className="mt-2 w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                                        >
                                          {taskColumns.map((item) => (
                                            <option key={item.key} value={item.key}>
                                              {item.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <p className="text-[11px] text-muted-foreground">{task.status}</p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-muted-foreground">暫無任務</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {canManageTasks ? (
                          <div className="rounded-xl border border-dashed p-3 space-y-2 text-xs">
                            <p className="font-semibold">新增任務</p>
                            <input
                              type="text"
                              value={newTaskTitle}
                              onChange={(event) => setNewTaskTitle(event.target.value)}
                              placeholder="任務標題"
                              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                            />
                            <select
                              value={newTaskStatus}
                              onChange={(event) => setNewTaskStatus(event.target.value)}
                              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                            >
                              {taskColumns.map((item) => (
                                <option key={item.key} value={item.key}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleCreateTask}
                              className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                            >
                              建立任務
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                        <p className="text-sm font-semibold">里程碑</p>
                        <div className="space-y-2">
                          {milestones.length === 0 ? (
                            <p className="text-xs text-muted-foreground">尚無里程碑。</p>
                          ) : (
                            milestones.map((milestone) => (
                              <div key={milestone.id} className="rounded-xl border bg-white/80 px-3 py-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-foreground">{milestone.title}</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {milestone.dueDate ?? "--"}
                                  </span>
                                </div>
                                {canManageMilestones ? (
                                  <select
                                    value={milestone.status}
                                    onChange={(event) => handleUpdateMilestone(milestone, event.target.value)}
                                    className="mt-2 w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                                  >
                                    {milestoneStatuses.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground">{milestone.status}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {canManageMilestones ? (
                          <div className="rounded-xl border border-dashed p-3 space-y-2 text-xs">
                            <p className="font-semibold">新增里程碑</p>
                            <input
                              type="text"
                              value={newMilestoneTitle}
                              onChange={(event) => setNewMilestoneTitle(event.target.value)}
                              placeholder="里程碑標題"
                              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                            />
                            <input
                              type="date"
                              value={newMilestoneDue}
                              onChange={(event) => setNewMilestoneDue(event.target.value)}
                              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                            />
                            <select
                              value={newMilestoneStatus}
                              onChange={(event) => setNewMilestoneStatus(event.target.value)}
                              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs"
                            >
                              {milestoneStatuses.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleCreateMilestone}
                              className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                            >
                              建立里程碑
                            </button>
                          </div>
                        ) : null}
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
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">#{report.id.slice(0, 8)}</p>
                                <p className="font-semibold">{report.type}</p>
                                <p className="text-xs text-muted-foreground">狀態：{report.status}</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{report.updatedAt}</span>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{report.summary}</p>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                請先選擇專案以查看工作台內容。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
