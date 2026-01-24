import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { FileText, ShieldCheck, Users, Workflow } from "lucide-react";
import { createRequirement } from "@/lib/platformClient";
import { getSession } from "@/lib/authClient";
import { getMyPermissions } from "@/lib/permissionsClient";

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
const specDocOptions = ["已有規格文件", "有部分資料", "尚未準備"];

export default function DemandSection() {
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [inquiryStatus, setInquiryStatus] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const [submitResult, setSubmitResult] = useState<{
    id: string;
    status: string;
    documentId: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountRole, setAccountRole] = useState<string | null>(null);
  const [canSubmitRequirement, setCanSubmitRequirement] = useState(false);
  const [formState, setFormState] = useState({
    title: "",
    companyName: "",
    projectType: "",
    budgetRange: "",
    timeline: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    background: "",
    goals: "",
    scope: "",
    constraints: "",
    specDoc: "",
    attachments: "",
  });
  const activeFlow = useMemo(() => inquiryFlow[activeFlowIndex], [activeFlowIndex]);

  const loadPermissions = async () => {
    const session = await getSession();
    setAccountRole(session?.role ?? null);
    if (!session) {
      setCanSubmitRequirement(false);
      return;
    }
    try {
      const permissionData = await getMyPermissions();
      setCanSubmitRequirement(
        session.role === "admin" || permissionData.permissions.includes("requirements.create")
      );
    } catch {
      setCanSubmitRequirement(session.role === "admin");
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const resetFeedback = () => {
    setInquiryStatus("");
    setInquiryError("");
    setSubmitResult(null);
  };

  const handleSubmitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!canSubmitRequirement) {
      setInquiryError(accountRole ? "目前角色無法提交需求，請洽管理者調整權限。" : "請先登入客戶帳號後提交需求。");
      return;
    }

    if (
      !formState.title.trim() ||
      !formState.background.trim() ||
      !formState.goals.trim() ||
      !formState.scope.trim() ||
      !formState.contactName.trim() ||
      !formState.contactEmail.trim()
    ) {
      setInquiryError("請填寫專案名稱、需求背景、目標、範圍與聯絡資訊。");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.contactEmail.trim())) {
      setInquiryError("聯絡 Email 格式不正確。");
      return;
    }

    const attachments = formState.attachments
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      const result = await createRequirement({
        title: formState.title.trim(),
        companyName: formState.companyName.trim(),
        projectType: formState.projectType.trim(),
        background: formState.background.trim(),
        goals: formState.goals.trim(),
        scope: formState.scope.trim(),
        constraints: formState.constraints.trim(),
        budgetRange: formState.budgetRange.trim(),
        timeline: formState.timeline.trim(),
        specDoc: formState.specDoc.trim(),
        attachments,
        contact: {
          name: formState.contactName.trim(),
          email: formState.contactEmail.trim(),
          phone: formState.contactPhone.trim(),
        },
      });
      setSubmitResult({
        id: result.id,
        status: result.status,
        documentId: result.document_id,
      });
      setInquiryStatus("需求已送出，我們將進一步彙整文件並安排簽核。");
    } catch (error) {
      setInquiryError(error instanceof Error ? error.message : "送出需求失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
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
              onChange={resetFeedback}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold">需求表單</h3>
                <p className="text-sm text-muted-foreground">
                  請盡量填寫完整資訊，方便我們快速媒合合適的團隊。
                </p>
              </div>
              {!canSubmitRequirement ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  {accountRole
                    ? "目前角色無法提交需求，請洽管理者調整權限。"
                    : "請先登入客戶帳號後提交需求。"}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  需求主題
                  <input
                    type="text"
                    name="title"
                    placeholder="例如：智慧物流排程平台"
                    required
                    value={formState.title}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  公司 / 單位名稱
                  <input
                    type="text"
                    name="companyName"
                    placeholder="例如：鋆旭科技"
                    value={formState.companyName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  聯絡人姓名
                  <input
                    type="text"
                    name="contactName"
                    placeholder="請輸入您的姓名"
                    required
                    value={formState.contactName}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  聯絡 Email
                  <input
                    type="email"
                    name="contactEmail"
                    placeholder="name@company.com"
                    required
                    value={formState.contactEmail}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  聯絡電話
                  <input
                    type="tel"
                    name="contactPhone"
                    placeholder="請輸入聯絡電話"
                    value={formState.contactPhone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  專案類型
                  <select
                    name="projectType"
                    value={formState.projectType}
                    onChange={handleChange}
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
                    name="budgetRange"
                    value={formState.budgetRange}
                    onChange={handleChange}
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
                    value={formState.timeline}
                    onChange={handleChange}
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
                    value={formState.specDoc}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="" disabled>
                      請選擇
                    </option>
                    {specDocOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium">
                需求背景
                <textarea
                  name="background"
                  rows={3}
                  placeholder="描述需求背景與現況"
                  required
                  value={formState.background}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                專案目標
                <textarea
                  name="goals"
                  rows={3}
                  placeholder="描述期望達成的目標與成效"
                  required
                  value={formState.goals}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                功能範圍
                <textarea
                  name="scope"
                  rows={4}
                  placeholder="描述需求範圍與核心功能"
                  required
                  value={formState.scope}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                限制與備註
                <textarea
                  name="constraints"
                  rows={3}
                  placeholder="例如：既有系統限制、期望技術、法規等"
                  value={formState.constraints}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                附件 / 參考資料（可用換行或逗號分隔）
                <textarea
                  name="attachments"
                  rows={3}
                  placeholder="例如：現有文件連結、簡報或規格"
                  value={formState.attachments}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-white/90 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || !canSubmitRequirement}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-black/10 hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "送出中..." : "送出需求"}
              </button>

              {inquiryError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {inquiryError}
                </div>
              ) : null}
              {submitResult ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 space-y-2">
                  <p>{inquiryStatus}</p>
                  <p>需求編號：{submitResult.id}</p>
                  <p>文件編號：{submitResult.documentId}</p>
                  <Link
                    href={`/my/requirements/${submitResult.id}`}
                    className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    前往需求詳情查看
                  </Link>
                </div>
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
