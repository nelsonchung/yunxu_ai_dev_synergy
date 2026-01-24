import { ArrowRight, BarChart3, CalendarDays, Layers, Search, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { paymentStatusLabels, projects } from "@/lib/projectData";

const statusBadgeStyles: Record<string, string> = {
  "資金託管確認": "border-amber-200 bg-amber-50 text-amber-700",
  "系統實作中": "border-sky-200 bg-sky-50 text-sky-700",
  "客戶 review 需求範圍": "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function Projects() {
  const totalProjects = projects.length;
  const escrowCount = projects.filter((project) => project.paymentStatus === "PENDING").length;
  const activeCount = projects.filter((project) => project.status !== "開發完成").length;

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
                  href="/projects/new"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/20 hover:bg-primary/90 transition"
                >
                  新增需求
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/request"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition"
                >
                  需求對談入口
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
                  <p className="text-xs text-slate-300">待託管</p>
                  <p className="mt-2 text-2xl font-semibold">{escrowCount}</p>
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
                    className="w-full bg-transparent focus:outline-none"
                  />
                </div>
                <select className="rounded-xl border bg-white/90 px-3 py-2 text-sm">
                  <option>全部狀態</option>
                  <option>需求釐清</option>
                  <option>媒合啟動</option>
                  <option>方案規劃</option>
                  <option>品質交付</option>
                </select>
                <select className="rounded-xl border bg-white/90 px-3 py-2 text-sm">
                  <option>全部角色</option>
                  <option>客戶</option>
                  <option>開發團隊</option>
                  <option>管理者</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-3xl border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">#{project.id}</p>
                    <h3 className="mt-1 text-xl font-semibold">{project.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      statusBadgeStyles[project.status] ?? "border-primary/20 bg-primary/10 text-primary"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    階段：{project.phase}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    更新：{project.updatedAt}
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    進度：{project.progress}%
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    託管：{paymentStatusLabels[project.paymentStatus]}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    客戶：<span className="font-medium text-foreground">{project.customerName}</span>
                  </p>
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition"
                  >
                    查看詳情
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
