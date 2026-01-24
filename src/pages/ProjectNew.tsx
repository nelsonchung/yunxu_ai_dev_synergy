import { Sparkles, Wand2, FileText, CheckCircle2, Users, Workflow } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const aiSuggestions = [
  "目標：建立可視化排程看板與即時通知。",
  "使用者：倉儲主管、調度員、客服。",
  "關鍵指標：排程準確率、派工效率、延遲預警。",
  "整合系統：ERP、WMS、即時定位模組。",
];

const flowPreview = [
  {
    title: "需求釐清",
    description: "整理需求範圍、AI 產出草案，客戶確認。",
    icon: FileText,
  },
  {
    title: "媒合啟動",
    description: "建立報價區間，完成媒合與託管。",
    icon: Users,
  },
  {
    title: "方案規劃",
    description: "產出 SDD/SRS 文件並完成審閱。",
    icon: Workflow,
  },
  {
    title: "品質交付",
    description: "完成測試計畫、實作與驗收。",
    icon: CheckCircle2,
  },
];

export default function ProjectNew() {
  const [showAiDraft, setShowAiDraft] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/40 to-background">
      <section className="container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                新增需求
              </span>
              <Link
                href="/projects"
                className="text-sm text-muted-foreground hover:text-primary transition"
              >
                返回專案列表
              </Link>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold">建立新的專案需求</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              提供核心需求與背景資訊，我們會以 AI 輔助整理需求範圍與文件草案，進入媒合與交付流程。
            </p>

            <div className="rounded-3xl border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl font-bold">流程預覽</h2>
              <div className="mt-4 grid gap-4">
                {flowPreview.map((step) => (
                  <div key={step.title} className="flex items-start gap-4 rounded-2xl border bg-white/90 p-4">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-8 shadow-lg space-y-6">
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold">需求表單</h2>
              <p className="text-sm text-muted-foreground">
                填寫越完整，AI 產出的規格文件越精準。
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                專案名稱
                <input
                  type="text"
                  placeholder="例如：智能供應鏈排程平台"
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                客戶名稱
                <input
                  type="text"
                  placeholder="例如：曜晟物流"
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                預估預算
                <select className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>50 - 150 萬</option>
                  <option>150 - 300 萬</option>
                  <option>300 萬以上</option>
                  <option>尚未確認</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                交付時程
                <select className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>1-2 個月</option>
                  <option>3-6 個月</option>
                  <option>6 個月以上</option>
                  <option>未定</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium">
              需求描述
              <textarea
                rows={5}
                placeholder="描述專案背景、目前痛點與期望成效"
                className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>

            <div className="rounded-2xl border border-dashed bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">✨ AI 幫我完善需求</p>
                  <p className="text-sm text-muted-foreground">
                    產出條列規格與驗收要點，作為需求範圍草案。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiDraft((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition"
                >
                  <Wand2 className="h-4 w-4" />
                  產出草案
                </button>
              </div>
              {showAiDraft ? (
                <div className="mt-4 rounded-xl border bg-white/90 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">AI 草案摘要</p>
                  <ul className="mt-2 space-y-2">
                    {aiSuggestions.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition"
            >
              建立專案需求
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
