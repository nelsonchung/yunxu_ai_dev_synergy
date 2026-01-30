import { apiRequest } from "@/lib/authClient";

export type RequirementSummary = {
  id: string;
  title: string;
  status: string;
  companyName: string;
  projectType: string;
  budgetRange: string;
  timeline: string;
  createdAt: string;
  updatedAt: string;
};

export type RequirementDetail = RequirementSummary & {
  background: string;
  goals: string;
  scope: string;
  constraints: string;
  specDoc: string;
  attachments: string[];
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export type RequirementDocumentSummary = {
  id: string;
  version: number;
  status: string;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RequirementDocumentDetail = RequirementDocumentSummary & {
  content: string;
};

export type RequirementPayload = {
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
};

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

export type ProjectSummary = {
  id: string;
  name: string;
  requirementId: string;
  status: ProjectStatus;
  previousStatus: ProjectStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentSummary = {
  id: string;
  type: string;
  title: string;
  version: number;
  status: string;
  versionNote: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentDetail = ProjectDocumentSummary & {
  content: string;
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

export type VerificationChecklistItem = {
  id: string;
  key: string;
  path: string;
  h1: string;
  h2: string | null;
  h3: string;
  done: boolean;
  updatedAt: string | null;
};

export type VerificationChecklist = {
  id: string;
  projectId: string;
  documentId: string;
  documentVersion: number;
  items: VerificationChecklistItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type SupportMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: "customer" | "developer" | "admin";
  recipientId: string | null;
  recipientRole: "customer" | "developer" | "admin";
  message: string;
  createdAt: string;
};

export type SupportThread = {
  threadId: string;
  lastMessage: string;
  lastAt: string;
  total: number;
  user: { id: string; username: string; email: string; role: string } | null;
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

export type Task = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Milestone = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  dueDate: string | null;
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

export type AuditLog = {
  id: string;
  actorId: string | null;
  targetUserId: string | null;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

export const createRequirement = async (payload: RequirementPayload) => {
  const data = await apiRequest<{ id: string; status: string; document_id: string }>(
    "/api/requirements",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return data;
};

export const listRequirements = async () => {
  const data = await apiRequest<{ requirements: RequirementSummary[] }>("/api/requirements", {
    method: "GET",
  });
  return data.requirements;
};

export const listMyRequirements = async () => {
  const data = await apiRequest<{ requirements: RequirementSummary[] }>("/api/requirements/me", {
    method: "GET",
  });
  return data.requirements;
};

export const getRequirement = async (requirementId: string) => {
  const data = await apiRequest<{ requirement: RequirementDetail }>(
    `/api/requirements/${requirementId}`,
    { method: "GET" }
  );
  return data.requirement;
};

export const deleteRequirement = async (requirementId: string) => {
  await apiRequest(`/api/requirements/${requirementId}`, { method: "DELETE" });
};

export const listRequirementDocuments = async (requirementId: string) => {
  const data = await apiRequest<{ documents: RequirementDocumentSummary[] }>(
    `/api/requirements/${requirementId}/documents`,
    { method: "GET" }
  );
  return data.documents;
};

export const listRequirementProjects = async (requirementId: string) => {
  const data = await apiRequest<{ projects: Array<ProjectSummary & { startDate?: string | null; endDate?: string | null }> }>(
    `/api/requirements/${requirementId}/projects`,
    { method: "GET" }
  );
  return data.projects;
};

export const getRequirementDocument = async (requirementId: string, docId: string) => {
  const data = await apiRequest<{ document: RequirementDocumentSummary; content: string }>(
    `/api/requirements/${requirementId}/documents/${docId}`,
    { method: "GET" }
  );
  return { ...data.document, content: data.content };
};

export const createRequirementDocument = async (requirementId: string, content: string) => {
  const data = await apiRequest<{ document_id: string; version: number }>(
    `/api/requirements/${requirementId}/documents`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
  return data;
};

export const commentRequirementDocument = async (
  requirementId: string,
  docId: string,
  comment: string
) => {
  await apiRequest(`/api/requirements/${requirementId}/documents/${docId}/comment`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
};

export const deleteRequirementDocument = async (requirementId: string, docId: string) => {
  await apiRequest(`/api/requirements/${requirementId}/documents/${docId}`, { method: "DELETE" });
};

export const approveRequirement = async (requirementId: string, approved: boolean, comment: string) => {
  const data = await apiRequest<{ status: string; approved_at: string }>(
    `/api/requirements/${requirementId}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ approved, comment }),
    }
  );
  return data;
};

export const listProjects = async () => {
  const data = await apiRequest<{ projects: ProjectSummary[] }>("/api/projects", { method: "GET" });
  return data.projects;
};

export const listProjectsByRequirement = async (requirementId: string) => {
  const data = await apiRequest<{ projects: ProjectSummary[] }>(
    `/api/requirements/${requirementId}/projects`,
    { method: "GET" }
  );
  return data.projects;
};

export const deleteProject = async (projectId: string) => {
  await apiRequest(`/api/projects/${projectId}`, { method: "DELETE" });
};

export const createProject = async (payload: { requirementId: string; name: string }) => {
  const data = await apiRequest<{ project_id: string; status: string }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus) => {
  const data = await apiRequest<{ project: ProjectSummary }>(`/api/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return data.project;
};

export const listProjectDocuments = async (projectId: string) => {
  const data = await apiRequest<{ documents: ProjectDocumentSummary[] }>(
    `/api/projects/${projectId}/documents`,
    { method: "GET" }
  );
  return data.documents;
};

export const getProjectDocument = async (projectId: string, docId: string) => {
  const data = await apiRequest<{ document: ProjectDocumentSummary; content: string }>(
    `/api/projects/${projectId}/documents/${docId}`,
    { method: "GET" }
  );
  return { ...data.document, content: data.content };
};

export const deleteProjectDocument = async (projectId: string, docId: string) => {
  await apiRequest(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
};

export const createProjectDocument = async (projectId: string, payload: {
  type: string;
  title: string;
  content: string;
  versionNote?: string;
  status?: string;
}) => {
  const data = await apiRequest<{ document_id: string; version: number }>(
    `/api/projects/${projectId}/documents`,
    {
      method: "POST",
      body: JSON.stringify({
        type: payload.type,
        title: payload.title,
        content: payload.content,
        version_note: payload.versionNote,
        status: payload.status,
      }),
    }
  );
  return data;
};

export const reviewProjectDocument = async (
  projectId: string,
  docId: string,
  payload: { approved?: boolean; comment?: string }
) => {
  const data = await apiRequest<{ status: string }>(
    `/api/projects/${projectId}/documents/${docId}/review`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return data.status;
};

export const getProjectDocumentQuotation = async (projectId: string, docId: string) => {
  const data = await apiRequest<{ quotation: QuotationReview | null }>(
    `/api/projects/${projectId}/documents/${docId}/quotation`,
    { method: "GET" }
  );
  return data.quotation;
};

export const saveProjectDocumentQuotation = async (
  projectId: string,
  docId: string,
  payload: { currency?: string; items: QuotationReviewItem[] }
) => {
  const data = await apiRequest<{ quotation: QuotationReview }>(
    `/api/projects/${projectId}/documents/${docId}/quotation`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return data.quotation;
};

export const submitProjectDocumentQuotation = async (projectId: string, docId: string) => {
  const data = await apiRequest<{ quotation: QuotationReview }>(
    `/api/projects/${projectId}/documents/${docId}/quotation/submit`,
    { method: "POST" }
  );
  return data.quotation;
};

export const reviewProjectDocumentQuotation = async (
  projectId: string,
  docId: string,
  payload: { approved: boolean; comment?: string }
) => {
  const data = await apiRequest<{ quotation: QuotationReview }>(
    `/api/projects/${projectId}/documents/${docId}/quotation/review`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return data.quotation;
};

export const getProjectChecklist = async (projectId: string) => {
  const data = await apiRequest<{ checklist: DevelopmentChecklist | null }>(
    `/api/projects/${projectId}/checklist`,
    { method: "GET" }
  );
  return data.checklist;
};

export const updateProjectChecklistItem = async (
  projectId: string,
  payload: { itemId: string; done: boolean }
) => {
  const data = await apiRequest<{ checklist: DevelopmentChecklist }>(
    `/api/projects/${projectId}/checklist`,
    {
      method: "PATCH",
      body: JSON.stringify({ item_id: payload.itemId, done: payload.done }),
    }
  );
  return data.checklist;
};

export const getProjectVerificationChecklist = async (projectId: string) => {
  const data = await apiRequest<{ checklist: VerificationChecklist | null }>(
    `/api/projects/${projectId}/verification-checklist`,
    { method: "GET" }
  );
  return data.checklist;
};

export const updateProjectVerificationChecklistItem = async (
  projectId: string,
  payload: { itemId: string; done: boolean }
) => {
  const data = await apiRequest<{ checklist: VerificationChecklist }>(
    `/api/projects/${projectId}/verification-checklist`,
    {
      method: "PATCH",
      body: JSON.stringify({ item_id: payload.itemId, done: payload.done }),
    }
  );
  return data.checklist;
};

export const listSupportThreads = async () => {
  const data = await apiRequest<{ threads: SupportThread[] }>("/api/support/threads", {
    method: "GET",
  });
  return data.threads;
};

export const listSupportMessages = async (threadId?: string) => {
  const query = threadId ? `?thread_id=${encodeURIComponent(threadId)}` : "";
  const data = await apiRequest<{ messages: SupportMessage[] }>(
    `/api/support/messages${query}`,
    { method: "GET" }
  );
  return data.messages;
};

export const sendSupportMessage = async (payload: { message: string; threadId?: string }) => {
  const data = await apiRequest<{ message: SupportMessage }>("/api/support/messages", {
    method: "POST",
    body: JSON.stringify({
      message: payload.message,
      thread_id: payload.threadId,
    }),
  });
  return data.message;
};

export const listMatchingResults = async (requirementId?: string) => {
  const query = requirementId ? `?requirement_id=${encodeURIComponent(requirementId)}` : "";
  const data = await apiRequest<{ results: MatchingResult[] }>(`/api/matching${query}`, {
    method: "GET",
  });
  return data.results;
};

export const evaluateMatching = async (payload: {
  requirementId: string;
  teamId?: string;
  budgetEstimate?: string;
  timelineEstimate?: string;
  score?: number;
}) => {
  const data = await apiRequest<{
    matching_id: string;
    score: number;
    budget_estimate: string;
    timeline_estimate: string;
    status: string;
  }>("/api/matching/evaluate", {
    method: "POST",
    body: JSON.stringify({
      requirement_id: payload.requirementId,
      team_id: payload.teamId,
      budget_estimate: payload.budgetEstimate,
      timeline_estimate: payload.timelineEstimate,
      score: payload.score,
    }),
  });
  return data;
};

export const assignMatching = async (matchingId: string, teamId: string) => {
  const data = await apiRequest<{ status: string }>(`/api/matching/${matchingId}/assign`, {
    method: "POST",
    body: JSON.stringify({ team_id: teamId }),
  });
  return data;
};

export const listTasks = async (projectId: string) => {
  const data = await apiRequest<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`, {
    method: "GET",
  });
  return data.tasks;
};

export const createTask = async (projectId: string, payload: {
  title: string;
  status?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}) => {
  const data = await apiRequest<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      status: payload.status,
      assignee_id: payload.assigneeId,
      due_date: payload.dueDate,
    }),
  });
  return data.task;
};

export const updateTask = async (projectId: string, taskId: string, payload: {
  title?: string;
  status?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}) => {
  const data = await apiRequest<{ task: Task }>(`/api/projects/${projectId}/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({
      title: payload.title,
      status: payload.status,
      assignee_id: payload.assigneeId,
      due_date: payload.dueDate,
    }),
  });
  return data.task;
};

export const listMilestones = async (projectId: string) => {
  const data = await apiRequest<{ milestones: Milestone[] }>(`/api/projects/${projectId}/milestones`, {
    method: "GET",
  });
  return data.milestones;
};

export const createMilestone = async (projectId: string, payload: {
  title: string;
  status?: string;
  dueDate?: string | null;
}) => {
  const data = await apiRequest<{ milestone: Milestone }>(`/api/projects/${projectId}/milestones`, {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      status: payload.status,
      due_date: payload.dueDate,
    }),
  });
  return data.milestone;
};

export const updateMilestone = async (projectId: string, milestoneId: string, payload: {
  title?: string;
  status?: string;
  dueDate?: string | null;
}) => {
  const data = await apiRequest<{ milestone: Milestone }>(
    `/api/projects/${projectId}/milestones/${milestoneId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: payload.title,
        status: payload.status,
        due_date: payload.dueDate,
      }),
    }
  );
  return data.milestone;
};

export const generateTesting = async (payload: { projectId: string; scope: string }) => {
  const data = await apiRequest<{ job_id: string }>("/api/testing/generate", {
    method: "POST",
    body: JSON.stringify({ project_id: payload.projectId, scope: payload.scope }),
  });
  return data;
};

export const requestCodeReview = async (payload: {
  projectId: string;
  repositoryUrl: string;
  commitSha: string;
}) => {
  const data = await apiRequest<{ job_id: string }>("/api/review/code", {
    method: "POST",
    body: JSON.stringify({
      project_id: payload.projectId,
      repository_url: payload.repositoryUrl,
      commit_sha: payload.commitSha,
    }),
  });
  return data;
};

export const listQualityReports = async (projectId?: string) => {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : "";
  const data = await apiRequest<{ reports: QualityReport[] }>(`/api/quality/reports${query}`, {
    method: "GET",
  });
  return data.reports;
};

export const getQualityReport = async (reportId: string) => {
  const data = await apiRequest<{ report_url: string; summary: string; status: string }>(
    `/api/quality/reports/${reportId}`,
    { method: "GET" }
  );
  return data;
};

export const listAuditLogs = async (payload?: { actorId?: string; dateFrom?: string; dateTo?: string }) => {
  const params = new URLSearchParams();
  if (payload?.actorId) params.set("actor_id", payload.actorId);
  if (payload?.dateFrom) params.set("date_from", payload.dateFrom);
  if (payload?.dateTo) params.set("date_to", payload.dateTo);
  const query = params.toString();
  const data = await apiRequest<{ logs: AuditLog[] }>(`/api/audit/logs${query ? `?${query}` : ""}`, {
    method: "GET",
  });
  return data.logs;
};
