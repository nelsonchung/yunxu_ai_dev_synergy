import type { FormEvent } from "react";
import { useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Cpu,
  FileCode2,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

const metrics = [
  { label: "對齊需求", value: "標準化規格文件" },
  { label: "可視化進度", value: "里程碑交付" },
  { label: "品質保證", value: "AI + 人工雙重驗證" },
];

const heroSteps = [
  {
    title: "需求對齊",
    description: "訪談澄清需求，產出規格文件，形成一致共識。",
    icon: FileText,
  },
  {
    title: "媒合評估",
    description: "建立系統開發文件，技術、預算與時程精準匹配。",
    icon: Workflow,
  },
  {
    title: "協作開發",
    description: "導入 AI 輔助，將實作項目條列化、追蹤與迭代。",
    icon: FileCode2,
  },
  {
    title: "品質交付",
    description: "建立測試文件與檢核報告，確保版本品質。",
    icon: ShieldCheck,
  },
];

const coreValues = [
  {
    title: "需求標準化",
    description: "以模板與 AI 梳理需求，避免資訊落差並加速估工。",
    icon: ClipboardCheck,
  },
  {
    title: "進度可視化",
    description: "以里程碑與驗收條件管理進度，降低溝通成本。",
    icon: TrendingUp,
  },
  {
    title: "品質控管",
    description: "AI 輔助審查與測試，交付可驗證且可追溯。",
    icon: ShieldCheck,
  },
];

const processSteps = [
  {
    index: "01",
    title: "需求管理",
    description: "收斂需求範圍，建立規格文件與確認流程。",
  },
  {
    index: "02",
    title: "專案規劃",
    description: "定義里程碑、風險評估、資源與時程。",
  },
  {
    index: "03",
    title: "工程實作",
    description: "任務拆分、版本控管、開發協作。",
  },
  {
    index: "04",
    title: "驗證與測試",
    description: "AI 輔助測試、品質檢核與缺陷追蹤。",
  },
  {
    index: "05",
    title: "交付與驗收",
    description: "交付文件齊全、可維護與可延展。",
  },
  {
    index: "06",
    title: "持續改善",
    description: "回饋分析與流程優化，提升成熟度。",
  },
];

const aiRoles = [
  {
    title: "給客戶",
    description: "需求清楚、進度透明、交付可驗證，降低溝通成本。",
  },
  {
    title: "給開發者",
    description: "AI 協作讓開發更聚焦在架構與核心功能。",
  },
  {
    title: "給管理者",
    description: "里程碑與品質指標可量化，便於風險控管與決策。",
  },
];

const collaborationModes = [
  {
    title: "專案媒合",
    description: "一次性專案，明確範疇與里程碑交付。",
  },
  {
    title: "長期技術夥伴",
    description: "以團隊協作模式支援持續迭代。",
  },
  {
    title: "AI 加值支援",
    description: "導入 AI 工作流，加速開發與驗證。",
  },
];

const inquiryFlow = [
  {
    title: "需求初談",
    description: "確認核心目標與範疇，產出需求摘要與關鍵指標。",
    outputs: ["需求摘要", "關鍵成功指標", "現況痛點清單"],
    icon: FileText,
  },
  {
    title: "方案規劃",
    description: "建立系統藍圖與里程碑，初步估算時程與預算。",
    outputs: ["系統架構草案", "里程碑規劃", "預估資源配置"],
    icon: Workflow,
  },
  {
    title: "媒合啟動",
    description: "依需求文件媒合合適團隊，進入協作與開發節奏。",
    outputs: ["團隊媒合名單", "合作模式確認", "啟動會議排程"],
    icon: Users,
  },
  {
    title: "品質交付",
    description: "AI + 人工雙重檢核，交付測試報告與驗收清單。",
    outputs: ["測試檢核報告", "交付文件包", "驗收標準對照"],
    icon: ShieldCheck,
  },
];

const projectTypes = [
  "新系統建置",
  "既有系統擴充",
  "系統重構 / 遷移",
  "AI 導入評估",
  "其他",
];

const budgetOptions = [
  "50 萬以下",
  "50 - 150 萬",
  "150 - 300 萬",
  "300 萬以上",
  "尚未確認",
];

const timelineOptions = ["1-2 個月", "3-6 個月", "6 個月以上", "未定"];

export default function Home() {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const activeFlow = inquiryFlow[activeFlowIndex];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const handleFormChange = () => {
    if (submitted) setSubmitted(false);
  };

  return (
    <div id="top">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_10%_10%,rgba(56,189,248,0.28),transparent_60%),radial-gradient(560px_360px_at_88%_-10%,rgba(31,182,166,0.35),transparent_55%)]" />
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(248,250,252,0.1)_1px,transparent_1px),linear-gradient(180deg,rgba(248,250,252,0.1)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>
        <div className="container relative z-10 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4" />AI + CMMI 流程思維
              </span>
              <h1 className="font-serif text-4xl md:text-6xl font-bold leading-tight">
                鋆旭 AI-Dev
                <br />
                軟體系統媒合平台
              </h1>
              <p className="text-lg md:text-xl text-slate-200 leading-relaxed">
                以 CMMI 標準化開發流程為骨架，結合 AI 需求澄清、估工與品質檢核，
                讓發案、協作與交付更快更準、更可控。
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/20 hover:bg-primary/90 transition"
                >
                  立即提交需求
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
                <a
                  href="#core"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition"
                >
                  了解平台理念
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 pt-4">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                    <span className="text-sm text-slate-300">{metric.label}</span>
                    <p className="text-base font-semibold text-white mt-1">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <h3 className="font-serif text-xl font-bold text-white">一頁看懂 AI-Dev 流程</h3>
              <div className="mt-4 space-y-4">
                {heroSteps.map((step) => (
                  <div
                    key={step.title}
                    className="flex gap-4 border-b border-white/10 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-sky-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{step.title}</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="core" className="scroll-mt-24 py-20 bg-gradient-to-b from-background via-secondary/60 to-background">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div className="space-y-5 reveal">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">核心理念：標準流程 × AI 協作</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                鋆旭 AI-Dev 參考 CMMI 管理模型，透過可重複、可追溯的流程串起需求、開發與交付。
                對外提供一致的需求文件與透明交付節奏；對內以 AI 提升規格撰寫、估工與測試的準確度。
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {coreValues.map((value, index) => (
                <div
                  key={value.title}
                  className={`bg-card rounded-2xl border shadow-sm p-6 space-y-4 reveal reveal-delay-${index + 1}`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-bold">{value.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="scroll-mt-24 py-20">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5 reveal">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">CMMI 對齊的開發流程</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                不只是接案，而是以流程化管理確保每個階段都可被追蹤、驗證與改善。
              </p>
              <div className="rounded-2xl border bg-secondary/50 p-6">
                <div className="flex items-center gap-3">
                  <Cpu className="h-6 w-6 text-primary" />
                  <p className="font-semibold">AI 介入每個流程節點</p>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  文件撰寫、估工、程式碼審查與測試產出皆有 AI 協作，確保節點輸出一致與可追溯。
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {processSteps.map((step, index) => (
                <div
                  key={step.index}
                  className={`flex gap-4 rounded-2xl border bg-card p-5 shadow-sm reveal reveal-delay-${(index % 4) + 1}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {step.index}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="ai" className="scroll-mt-24 py-20 bg-secondary/50">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] items-center">
            <div className="space-y-6 reveal">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">AI 在每個環節的加速角色</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                AI 不只是工具，而是流程中的「加速器」：協助文件撰寫、加速系統開發速度、
                測試更完整、讓交付版本品質更上一層樓。
              </p>
              <div className="rounded-2xl border bg-card p-6">
                <h3 className="font-semibold text-lg">AI 協作能力清單</h3>
                <ul className="mt-3 space-y-2 text-muted-foreground text-sm">
                  <li>需求訪談摘要、文件撰寫與功能拆解</li>
                  <li>AI 程式碼開發與規範檢核</li>
                  <li>測試案例生成與品質報告</li>
                  <li>交付文件自動整理與版本記錄</li>
                </ul>
              </div>
            </div>
            <div className="grid gap-4">
              {aiRoles.map((role, index) => (
                <div
                  key={role.title}
                  className={`bg-card rounded-2xl border p-5 shadow-sm reveal reveal-delay-${index + 1}`}
                >
                  <h3 className="font-semibold text-lg">{role.title}</h3>
                  <p className="text-muted-foreground text-sm mt-2">{role.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="collaboration" className="scroll-mt-24 py-20">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5 reveal">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">合作模式</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                彈性媒合不同規模的專案需求，從 MVP 到企業系統皆可快速啟動。
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {collaborationModes.map((mode, index) => (
                <div
                  key={mode.title}
                  className={`bg-card rounded-2xl border p-6 shadow-sm reveal reveal-delay-${index + 1}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{mode.title}</h3>
                  <p className="text-muted-foreground text-sm mt-2">{mode.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="brand" className="scroll-mt-24 py-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-6 reveal">
              <h2 className="font-serif text-3xl md:text-4xl font-bold">品牌介紹</h2>
              <p className="text-slate-200 text-lg leading-relaxed">
                鋆旭 AI-Dev 是以軟體系統媒合為核心的協作平台，結合 CMMI 流程與 AI 工具，
                讓需求澄清、系統設計、開發交付到品質驗證都具備一致標準。
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1">需求可追溯</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1">交付可驗證</span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1">流程可量化</span>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
              <h3 className="font-semibold text-lg">平台承諾</h3>
              <ul className="mt-4 space-y-3 text-slate-200 text-sm">
                <li>以文件化流程建立需求共識，縮短決策時間。</li>
                <li>媒合最適開發團隊，降低人力與時程風險。</li>
                <li>以 AI 協作強化品質檢核，讓交付更安心。</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container">
          <div className="rounded-3xl bg-primary text-primary-foreground p-8 md:p-12 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="font-serif text-3xl font-bold">準備好讓需求對齊、流程可控、交付可驗證？</h2>
              <p className="mt-2 text-primary-foreground/80">
                鋆旭 AI-Dev 讓軟體外包合作更安心、更高效。
              </p>
            </div>
            <a
              href="#contact"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-white/90 transition"
            >
              立即諮詢需求
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24 py-20 bg-gradient-to-b from-background via-secondary/40 to-background">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] items-start">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                提交需求
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">讓我們了解你的專案</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                填寫需求後，我們會以 CMMI 流程整理需求、提出媒合與開發建議，並安排下一步的需求對談。
              </p>

              <div className="grid gap-4">
                {inquiryFlow.map((step, index) => (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setActiveFlowIndex(index)}
                    className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition ${
                      activeFlowIndex === index
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center border">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border bg-card p-6">
                <p className="text-sm text-muted-foreground">目前選擇：{activeFlow.title}</p>
                <p className="mt-2 font-semibold">這階段的產出</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {activeFlow.outputs.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-8 shadow-lg">
              <form onSubmit={handleSubmit} onChange={handleFormChange} className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-serif text-2xl font-bold">需求表單</h3>
                  <p className="text-sm text-muted-foreground">
                    請盡量填寫完整資訊，方便我們快速媒合合適的團隊。
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    公司 / 單位名稱
                    <input
                      type="text"
                      name="company"
                      placeholder="例如：鋆旭科技"
                      required
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    聯絡人姓名
                    <input
                      type="text"
                      name="name"
                      placeholder="請輸入您的姓名"
                      required
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    聯絡 Email
                    <input
                      type="email"
                      name="email"
                      placeholder="name@company.com"
                      required
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    聯絡電話
                    <input
                      type="tel"
                      name="phone"
                      placeholder="請輸入聯絡電話"
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    專案類型
                    <select
                      name="projectType"
                      defaultValue=""
                      required
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>
                        請選擇
                      </option>
                      {projectTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    預算範圍
                    <select
                      name="budget"
                      defaultValue=""
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>
                        請選擇
                      </option>
                      {budgetOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium">
                    預計時程
                    <select
                      name="timeline"
                      defaultValue=""
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>
                        請選擇
                      </option>
                      {timelineOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm font-medium">
                    是否已有規格文件
                    <select
                      name="specDoc"
                      defaultValue=""
                      className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="" disabled>
                        請選擇
                      </option>
                      <option value="有">已有規格文件</option>
                      <option value="部分">有部分資料</option>
                      <option value="無">尚未準備</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-2 text-sm font-medium">
                  需求描述
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="請描述需求背景、核心功能、期待成果..."
                    required
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <div className="rounded-2xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
                  建議準備：現有文件 / 預期目標 / 預算範圍 / 時程需求，能讓媒合更快更準。
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition"
                >
                  送出需求
                </button>

                {submitted ? (
                  <p role="status" className="text-sm text-primary">
                    已收到您的需求，我們將在 1 個工作日內與您聯繫。
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">提交後 1 個工作日內回覆，若有緊急需求請備註。</p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
