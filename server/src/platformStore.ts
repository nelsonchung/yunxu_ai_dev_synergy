import { createJsonStore, resolveDataPath } from "./jsonStore.js";

export type RequirementStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "matched"
  | "converted";

export type DocumentStatus = "draft" | "pending_approval" | "approved" | "archived";
export type ProjectStatus = "planned" | "active" | "on_hold" | "closed";
export type AIJobStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export type Requirement = {
  id: string;
  title: string;
  background: string;
  status: RequirementStatus;
  ownerId: string;
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
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  requirementId: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  dueDate: string | null;
};

export type MatchingResult = {
  id: string;
  requirementId: string;
  teamId: string;
  score: number;
  budget: string;
  timeline: string;
  status: string;
};

export type QualityReport = {
  id: string;
  projectId: string;
  type: string;
  status: string;
  summary: string;
  reportUrl: string;
};

export type TestDocument = {
  id: string;
  projectId: string;
  version: number;
  contentUrl: string;
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
const AI_JOBS_FILE = resolveDataPath(process.env.DATA_AI_JOBS_FILE ?? "./data/ai_jobs.json");

export const platformStores = {
  requirements: createJsonStore<Requirement[]>(REQUIREMENTS_FILE, []),
  requirementDocuments: createJsonStore<RequirementDocument[]>(REQUIREMENT_DOCS_FILE, []),
  projects: createJsonStore<Project[]>(PROJECTS_FILE, []),
  tasks: createJsonStore<Task[]>(TASKS_FILE, []),
  milestones: createJsonStore<Milestone[]>(MILESTONES_FILE, []),
  matchingResults: createJsonStore<MatchingResult[]>(MATCHING_FILE, []),
  qualityReports: createJsonStore<QualityReport[]>(QUALITY_REPORTS_FILE, []),
  testDocuments: createJsonStore<TestDocument[]>(TEST_DOCUMENTS_FILE, []),
  aiJobs: createJsonStore<AIJob[]>(AI_JOBS_FILE, []),
};

export const initPlatformStore = async () => {
  await Promise.all(Object.values(platformStores).map((store) => store.ensure()));
};
