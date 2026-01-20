import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { FileText, ShieldCheck, Users, Workflow } from "lucide-react";

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

export default function DemandSection() {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeFlow = useMemo(() => inquiryFlow[activeFlowIndex], [activeFlowIndex]);

  const handleSubmitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setInquiryStatus("已收到您的需求，我們將在 1 個工作日內與您聯繫。");
    }, 300);
  };

  return (
    <section className="scroll-mt-24 py-20 bg-gradient-to-b from-background via-secondary/40 to-background">
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
            <form
              onSubmit={handleSubmitInquiry}
              onChange={() => inquiryStatus && setInquiryStatus("")}
              className="space-y-6"
            >
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
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "送出中..." : "送出需求"}
              </button>

              {inquiryStatus ? (
                <p className="text-sm text-primary">{inquiryStatus}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  提交後 1 個工作日內回覆，若有緊急需求請備註。
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
