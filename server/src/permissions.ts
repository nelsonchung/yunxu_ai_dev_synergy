import type { UserRole } from "./store.js";

export type PermissionDefinition = {
  id: string;
  label: string;
  description: string;
  category: string;
};

export const permissionDefinitions = [
  {
    id: "requirements.create",
    label: "提交需求",
    description: "建立需求並產出需求文件",
    category: "需求",
  },
  {
    id: "requirements.documents.manage",
    label: "編修需求文件",
    description: "新增或更新需求文件版本",
    category: "需求",
  },
  {
    id: "requirements.documents.review",
    label: "簽核需求文件",
    description: "簽核或留言需求文件版本",
    category: "需求",
  },
  {
    id: "projects.create",
    label: "建立專案",
    description: "依需求建立專案並啟動流程",
    category: "專案",
  },
  {
    id: "projects.status.manage",
    label: "更新專案狀態",
    description: "依流程更新專案狀態",
    category: "專案",
  },
  {
    id: "projects.documents.requirement",
    label: "撰寫需求文件",
    description: "建立/更新需求類型的專案文件",
    category: "文件中心",
  },
  {
    id: "projects.documents.system",
    label: "撰寫系統架構文件",
    description: "建立/更新系統架構與設計文件",
    category: "文件中心",
  },
  {
    id: "projects.documents.software",
    label: "撰寫軟體設計文件",
    description: "建立/更新軟體設計與實作規格",
    category: "文件中心",
  },
  {
    id: "projects.documents.test",
    label: "撰寫測試文件",
    description: "建立/更新測試計畫與紀錄",
    category: "文件中心",
  },
  {
    id: "projects.documents.delivery",
    label: "撰寫使用說明文件",
    description: "建立/更新使用說明文件",
    category: "文件中心",
  },
  {
    id: "projects.documents.review",
    label: "簽核專案文件",
    description: "簽核或留言專案文件版本",
    category: "文件中心",
  },
  {
    id: "projects.tasks.manage",
    label: "管理任務",
    description: "建立與更新任務狀態",
    category: "協作開發",
  },
  {
    id: "projects.milestones.manage",
    label: "管理里程碑",
    description: "建立與更新里程碑",
    category: "協作開發",
  },
  {
    id: "quality.reports.view",
    label: "查看品質報告",
    description: "查看測試與 code review 報告",
    category: "品質交付",
  },
] as const satisfies PermissionDefinition[];

export type PermissionId = (typeof permissionDefinitions)[number]["id"];

export type RolePermissions = {
  customer: PermissionId[];
  developer: PermissionId[];
};

export const defaultRolePermissions: RolePermissions = {
  customer: [
    "requirements.create",
    "requirements.documents.manage",
    "requirements.documents.review",
    "projects.documents.review",
    "quality.reports.view",
  ],
  developer: [
    "projects.create",
    "projects.status.manage",
    "projects.documents.system",
    "projects.documents.software",
    "projects.documents.test",
    "projects.documents.delivery",
    "projects.documents.review",
    "projects.tasks.manage",
    "projects.milestones.manage",
    "quality.reports.view",
  ],
};

export const permissionIdSet = new Set(permissionDefinitions.map((item) => item.id));

export const isKnownRole = (role: string): role is Exclude<UserRole, "admin"> =>
  role === "customer" || role === "developer";
