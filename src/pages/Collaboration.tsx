import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Flag, LayoutGrid, Plus, RefreshCcw } from "lucide-react";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";
import {
  createMilestone,
  createTask,
  listMilestones,
  listProjects,
  listTasks,
  updateMilestone,
  updateTask,
  type Milestone,
  type ProjectSummary,
  type Task,
} from "@/lib/platformClient";

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

export default function Collaboration() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneStatus, setNewMilestoneStatus] = useState("planned");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const canManageTasks =
    accountRole === "admin" || permissions.includes("projects.tasks.manage");
  const canManageMilestones =
    accountRole === "admin" || permissions.includes("projects.milestones.manage");

  const loadProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入專案清單。");
    }
  };

  const loadTasks = async (projectId: string) => {
    const data = await listTasks(projectId);
    setTasks(data);
  };

  const loadMilestones = async (projectId: string) => {
    const data = await listMilestones(projectId);
    setMilestones(data);
  };

  const reloadSelected = async () => {
    if (!selectedProjectId) return;
    await Promise.all([loadTasks(selectedProjectId), loadMilestones(selectedProjectId)]);
  };

  useEffect(() => {
    const syncSession = async () => {
      const session = await getSession();
      setIsLoggedIn(Boolean(session));
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
    if (!selectedProjectId) {
      setTasks([]);
      setMilestones([]);
      return;
    }
    reloadSelected();
  }, [selectedProjectId]);

  const groupedTasks = useMemo(() => {
    return taskColumns.reduce<Record<string, Task[]>>((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, [tasks]);

  const handleCreateTask = async () => {
    if (!canManageTasks) {
      setError("目前角色無法管理任務，請洽管理者調整權限。");
      return;
    }
    if (!selectedProjectId || !newTaskTitle.trim()) {
      setError("請選擇專案並輸入任務標題。");
      return;
    }
    try {
      setError("");
      setStatus("正在建立任務...");
      await createTask(selectedProjectId, {
        title: newTaskTitle.trim(),
        status: newTaskStatus,
      });
      setNewTaskTitle("");
      await loadTasks(selectedProjectId);
      setStatus("任務已建立。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立任務失敗。");
      setStatus("");
    }
  };

  const handleUpdateTask = async (task: Task, status: string) => {
    if (!canManageTasks) {
      setError("目前角色無法管理任務，請洽管理者調整權限。");
      return;
    }
    try {
      setError("");
      await updateTask(selectedProjectId, task.id, { status });
      await loadTasks(selectedProjectId);
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
      setError("請選擇專案並輸入里程碑標題。");
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
      await loadMilestones(selectedProjectId);
      setStatus("里程碑已建立。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "建立里程碑失敗。");
      setStatus("");
    }
  };

  const handleUpdateMilestone = async (milestone: Milestone, status: string) => {
    if (!canManageMilestones) {
      setError("目前角色無法管理里程碑，請洽管理者調整權限。");
      return;
    }
    try {
      setError("");
      await updateMilestone(selectedProjectId, milestone.id, { status });
      await loadMilestones(selectedProjectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新里程碑失敗。");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <LayoutGrid className="h-4 w-4" />
              協作開發
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">任務與里程碑管理</h1>
            <p className="text-muted-foreground">以任務看板與里程碑掌握進度與交付節點。</p>
          </div>
          <button
            type="button"
            onClick={reloadSelected}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCcw className="h-4 w-4" />
            重新整理
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            請先登入後使用協作開發功能。
          </div>
        ) : null}
        {isLoggedIn && (!canManageTasks || !canManageMilestones) ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            目前角色無法管理任務或里程碑，請洽管理者調整權限。
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

        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" />
            選擇專案
          </div>
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">選擇專案</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.id.slice(0, 6)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LayoutGrid className="h-4 w-4 text-primary" />
              任務看板
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="輸入任務標題"
                disabled={!canManageTasks}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-2">
                <select
                  value={newTaskStatus}
                  onChange={(event) => setNewTaskStatus(event.target.value)}
                  disabled={!canManageTasks}
                  className="flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {taskColumns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCreateTask}
                  disabled={!canManageTasks}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Plus className="h-4 w-4" />
                  新增
                </button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              {taskColumns.map((column) => (
                <div key={column.key} className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <p className="text-sm font-semibold">{column.label}</p>
                  {groupedTasks[column.key]?.length ? (
                    groupedTasks[column.key].map((task) => (
                      <div key={task.id} className="rounded-xl border border-border px-3 py-2 text-xs">
                        <p className="font-semibold">{task.title}</p>
                        <select
                          value={task.status}
                          onChange={(event) => handleUpdateTask(task, event.target.value)}
                          disabled={!canManageTasks}
                          className="mt-2 w-full rounded-lg border border-border bg-white px-2 py-1 text-xs focus:outline-none"
                        >
                          {taskColumns.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">無任務</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Flag className="h-4 w-4 text-primary" />
              里程碑
            </div>
            <input
              type="text"
              value={newMilestoneTitle}
              onChange={(event) => setNewMilestoneTitle(event.target.value)}
              placeholder="輸入里程碑標題"
              disabled={!canManageMilestones}
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <select
                value={newMilestoneStatus}
                onChange={(event) => setNewMilestoneStatus(event.target.value)}
                disabled={!canManageMilestones}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {milestoneStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={newMilestoneDue}
                onChange={(event) => setNewMilestoneDue(event.target.value)}
                disabled={!canManageMilestones}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateMilestone}
              disabled={!canManageMilestones}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus className="h-4 w-4" />
              新增里程碑
            </button>
            <div className="space-y-3">
              {milestones.length === 0 ? (
                <p className="text-xs text-muted-foreground">尚無里程碑。</p>
              ) : (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-xl border border-border px-3 py-2 text-xs">
                    <p className="font-semibold">{milestone.title}</p>
                    <p className="text-muted-foreground">到期：{milestone.dueDate || "未設定"}</p>
                    <select
                      value={milestone.status}
                      onChange={(event) => handleUpdateMilestone(milestone, event.target.value)}
                      disabled={!canManageMilestones}
                      className="mt-2 w-full rounded-lg border border-border bg-white px-2 py-1 text-xs focus:outline-none"
                    >
                      {milestoneStatuses.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
