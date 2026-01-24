import { useMemo, useState } from "react";
import {
  BadgeCheck,
  ClipboardList,
  FileText,
  LayoutGrid,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const tabs = [
  { id: "project", label: "專案概況", icon: LayoutGrid },
  { id: "documents", label: "文件與簽核", icon: FileText },
  { id: "collaboration", label: "協作細節", icon: ClipboardList },
  { id: "quality", label: "品質交付", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];

const documents = [
  { title: "需求文件 v3", status: "待簽核", owner: "平台 PM" },
  { title: "系統架構文件 v2", status: "可閱讀", owner: "開發團隊" },
  { title: "測試文件 v1", status: "草稿", owner: "開發團隊" },
];

const tasks = [
  { title: "系統架構圖與 API 規劃", status: "進行中" },
  { title: "資料串接驗證", status: "待處理" },
  { title: "驗收流程對齊", status: "待處理" },
];

const milestones = [
  { title: "需求文件簽核", date: "2025-02-18" },
  { title: "系統架構文件審閱", date: "2025-02-24" },
  { title: "第一版驗收", date: "2025-03-08" },
];

const qualityReports = [
  { title: "AI Code Review #1", summary: "核心 API 有 2 個潛在錯誤處理缺口。" },
  { title: "測試覆蓋率報告", summary: "目前覆蓋率 68%，預計補強流程。" },
];

export default function CustomerOverviewTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("project");

  const activeLabel = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab)?.label ?? "";
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/30 to-background">
      <section className="container py-12 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              <BadgeCheck className="h-4 w-4" />
              客戶視角 · 我的需求
            </span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">智慧客服系統升級</h1>
            <p className="text-muted-foreground">需求編號 REQ-2025-0021 · 更新 2025-02-14</p>
          </div>
          <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-3">
            <div className="text-sm text-muted-foreground">狀態：媒合成功 / 進行中</div>
            <div className="text-sm text-muted-foreground">對接團隊：雲端開發團隊 A</div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              立即簽核最新文件
            </button>
          </div>
        </div>

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
                <p className="text-xs text-muted-foreground">開發進度</p>
                <p className="mt-2 text-lg font-semibold">45%</p>
              </div>
            </div>
          ) : null}

          {activeTab === "documents" ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.title} className="rounded-2xl border bg-white/90 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{doc.title}</p>
                    <span className="text-xs text-muted-foreground">{doc.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">提供者：{doc.owner}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
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
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "collaboration" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                <p className="text-sm font-semibold">任務列表</p>
                {tasks.map((task) => (
                  <div key={task.title} className="flex items-center justify-between text-sm">
                    <span>{task.title}</span>
                    <span className="text-xs text-muted-foreground">{task.status}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border bg-white/90 p-4 space-y-3">
                <p className="text-sm font-semibold">里程碑</p>
                {milestones.map((milestone) => (
                  <div key={milestone.title} className="flex items-center justify-between text-sm">
                    <span>{milestone.title}</span>
                    <span className="text-xs text-muted-foreground">{milestone.date}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "quality" ? (
            <div className="space-y-3">
              {qualityReports.map((report) => (
                <div key={report.title} className="rounded-2xl border bg-white/90 p-4">
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.summary}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
