import { ArrowRight, CalendarDays, Layers, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  getProjectChecklist,
  getProjectVerificationChecklist,
  listProjects,
  listRequirements,
  type ProjectSummary,
  type RequirementSummary,
} from "@/lib/platformClient";

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

const reviewStatuses = new Set([
  "architecture_review",
  "software_design_review",
  "delivery_review",
  "system_verification_review",
]);

const getStatusTone = (status: string) => {
  if (status === "closed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "canceled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "on_hold") return "border-amber-200 bg-amber-50 text-amber-700";
  if (reviewStatuses.has(status)) return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "implementation" || status === "system_verification_signed") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

const formatStatusLabel = (project: ProjectSummary) => {
  const label = projectStatusLabels[project.status] ?? project.status;
  if (project.status === "on_hold" && project.previousStatus) {
    const previousLabel = projectStatusLabels[project.previousStatus] ?? project.previousStatus;
    return `${label}（原：${previousLabel}）`;
  }
  return label;
};

const getChecklistPercent = (done: number, total: number) => {
  if (!total) return 0;
  return Math.round((done / total) * 100);
};

export default function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [requirements, setRequirements] = useState<RequirementSummary[]>([]);
  const [progressMap, setProgressMap] = useState<
    Record<
      string,
      { devTotal: number; devDone: number; verificationTotal: number; verificationDone: number }
    >
  >({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [projectList, requirementList] = await Promise.all([
          listProjects(),
          listRequirements(),
        ]);
        setProjects(projectList);
        setRequirements(requirementList);
        const progressEntries = await Promise.all(
          projectList.map(async (project) => {
            try {
              const [devChecklist, verificationChecklist] = await Promise.all([
                getProjectChecklist(project.id).catch(() => null),
                getProjectVerificationChecklist(project.id).catch(() => null),
              ]);
              const devTotal = devChecklist?.items?.length ?? 0;
              const devDone = devChecklist?.items?.filter((item) => item.done).length ?? 0;
              const verificationTotal = verificationChecklist?.items?.length ?? 0;
              const verificationDone =
                verificationChecklist?.items?.filter((item) => item.done).length ?? 0;
              return [
                project.id,
                { devTotal, devDone, verificationTotal, verificationDone },
              ] as const;
            } catch {
              return [
                project.id,
                { devTotal: 0, devDone: 0, verificationTotal: 0, verificationDone: 0 },
              ] as const;
            }
          })
        );
        setProgressMap(Object.fromEntries(progressEntries));
      } catch (err) {
        setError(err instanceof Error ? err.message : "無法載入專案資料。");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const requirementMap = useMemo(
    () => new Map(requirements.map((item) => [item.id, item])),
    [requirements]
  );

  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const requirement = requirementMap.get(project.requirementId) ?? null;
      const tags = [requirement?.projectType, requirement?.budgetRange, requirement?.timeline].filter(Boolean) as string[];
      return {
        ...project,
        requirement,
        tags,
      };
    });
  }, [projects, requirementMap]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return enrichedProjects.filter((project) => {
      const requirement = project.requirement;
      const matchesQuery = normalizedQuery
        ? [
            project.name,
            project.id,
            requirement?.title ?? "",
            requirement?.companyName ?? "",
            requirement?.projectType ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        : true;
      const matchesStatus =
        statusFilter === "all" ? true : project.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [enrichedProjects, query, statusFilter]);

  const totalProjects = projects.length;
  const activeCount = projects.filter(
    (project) => project.status !== "closed" && project.status !== "canceled"
  ).length;
  const reviewCount = projects.filter((project) => reviewStatuses.has(project.status)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(520px_360px_at_15%_10%,rgba(94,234,212,0.3),transparent_60%),radial-gradient(620px_380px_at_85%_-10%,rgba(59,130,246,0.35),transparent_55%)]" />
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(248,250,252,0.12)_1px,transparent_1px),linear-gradient(180deg,rgba(248,250,252,0.12)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        <div className="container relative z-10 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" />
                CMMI 專案管理
              </span>
              <h1 className="font-serif text-4xl md:text-5xl font-bold">專案開發看板</h1>
              <p className="text-lg text-slate-200 leading-relaxed">
                將需求、媒合、託管與交付串成一條可追溯的流程，讓團隊與客戶都能清楚看到每一步。
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/requirements"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/20 hover:bg-primary/90 transition"
                >
                  需求中心
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition"
                >
                  專案工作台
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <h3 className="font-serif text-xl font-bold text-white">即時概況</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs text-slate-300">進行中專案</p>
                  <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs text-slate-300">待簽核</p>
                  <p className="mt-2 text-2xl font-semibold">{reviewCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs text-slate-300">專案總量</p>
                  <p className="mt-2 text-2xl font-semibold">{totalProjects}</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                平台提供 AI 需求整理與流程控管，降低資訊落差並提升媒合效率。
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container space-y-8">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl font-bold">專案列表</h2>
              <p className="text-muted-foreground">
                以狀態、角色與關鍵字快速篩選，掌握每個節點進度與風險。
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex flex-1 items-center gap-2 rounded-xl border bg-white/90 px-3 py-2 text-sm">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="搜尋專案或客戶名稱"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-xl border bg-white/90 px-3 py-2 text-sm"
                >
                  <option value="all">全部狀態</option>
                  {Object.entries(projectStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              正在載入專案資料...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              尚無符合條件的專案。
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredProjects.map((project) => {
                const progress = progressMap[project.id];
                const devTotal = progress?.devTotal ?? 0;
                const devDone = progress?.devDone ?? 0;
                const verificationTotal = progress?.verificationTotal ?? 0;
                const verificationDone = progress?.verificationDone ?? 0;
                const devPercent = getChecklistPercent(devDone, devTotal);
                const verificationPercent = getChecklistPercent(verificationDone, verificationTotal);
                return (
              <div key={project.id} className="rounded-3xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">#{project.id.slice(0, 8)}</p>
                    <h3 className="mt-1 text-xl font-semibold">{project.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      需求：{project.requirement?.title ?? project.requirementId}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      getStatusTone(project.status)
                    }`}
                  >
                    {formatStatusLabel(project)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.length === 0 ? (
                    <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      尚未填寫關鍵標籤
                    </span>
                  ) : project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    階段：{formatStatusLabel(project)}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    更新：{project.updatedAt}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    客戶：{project.requirement?.companyName || "未提供"}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {devTotal ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>軟體開發進度：完成 {devDone}/{devTotal}</span>
                        <span>{devPercent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${devPercent}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">軟體開發進度：尚未產生清單</div>
                  )}
                  {verificationTotal ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>系統驗證進度：完成 {verificationDone}/{verificationTotal}</span>
                        <span>{verificationPercent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${verificationPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">系統驗證進度：尚未產生清單</div>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    需求：<span className="font-medium text-foreground">{project.requirementId.slice(0, 8)}</span>
                  </p>
                  <Link
                    href={`/workspace?project=${project.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                  >
                    前往工作台
                    <ArrowRight className="h-4 w-4" />
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
