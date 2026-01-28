import { createJsonStore, resolveDataPath } from "./jsonStore.js";

export type RequirementStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "rejected"
  | "approved"
  | "matched"
  | "converted";

export type DocumentStatus = "draft" | "pending_approval" | "approved" | "archived";
export type ProjectStatus =
  | "intake"
  | "requirements_signed"
  | "architecture_review"
  | "system_architecture_signed"
  | "software_design_review"
  | "software_design_signed"
  | "implementation"
  | "system_verification"
  | "system_verification_signed"
  | "delivery_review"
  | "on_hold"
  | "canceled"
  | "closed";
export type AIJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type MilestoneStatus = "planned" | "active" | "done";

export type Requirement = {
  id: string;
  title: string;
  companyName: string;
  projectType: string;
  background: string;
  goals: string;
  scope: string;
  constraints: string;
  budgetRange: string;
  timeline: string;
  specDoc: string;
  attachments: string[];
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  status: RequirementStatus;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementDocument = {
  id: string;
  requirementId: string;
  version: number;
  contentUrl: string;
  status: DocumentStatus;
  approvedBy: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  requirementId: string;
  name: string;
  status: ProjectStatus;
  previousStatus: ProjectStatus | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  status: MilestoneStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchingResult = {
  id: string;
  requirementId: string;
  teamId: string;
  score: number;
  budget: string;
  timeline: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type QualityReport = {
  id: string;
  projectId: string;
  type: string;
  status: string;
  summary: string;
  reportUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type TestDocument = {
  id: string;
  projectId: string;
  version: number;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocument = {
  id: string;
  projectId: string;
  type: string;
  title: string;
  version: number;
  contentUrl: string;
  status: DocumentStatus;
  versionNote: string | null;
  reviewComment: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationReviewItem = {
  key: string;
  path: string;
  h1: string;
  h2: string | null;
  h3: string;
  price: number | null;
};

export type QuotationReviewHistory = {
  id: string;
  action: "submitted" | "approved" | "changes_requested";
  comment: string | null;
  actorId: string | null;
  createdAt: string;
};

export type QuotationReview = {
  id: string;
  projectId: string;
  documentId: string;
  documentVersion: number;
  currency: string;
  status: "draft" | "submitted" | "approved" | "changes_requested";
  reviewComment: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  history: QuotationReviewHistory[];
  items: QuotationReviewItem[];
  total: number;
  submittedAt: string | null;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type DevelopmentChecklistItem = {
  id: string;
  key: string;
  path: string;
  h1: string;
  h2: string | null;
  h3: string;
  done: boolean;
  updatedAt: string | null;
};

export type DevelopmentChecklist = {
  id: string;
  projectId: string;
  documentId: string;
  documentVersion: number;
  items: DevelopmentChecklistItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type AIJob = {
  id: string;
  type: string;
  targetId: string;
  status: AIJobStatus;
  resultUrl: string | null;
  createdAt: string;
  completedAt: string | null;
};

const REQUIREMENTS_FILE = resolveDataPath(
  process.env.DATA_REQUIREMENTS_FILE ?? "./data/requirements.json"
);
const REQUIREMENT_DOCS_FILE = resolveDataPath(
  process.env.DATA_REQUIREMENT_DOCS_FILE ?? "./data/requirement_documents.json"
);
const PROJECTS_FILE = resolveDataPath(process.env.DATA_PROJECTS_FILE ?? "./data/projects.json");
const TASKS_FILE = resolveDataPath(process.env.DATA_TASKS_FILE ?? "./data/tasks.json");
const MILESTONES_FILE = resolveDataPath(process.env.DATA_MILESTONES_FILE ?? "./data/milestones.json");
const MATCHING_FILE = resolveDataPath(
  process.env.DATA_MATCHING_FILE ?? "./data/matching_results.json"
);
const QUALITY_REPORTS_FILE = resolveDataPath(
  process.env.DATA_QUALITY_REPORTS_FILE ?? "./data/quality_reports.json"
);
const TEST_DOCUMENTS_FILE = resolveDataPath(
  process.env.DATA_TEST_DOCUMENTS_FILE ?? "./data/test_documents.json"
);
const PROJECT_DOCUMENTS_FILE = resolveDataPath(
  process.env.DATA_PROJECT_DOCUMENTS_FILE ?? "./data/project_documents.json"
);
const AI_JOBS_FILE = resolveDataPath(process.env.DATA_AI_JOBS_FILE ?? "./data/ai_jobs.json");
const QUOTATION_REVIEWS_FILE = resolveDataPath(
  process.env.DATA_QUOTATION_REVIEWS_FILE ?? "./data/quotation_reviews.json"
);
const DEVELOPMENT_CHECKLISTS_FILE = resolveDataPath(
  process.env.DATA_DEVELOPMENT_CHECKLISTS_FILE ?? "./data/development_checklists.json"
);

export const platformStores = {
  requirements: createJsonStore<Requirement[]>(REQUIREMENTS_FILE, []),
  requirementDocuments: createJsonStore<RequirementDocument[]>(REQUIREMENT_DOCS_FILE, []),
  projects: createJsonStore<Project[]>(PROJECTS_FILE, []),
  tasks: createJsonStore<Task[]>(TASKS_FILE, []),
  milestones: createJsonStore<Milestone[]>(MILESTONES_FILE, []),
  matchingResults: createJsonStore<MatchingResult[]>(MATCHING_FILE, []),
  qualityReports: createJsonStore<QualityReport[]>(QUALITY_REPORTS_FILE, []),
  testDocuments: createJsonStore<TestDocument[]>(TEST_DOCUMENTS_FILE, []),
  projectDocuments: createJsonStore<ProjectDocument[]>(PROJECT_DOCUMENTS_FILE, []),
  aiJobs: createJsonStore<AIJob[]>(AI_JOBS_FILE, []),
  quotationReviews: createJsonStore<QuotationReview[]>(QUOTATION_REVIEWS_FILE, []),
  developmentChecklists: createJsonStore<DevelopmentChecklist[]>(DEVELOPMENT_CHECKLISTS_FILE, []),
};

export const initPlatformStore = async () => {
  await Promise.all(Object.values(platformStores).map((store) => store.ensure()));
};
