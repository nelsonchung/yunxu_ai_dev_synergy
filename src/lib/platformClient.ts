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

export type ProjectSummary = {
  id: string;
  name: string;
  requirementId: string;
  status: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ProjectDocumentDetail = ProjectDocumentSummary & {
  content: string;
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

export const getRequirementDocument = async (requirementId: string, docId: string) => {
  const data = await apiRequest<{ document: RequirementDocumentSummary; content: string }>(
    `/api/requirements/${requirementId}/documents/${docId}`,
    { method: "GET" }
  );
  return { ...data.document, content: data.content };
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
