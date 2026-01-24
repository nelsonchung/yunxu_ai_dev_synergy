import type { GuardContext, PaymentStatus, ProjectRole } from "@/lib/projectFlow";

export type ProjectSummary = GuardContext & {
  id: string;
  name: string;
  customerName: string;
  summary: string;
  phase: string;
  status: string;
  updatedAt: string;
  tags: string[];
  budget: string;
  timeline: string;
  progress: number;
  ownerRole: ProjectRole;
};

export type ProjectDocument = {
  id: string;
  type: string;
  title: string;
  status: "DRAFT" | "REVIEW" | "APPROVED";
  updatedAt: string;
  owner: string;
  version: string;
};

export type ProjectStatusLog = {
  status: string;
  actor: string;
  note: string;
  time: string;
};

const baseGuard = {
  scopeReviewAccepted: false,
  systemDesignApproved: false,
  testPlanApproved: false,
  releaseCandidateReady: false,
};

export const projects: ProjectSummary[] = [
  {
    id: "yx-241",
    name: "智能供應鏈 AI 排程平台",
    customerName: "曜晟物流",
    summary: "整合需求訪談、媒合、開發與驗收，建立可追蹤的排程平台。",
    phase: "方案規劃",
    status: "資金託管確認",
    updatedAt: "2026/01/21 16:30",
    tags: ["AI 排程", "物流", "SaaS"],
    budget: "150 - 300 萬",
    timeline: "3-6 個月",
    progress: 42,
    ownerRole: "admin",
    paymentStatus: "PENDING",
    guard: { ...baseGuard, scopeReviewAccepted: true },
  },
  {
    id: "yx-198",
    name: "智慧零售會員 CRM 重構",
    customerName: "樂購零售",
    summary: "以模組化 API 重構會員體驗與跨店資料整合。",
    phase: "品質交付",
    status: "系統實作中",
    updatedAt: "2026/01/22 10:05",
    tags: ["CRM", "API", "多店"],
    budget: "300 萬以上",
    timeline: "6 個月以上",
    progress: 68,
    ownerRole: "dev",
    paymentStatus: "ESCROWED",
    guard: { ...baseGuard, systemDesignApproved: true, testPlanApproved: true },
  },
  {
    id: "yx-162",
    name: "B2B 商務平台需求釐清",
    customerName: "凱宸貿易",
    summary: "完成需求範圍文件草案，準備進入客戶 Review。",
    phase: "需求釐清",
    status: "客戶 review 需求範圍",
    updatedAt: "2026/01/20 09:40",
    tags: ["B2B", "電商", "需求訪談"],
    budget: "50 - 150 萬",
    timeline: "1-2 個月",
    progress: 18,
    ownerRole: "customer",
    paymentStatus: "PENDING",
    guard: { ...baseGuard },
  },
];

export const projectDocuments: Record<string, ProjectDocument[]> = {
  "yx-241": [
    {
      id: "doc-scope-241",
      type: "需求範圍文件",
      title: "Scope V1",
      status: "APPROVED",
      updatedAt: "2026/01/20",
      owner: "平台 PM",
      version: "v1.2",
    },
    {
      id: "doc-sdd-241",
      type: "系統開發文件",
      title: "SDD Draft",
      status: "DRAFT",
      updatedAt: "2026/01/22",
      owner: "架構師",
      version: "v0.4",
    },
  ],
  "yx-198": [
    {
      id: "doc-sdd-198",
      type: "系統開發文件",
      title: "SDD Final",
      status: "APPROVED",
      updatedAt: "2026/01/18",
      owner: "架構師",
      version: "v1.0",
    },
    {
      id: "doc-srs-198",
      type: "軟體開發文件",
      title: "SRS Final",
      status: "APPROVED",
      updatedAt: "2026/01/19",
      owner: "技術 PM",
      version: "v1.0",
    },
    {
      id: "doc-test-198",
      type: "測試計畫",
      title: "Test Plan",
      status: "APPROVED",
      updatedAt: "2026/01/20",
      owner: "QA Lead",
      version: "v0.9",
    },
  ],
  "yx-162": [
    {
      id: "doc-scope-162",
      type: "需求範圍文件",
      title: "Scope Draft",
      status: "REVIEW",
      updatedAt: "2026/01/19",
      owner: "平台 PM",
      version: "v0.7",
    },
  ],
};

export const projectStatusLogs: Record<string, ProjectStatusLog[]> = {
  "yx-241": [
    {
      status: "需求範圍文件完成",
      actor: "平台 PM",
      note: "完成需求範圍並送出媒合。",
      time: "2026/01/19 14:12",
    },
    {
      status: "媒合成功",
      actor: "管理者",
      note: "雙方確認報價與時程。",
      time: "2026/01/20 16:30",
    },
    {
      status: "資金託管確認",
      actor: "管理者",
      note: "等待客戶完成託管。",
      time: "2026/01/21 09:10",
    },
  ],
  "yx-198": [
    {
      status: "文件審閱完成",
      actor: "客戶",
      note: "確認系統與軟體文件。",
      time: "2026/01/18 12:05",
    },
    {
      status: "撰寫測試計畫",
      actor: "QA Lead",
      note: "提交測試計畫並核准。",
      time: "2026/01/19 18:40",
    },
    {
      status: "系統實作中",
      actor: "開發團隊",
      note: "進入核心功能實作。",
      time: "2026/01/22 10:05",
    },
  ],
  "yx-162": [
    {
      status: "平台已初步分析需求",
      actor: "平台 PM",
      note: "完成需求訪談摘要。",
      time: "2026/01/17 09:30",
    },
    {
      status: "需求範圍文件草案",
      actor: "平台 PM",
      note: "送出初版 scope 草案。",
      time: "2026/01/18 15:20",
    },
    {
      status: "客戶 review 需求範圍",
      actor: "客戶",
      note: "目前正在 review。",
      time: "2026/01/20 09:40",
    },
  ],
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "等待託管",
  ESCROWED: "已託管",
  FAILED: "託管失敗",
  EXPIRED: "託管逾期",
  RELEASED: "已釋放",
};

export const getProjectById = (id: string) => projects.find((project) => project.id === id);
