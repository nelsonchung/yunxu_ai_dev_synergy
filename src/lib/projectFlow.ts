export type ProjectRole = "customer" | "dev" | "admin";
export type PaymentStatus = "PENDING" | "ESCROWED" | "FAILED" | "EXPIRED" | "RELEASED";

export type GuardContext = {
  paymentStatus: PaymentStatus;
  guard: {
    scopeReviewAccepted: boolean;
    systemDesignApproved: boolean;
    testPlanApproved: boolean;
    releaseCandidateReady: boolean;
  };
};

export const roleLabels: Record<ProjectRole, string> = {
  customer: "客戶",
  dev: "開發團隊",
  admin: "管理者",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  PENDING: "等待託管",
  ESCROWED: "已託管",
  FAILED: "託管失敗",
  EXPIRED: "託管逾期",
  RELEASED: "已釋放",
};

export const projectPhases = [
  {
    title: "需求釐清",
    subtitle: "AI + 客戶需求範圍定案",
    statuses: [
      { name: "客戶已提出需求", role: "customer" },
      { name: "平台已初步分析需求", role: "admin" },
      { name: "需求範圍文件草案", role: "admin" },
      { name: "客戶 review 需求範圍", role: "customer" },
      { name: "客戶調整需求", role: "customer" },
      { name: "需求範圍文件完成", role: "admin" },
    ],
  },
  {
    title: "媒合啟動",
    subtitle: "報價與選商",
    statuses: [
      { name: "開始媒合", role: "admin" },
      { name: "客戶出價", role: "customer" },
      { name: "開發團隊出價", role: "dev" },
      { name: "媒合成功", role: "admin" },
    ],
  },
  {
    title: "方案規劃",
    subtitle: "託管完成後進入設計",
    statuses: [
      { name: "資金託管確認", role: "customer" },
      { name: "專案啟動", role: "dev" },
      { name: "撰寫系統開發文件", role: "dev" },
      { name: "撰寫軟體開發文件", role: "dev" },
      { name: "文件審閱完成", role: "customer" },
    ],
  },
  {
    title: "品質交付",
    subtitle: "測試與驗收",
    statuses: [
      { name: "撰寫測試計畫", role: "dev" },
      { name: "系統實作中", role: "dev" },
      { name: "測試執行與驗收", role: "customer" },
      { name: "開發完成", role: "dev" },
    ],
  },
] as const;

export const statusRoles: Record<string, ProjectRole> = projectPhases.reduce(
  (acc, phase) => {
    phase.statuses.forEach((status) => {
      acc[status.name] = status.role as ProjectRole;
    });
    return acc;
  },
  {} as Record<string, ProjectRole>
);

export const statusOrder: Record<string, number> = projectPhases.reduce(
  (acc, phase, phaseIndex) => {
    phase.statuses.forEach((status, index) => {
      acc[status.name] = phaseIndex * 100 + index;
    });
    return acc;
  },
  {} as Record<string, number>
);

export const statusTransitions: Record<string, string[]> = {
  "客戶已提出需求": ["平台已初步分析需求"],
  "平台已初步分析需求": ["需求範圍文件草案"],
  "需求範圍文件草案": ["客戶 review 需求範圍"],
  "客戶 review 需求範圍": ["客戶調整需求", "需求範圍文件完成"],
  "客戶調整需求": ["需求範圍文件草案"],
  "需求範圍文件完成": ["開始媒合"],
  "開始媒合": ["客戶出價"],
  "客戶出價": ["開發團隊出價"],
  "開發團隊出價": ["媒合成功"],
  "媒合成功": ["資金託管確認"],
  "資金託管確認": ["專案啟動", "開始媒合"],
  "專案啟動": ["撰寫系統開發文件"],
  "撰寫系統開發文件": ["撰寫軟體開發文件"],
  "撰寫軟體開發文件": ["文件審閱完成"],
  "文件審閱完成": ["撰寫測試計畫"],
  "撰寫測試計畫": ["系統實作中"],
  "系統實作中": ["測試執行與驗收"],
  "測試執行與驗收": ["開發完成", "系統實作中"],
};

type GuardRule = {
  message: string;
  check: (context: GuardContext) => boolean;
};

const transitionKey = (from: string, to: string) => `${from} -> ${to}`;

export const guardRules: Record<string, GuardRule> = {
  [transitionKey("資金託管確認", "專案啟動")]: {
    message: "等待款項託管完成。",
    check: (context) => context.paymentStatus === "ESCROWED",
  },
  [transitionKey("資金託管確認", "開始媒合")]: {
    message: "託管失敗或逾期，需重新媒合。",
    check: (context) => context.paymentStatus === "FAILED" || context.paymentStatus === "EXPIRED",
  },
  [transitionKey("撰寫系統開發文件", "撰寫軟體開發文件")]: {
    message: "需先上傳並核准系統開發文件。",
    check: (context) => context.guard.systemDesignApproved,
  },
  [transitionKey("客戶 review 需求範圍", "需求範圍文件完成")]: {
    message: "需要客戶完成 Review 並接受需求範圍。",
    check: (context) => context.guard.scopeReviewAccepted,
  },
  [transitionKey("系統實作中", "測試執行與驗收")]: {
    message: "測試計畫須核准且版本已提交。",
    check: (context) => context.guard.testPlanApproved && context.guard.releaseCandidateReady,
  },
};

export const getTransitionKey = transitionKey;
