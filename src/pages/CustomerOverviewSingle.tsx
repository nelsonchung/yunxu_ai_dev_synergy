import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flag,
  LayoutList,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";

const requirementInfo = {
  id: "REQ-2025-0021",
  title: "智慧客服系統升級",
  status: "媒合成功 / 進行中",
  updatedAt: "2025-02-14",
  team: "雲端開發團隊 A",
  projectId: "PRJ-2025-0102",
};

const documents = [
  {
    id: "DOC-01",
    type: "需求文件",
    title: "需求範圍與目標",
    version: "v3",
    status: "待簽核",
    owner: "平台 PM",
    updatedAt: "2025-02-12",
  },
  {
    id: "DOC-02",
    type: "系統架構文件",
    title: "系統架構與模組設計",
    version: "v2",
    status: "可閱讀",
    owner: "開發團隊",
    updatedAt: "2025-02-10",
  },
  {
    id: "DOC-03",
    type: "測試文件",
    title: "測試計畫與驗收腳本",
    version: "v1",
    status: "草稿",
    owner: "開發團隊",
    updatedAt: "2025-02-08",
  },
];

const tasks = [
  { id: "TASK-01", title: "客服流程盤點與痛點整理", status: "完成", owner: "平台 PM" },
  { id: "TASK-02", title: "系統架構圖與 API 規劃", status: "進行中", owner: "開發團隊" },
  { id: "TASK-03", title: "資料串接驗證", status: "待處理", owner: "開發團隊" },
];

const milestones = [
  { id: "MS-01", title: "需求文件簽核", date: "2025-02-18", status: "待完成" },
  { id: "MS-02", title: "系統架構文件審閱", date: "2025-02-24", status: "進行中" },
  { id: "MS-03", title: "第一版測試與驗收", date: "2025-03-08", status: "規劃中" },
];

const qualityReports = [
  {
    id: "QA-01",
    title: "AI Code Review #1",
    status: "已完成",
    updatedAt: "2025-02-11",
    summary: "核心 API 有 2 個潛在錯誤處理缺口。",
  },
  {
    id: "QA-02",
    title: "測試覆蓋率報告",
    status: "進行中",
    updatedAt: "2025-02-13",
    summary: "目前覆蓋率 68%，預計補強流程。",
  },
];

const sectionLinks = [
  { id: "overview", label: "專案概況" },
  { id: "documents", label: "文件與簽核" },
  { id: "collaboration", label: "協作細節" },
  { id: "quality", label: "品質交付" },
];

export default function CustomerOverviewSingle() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" />
              客戶視角 · 我的需求
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">{requirementInfo.title}</h1>
            <p className="text-muted-foreground">
              需求編號 {requirementInfo.id} · 更新 {requirementInfo.updatedAt}
            </p>
          </div>
          <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">目前狀態</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {requirementInfo.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">對接團隊：{requirementInfo.team}</div>
            <div className="text-sm text-muted-foreground">專案編號：{requirementInfo.projectId}</div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              查看最新更新 <ArrowUpRight className="ml-1 h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-4">
              <p className="text-sm font-semibold">導覽</p>
              <div className="space-y-2">
                {sectionLinks.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center justify-between rounded-2xl border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition"
                  >
                    {item.label}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
              <p className="text-sm font-semibold">下一個里程碑</p>
              <div className="rounded-2xl border bg-white/90 p-4 text-sm">
                <p className="font-semibold">{milestones[0].title}</p>
                <p className="text-muted-foreground">預計：{milestones[0].date}</p>
                <span className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {milestones[0].status}
                </span>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section id="overview" className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">專案概況</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">目前階段</p>
                  <p className="mt-2 text-lg font-semibold">系統設計</p>
                </div>
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">下一步</p>
                  <p className="mt-2 text-lg font-semibold">文件簽核</p>
                </div>
                <div className="rounded-2xl border bg-white/90 p-4">
                  <p className="text-xs text-muted-foreground">更新節奏</p>
                  <p className="mt-2 text-lg font-semibold">每週一次</p>
                </div>
              </div>
            </section>

            <section id="documents" className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">文件與簽核</h2>
              </div>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border bg-white/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{doc.type} · {doc.version}</p>
                        <p className="text-lg font-semibold">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">更新：{doc.updatedAt} · 來源：{doc.owner}</p>
                      </div>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        {doc.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition"
                      >
                        開啟編輯器
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
                      >
                        簽核同意
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition"
                      >
                        提出修改
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                <MessageSquare className="inline-block h-4 w-4" />  可在文件內留言，紀錄意見與回覆。
              </div>
            </section>

            <section id="collaboration" className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">協作細節</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <p className="text-sm font-semibold">任務列表</p>
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <span>{task.title}</span>
                      <span className="text-xs text-muted-foreground">{task.status}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                  <p className="text-sm font-semibold">里程碑</p>
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center justify-between text-sm">
                      <span>{milestone.title}</span>
                      <span className="text-xs text-muted-foreground">{milestone.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="quality" className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-serif text-2xl font-bold">品質交付</h2>
              </div>
              <div className="space-y-3">
                {qualityReports.map((report) => (
                  <div key={report.id} className="rounded-2xl border bg-white/90 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{report.title}</p>
                      <span className="text-xs text-muted-foreground">{report.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-4 w-4" /> {report.updatedAt}
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="inline-block h-4 w-4" />  最新測試報告已可下載。
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
