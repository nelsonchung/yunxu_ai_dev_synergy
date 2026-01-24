import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Flag, Timer, UserCircle2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import {
  guardRules,
  paymentLabels,
  projectPhases,
  roleLabels,
  statusOrder,
  statusRoles,
  statusTransitions,
  type ProjectRole,
  getTransitionKey,
} from "@/lib/projectFlow";
import { getProjectById, projectDocuments, projectStatusLogs } from "@/lib/projectData";

const guardBadges = [
  { key: "scopeReviewAccepted", label: "需求 Review 完成" },
  { key: "systemDesignApproved", label: "系統文件核准" },
  { key: "testPlanApproved", label: "測試計畫核准" },
  { key: "releaseCandidateReady", label: "版本已提交" },
];

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id ?? "";
  const project = getProjectById(projectId);
  const [activeRole, setActiveRole] = useState<ProjectRole>("admin");

  const timeline = useMemo(() => {
    return projectPhases.flatMap((phase) =>
      phase.statuses.map((status) => ({
        phase: phase.title,
        status: status.name,
        role: status.role,
      }))
    );
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-secondary/40 to-background">
        <div className="container py-16">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            返回專案列表
          </Link>
          <div className="mt-10 rounded-3xl border bg-card p-10 text-center">
            <p className="text-lg font-semibold">找不到此專案</p>
            <p className="mt-2 text-sm text-muted-foreground">請回到列表重新選擇。</p>
          </div>
        </div>
      </div>
    );
  }

  const nextStatuses = statusTransitions[project.status] ?? [];
  const documents = projectDocuments[project.id] ?? [];
  const logs = projectStatusLogs[project.id] ?? [];

  const actionItems = nextStatuses.map((nextStatus) => {
    const transitionKey = getTransitionKey(project.status, nextStatus);
    const guardRule = guardRules[transitionKey];
    const guardOk = guardRule ? guardRule.check(project) : true;
    const targetRole = statusRoles[nextStatus] ?? "admin";
    const roleOk = activeRole === "admin" || activeRole === targetRole;
    const isRollback = statusOrder[nextStatus] < statusOrder[project.status];

    return {
      nextStatus,
      isRollback,
      roleOk,
      guardOk,
      reason: !guardOk
        ? guardRule?.message ?? "需要完成必要條件"
        : !roleOk
        ? `需由 ${roleLabels[targetRole]} 操作`
        : "",
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/40 to-background">
      <section className="container py-12 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
            >
              <ArrowLeft className="h-4 w-4" />
              返回專案列表
            </Link>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              {project.status}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              託管：{paymentLabels[project.paymentStatus]}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground">專案狀態</p>
                <p className="text-lg font-semibold">{project.phase}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">客戶</p>
                <p className="mt-2 font-semibold">{project.customerName}</p>
              </div>
              <div className="rounded-2xl border bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">預算</p>
                <p className="mt-2 font-semibold">{project.budget}</p>
              </div>
              <div className="rounded-2xl border bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">預估時程</p>
                <p className="mt-2 font-semibold">{project.timeline}</p>
              </div>
            </div>

            <div className="rounded-2xl border bg-white/90 p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold">角色切換（示意）</p>
                <span className="text-xs text-muted-foreground">可用來檢視權限</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["customer", "dev", "admin"] as ProjectRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveRole(role)}
                    className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                      activeRole === role
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-serif text-xl font-bold">下一步可執行狀態</h2>
              <div className="grid gap-3">
                {actionItems.map((item) => (
                  <div
                    key={item.nextStatus}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      item.guardOk && item.roleOk
                        ? "border-primary/30 bg-primary/10"
                        : "border-border bg-white/90"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{item.nextStatus}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.isRollback ? "退回節點" : "下一個節點"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {item.guardOk && item.roleOk ? "可執行" : item.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl font-bold">條件檢查</h2>
              <div className="mt-4 grid gap-3">
                {guardBadges.map((badge) => (
                  <div key={badge.key} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                    <p className="text-sm">{badge.label}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        project.guard[badge.key as keyof typeof project.guard]
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {project.guard[badge.key as keyof typeof project.guard] ? "已完成" : "待完成"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl font-bold">狀態時間軸</h2>
              <div className="mt-4 space-y-4">
                {timeline.map((item) => {
                  const order = statusOrder[item.status] ?? 0;
                  const currentOrder = statusOrder[project.status] ?? 0;
                  const isDone = order < currentOrder;
                  const isCurrent = item.status === project.status;

                  return (
                    <div
                      key={`${item.phase}-${item.status}`}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
                        isCurrent
                          ? "border-primary/40 bg-primary/10"
                          : isDone
                          ? "border-emerald-200 bg-emerald-50/60"
                          : "border-border bg-white/90"
                      }`}
                    >
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{item.phase}</p>
                        <p className="font-semibold">{item.status}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{roleLabels[item.role]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">專案文件</h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
              >
                <FileText className="h-4 w-4" />
                上傳新版本
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-2xl border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{doc.type}</p>
                      <p className="text-xs text-muted-foreground">{doc.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{doc.version}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{doc.updatedAt}</span>
                    <span>負責：{doc.owner}</span>
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {doc.status === "APPROVED" ? "已核准" : doc.status === "REVIEW" ? "審閱中" : "草稿"}
                    </span>
                  </div>
                </div>
              ))}
              {!documents.length && (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無文件，請先上傳。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold">狀態紀錄</h2>
            <div className="mt-4 space-y-4">
              {logs.map((log) => (
                <div key={`${log.status}-${log.time}`} className="rounded-2xl border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{log.status}</p>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">執行者：{log.actor}</p>
                  <p className="mt-2 text-sm">{log.note}</p>
                </div>
              ))}
              {!logs.length && (
                <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  尚無紀錄。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold">協作備註</h2>
              <p className="text-sm text-muted-foreground">
                用於紀錄媒合、託管、驗收關鍵事件，方便管理者追蹤。
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <ArrowRight className="h-4 w-4" />
              新增備註
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border p-4">
              <Timer className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-foreground">託管期限</p>
              <p className="mt-1">預計 3 天內完成託管。</p>
            </div>
            <div className="rounded-2xl border p-4">
              <UserCircle2 className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-foreground">負責窗口</p>
              <p className="mt-1">平台 PM：Hana Lin</p>
            </div>
            <div className="rounded-2xl border p-4">
              <Flag className="h-5 w-5 text-primary" />
              <p className="mt-2 font-semibold text-foreground">下一里程碑</p>
              <p className="mt-1">完成託管並啟動專案。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
