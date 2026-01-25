import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  platformStores,
  type DocumentStatus,
  type MatchingResult,
  type Milestone,
  type MilestoneStatus,
  type Project,
  type ProjectDocument,
  type ProjectStatus,
  type QualityReport,
  type Requirement,
  type RequirementDocument,
  type RequirementStatus,
  type Task,
  type TaskStatus,
  type TestDocument,
  type AIJob,
} from "./platformStore.js";
import { resolveDataPath } from "./jsonStore.js";

const DATA_ROOT = resolveDataPath("./data");

const resolveDocumentPath = (relativePath: string) => {
  const fullPath = path.resolve(DATA_ROOT, relativePath);
  if (!fullPath.startsWith(DATA_ROOT)) {
    throw new Error("Invalid document path.");
  }
  return fullPath;
};

const writeDocumentFile = async (relativePath: string, content: string) => {
  const fullPath = resolveDocumentPath(relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
};

const readDocumentFile = async (relativePath: string) => {
  const fullPath = resolveDocumentPath(relativePath);
  return fs.readFile(fullPath, "utf-8");
};

const deleteDocumentFile = async (relativePath: string) => {
  const fullPath = resolveDocumentPath(relativePath);
  try {
    await fs.unlink(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
};

const normalizeDocType = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const requirementDocPath = (requirementId: string, version: number) =>
  path.posix.join("requirements", requirementId, `v${version}.md`);

const projectDocPath = (projectId: string, docType: string, version: number) =>
  path.posix.join("projects", projectId, docType, `v${version}.md`);

const testDocPath = (projectId: string, version: number) =>
  path.posix.join("projects", projectId, "test", `v${version}.md`);

const reportDocPath = (projectId: string, reportId: string) =>
  path.posix.join("projects", projectId, "reports", `${reportId}.md`);

const buildRequirementMarkdown = (requirement: Requirement) => {
  const lines = [
    "# 需求文件",
    "",
    "## 專案名稱",
    requirement.title,
    "",
    "## 公司 / 單位",
    requirement.companyName || "未提供",
    "",
    "## 需求背景",
    requirement.background,
    "",
    "## 專案目標",
    requirement.goals,
    "",
    "## 功能範圍",
    requirement.scope,
    "",
    "## 限制與備註",
    requirement.constraints || "無",
    "",
    "## 專案類型",
    requirement.projectType || "未提供",
    "",
    "## 預算範圍",
    requirement.budgetRange || "未提供",
    "",
    "## 預計時程",
    requirement.timeline || "未提供",
    "",
    "## 是否已有規格文件",
    requirement.specDoc || "未提供",
    "",
    "## 聯絡資訊",
    `姓名：${requirement.contact.name}`,
    `Email：${requirement.contact.email}`,
    `電話：${requirement.contact.phone || "未提供"}`,
    "",
    "## 附件 / 參考資料",
    requirement.attachments.length ? requirement.attachments.join("\n") : "無",
  ];
  return lines.join("\n");
};

export const listRequirements = async () => {
  const requirements = await platformStores.requirements.read();
  return [...requirements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getRequirementById = async (id: string) => {
  const requirements = await platformStores.requirements.read();
  return requirements.find((item) => item.id === id) ?? null;
};

export const createRequirement = async (payload: Omit<Requirement, "id" | "status" | "createdAt" | "updatedAt">) => {
  const requirements = await platformStores.requirements.read();
  const requirementDocuments = await platformStores.requirementDocuments.read();
  const now = new Date().toISOString();
  const requirement: Requirement = {
    ...payload,
    id: randomUUID(),
    status: "submitted",
    createdAt: now,
    updatedAt: now,
  };

  const docVersion = 1;
  const contentUrl = requirementDocPath(requirement.id, docVersion);
  const document: RequirementDocument = {
    id: randomUUID(),
    requirementId: requirement.id,
    version: docVersion,
    contentUrl,
    status: "pending_approval",
    approvedBy: null,
    reviewComment: null,
    createdAt: now,
    updatedAt: now,
  };

  await writeDocumentFile(contentUrl, buildRequirementMarkdown(requirement));
  requirements.push(requirement);
  requirementDocuments.push(document);
  await platformStores.requirements.write(requirements);
  await platformStores.requirementDocuments.write(requirementDocuments);

  return { requirement, document };
};

export const listRequirementDocuments = async (requirementId: string) => {
  const documents = await platformStores.requirementDocuments.read();
  return documents
    .filter((doc) => doc.requirementId === requirementId)
    .sort((a, b) => b.version - a.version);
};

export const createRequirementDocument = async (payload: {
  requirementId: string;
  content: string;
  status?: DocumentStatus;
}) => {
  const requirements = await platformStores.requirements.read();
  const requirementIndex = requirements.findIndex((item) => item.id === payload.requirementId);
  if (requirementIndex === -1) return null;

  const documents = await platformStores.requirementDocuments.read();
  const existing = documents.filter((doc) => doc.requirementId === payload.requirementId);
  const nextVersion = existing.length ? Math.max(...existing.map((doc) => doc.version)) + 1 : 1;
  const now = new Date().toISOString();
  const contentUrl = requirementDocPath(payload.requirementId, nextVersion);
  const document: RequirementDocument = {
    id: randomUUID(),
    requirementId: payload.requirementId,
    version: nextVersion,
    contentUrl,
    status: payload.status ?? "pending_approval",
    approvedBy: null,
    reviewComment: null,
    createdAt: now,
    updatedAt: now,
  };

  const updatedDocuments = documents.map<RequirementDocument>((doc) =>
    doc.requirementId === payload.requirementId && doc.status !== "archived"
      ? { ...doc, status: "archived", updatedAt: now }
      : doc
  );

  await writeDocumentFile(contentUrl, payload.content);
  updatedDocuments.push(document);
  await platformStores.requirementDocuments.write(updatedDocuments);

  requirements[requirementIndex] = {
    ...requirements[requirementIndex],
    status: "under_review",
    updatedAt: now,
  };
  await platformStores.requirements.write(requirements);

  return document;
};

export const getRequirementDocument = async (requirementId: string, docId: string) => {
  const documents = await platformStores.requirementDocuments.read();
  const document = documents.find((doc) => doc.requirementId === requirementId && doc.id === docId);
  if (!document) return null;
  const content = await readDocumentFile(document.contentUrl);
  return { document, content };
};

export const commentRequirementDocument = async (payload: {
  requirementId: string;
  docId: string;
  comment: string;
}) => {
  const documents = await platformStores.requirementDocuments.read();
  const index = documents.findIndex(
    (doc) => doc.requirementId === payload.requirementId && doc.id === payload.docId
  );
  if (index === -1) return null;
  const now = new Date().toISOString();
  const updated = {
    ...documents[index],
    reviewComment: payload.comment,
    updatedAt: now,
  };
  documents[index] = updated;
  await platformStores.requirementDocuments.write(documents);
  return updated;
};

export const deleteRequirementDocument = async (requirementId: string, docId: string) => {
  const documents = await platformStores.requirementDocuments.read();
  const index = documents.findIndex(
    (doc) => doc.requirementId === requirementId && doc.id === docId
  );
  if (index === -1) return false;
  const [removed] = documents.splice(index, 1);
  await platformStores.requirementDocuments.write(documents);
  await deleteDocumentFile(removed.contentUrl);
  return true;
};

export const deleteRequirement = async (requirementId: string) => {
  const requirements = await platformStores.requirements.read();
  const projects = await platformStores.projects.read();
  if (projects.some((project) => project.requirementId === requirementId)) {
    return { error: "HAS_PROJECTS" as const };
  }

  const index = requirements.findIndex((item) => item.id === requirementId);
  if (index === -1) return { error: "NOT_FOUND" as const };

  requirements.splice(index, 1);
  await platformStores.requirements.write(requirements);

  const documents = await platformStores.requirementDocuments.read();
  const [remaining, removed] = documents.reduce<[RequirementDocument[], RequirementDocument[]]>(
    (acc, doc) => {
      if (doc.requirementId === requirementId) {
        acc[1].push(doc);
      } else {
        acc[0].push(doc);
      }
      return acc;
    },
    [[], []]
  );

  await platformStores.requirementDocuments.write(remaining);
  await Promise.all(removed.map((doc) => deleteDocumentFile(doc.contentUrl)));
  return { ok: true };
};

export const approveRequirement = async (
  requirementId: string,
  approved: boolean,
  reviewerId: string,
  comment?: string
) => {
  const requirements = await platformStores.requirements.read();
  const documents = await platformStores.requirementDocuments.read();
  const requirementIndex = requirements.findIndex((item) => item.id === requirementId);
  if (requirementIndex === -1) return null;

  const requirement = requirements[requirementIndex];
  const now = new Date().toISOString();
  const status: RequirementStatus = approved ? "approved" : "rejected";
  const updatedRequirement = { ...requirement, status, updatedAt: now };
  requirements[requirementIndex] = updatedRequirement;

  const requirementDocs = documents
    .filter((doc) => doc.requirementId === requirementId)
    .sort((a, b) => b.version - a.version);
  const latestDoc = requirementDocs[0];
  if (latestDoc) {
    const docIndex = documents.findIndex((doc) => doc.id === latestDoc.id);
    documents[docIndex] = {
      ...latestDoc,
      status: approved ? "approved" : "pending_approval",
      approvedBy: approved ? reviewerId : null,
      reviewComment: comment ?? null,
      updatedAt: now,
    };
  }

  await platformStores.requirements.write(requirements);
  await platformStores.requirementDocuments.write(documents);

  return updatedRequirement;
};

const legacyProjectStatusMap: Record<string, ProjectStatus> = {
  planned: "intake",
  active: "implementation",
  architecture_signed: "system_architecture_signed",
  on_hold: "on_hold",
  closed: "closed",
};

const baseProjectTransitions: Record<ProjectStatus, ProjectStatus[]> = {
  intake: ["requirements_signed"],
  requirements_signed: ["architecture_review"],
  architecture_review: ["system_architecture_signed"],
  system_architecture_signed: ["software_design_review"],
  software_design_review: ["software_design_signed"],
  software_design_signed: ["implementation"],
  implementation: ["system_verification"],
  system_verification: ["system_verification_signed"],
  system_verification_signed: ["delivery_review"],
  delivery_review: ["closed"],
  on_hold: [],
  canceled: ["intake"],
  closed: [],
};

const stageStatuses = new Set<ProjectStatus>([
  "intake",
  "requirements_signed",
  "architecture_review",
  "system_architecture_signed",
  "software_design_review",
  "software_design_signed",
  "implementation",
  "system_verification",
  "system_verification_signed",
  "delivery_review",
]);

const normalizeProjectStatus = (status: string): ProjectStatus =>
  legacyProjectStatusMap[status] ?? (stageStatuses.has(status as ProjectStatus) ||
  status === "on_hold" ||
  status === "canceled" ||
  status === "closed"
    ? (status as ProjectStatus)
    : "intake");

const normalizeProjectRecord = (project: Project) => {
  const normalizedStatus = normalizeProjectStatus(project.status);
  const normalizedPrevious =
    project.previousStatus && project.previousStatus !== "on_hold"
      ? normalizeProjectStatus(project.previousStatus)
      : null;

  let previousStatus =
    normalizedStatus === "on_hold"
      ? normalizedPrevious ?? "implementation"
      : null;

  let startDate = project.startDate;
  if (
    !startDate &&
    (normalizedStatus === "implementation" ||
      normalizedStatus === "system_verification" ||
      normalizedStatus === "system_verification_signed" ||
      normalizedStatus === "delivery_review" ||
      normalizedStatus === "closed")
  ) {
    startDate = project.createdAt;
  }
  let endDate = project.endDate;
  if (!endDate && normalizedStatus === "closed") {
    endDate = project.updatedAt ?? project.createdAt;
  }

  const changed =
    normalizedStatus !== project.status ||
    previousStatus !== (project.previousStatus ?? null) ||
    startDate !== project.startDate ||
    endDate !== project.endDate;

  if (!changed) return { changed: false, project };
  return {
    changed: true,
    project: {
      ...project,
      status: normalizedStatus,
      previousStatus,
      startDate,
      endDate,
    },
  };
};

const normalizeProjects = async () => {
  const projects = await platformStores.projects.read();
  let changed = false;
  const normalized = projects.map((project) => {
    const result = normalizeProjectRecord(project);
    if (result.changed) changed = true;
    return result.project;
  });
  if (changed) {
    await platformStores.projects.write(normalized);
  }
  return normalized;
};

const getLatestRequirementDocument = (
  requirementId: string,
  documents: RequirementDocument[]
) =>
  documents
    .filter((doc) => doc.requirementId === requirementId)
    .sort((a, b) => b.version - a.version)[0] ?? null;

const getLatestProjectDocumentByType = (
  projectId: string,
  docType: string,
  documents: ProjectDocument[]
) =>
  documents
    .filter((doc) => doc.projectId === projectId && doc.type === docType)
    .sort((a, b) => b.version - a.version)[0] ?? null;

const transitionGuards: Partial<Record<`${ProjectStatus}->${ProjectStatus}`, string>> = {
  "intake->requirements_signed": "需求文件需為核准狀態",
  "architecture_review->system_architecture_signed": "系統架構文件需為核准狀態",
  "software_design_review->software_design_signed": "軟體設計文件需為核准狀態",
  "system_verification->system_verification_signed": "測試文件需為核准狀態",
  "system_verification_signed->delivery_review": "交付文件需已建立",
  "delivery_review->closed": "交付文件需為核准狀態",
};

const getEffectiveStatus = (project: Project): ProjectStatus => {
  if (project.status !== "on_hold") return project.status;
  return project.previousStatus ?? "implementation";
};

const getAllowedNextStatuses = (project: Project) => {
  if (project.status === "closed") return [];
  if (project.status === "canceled") return ["intake"];
  if (project.status === "on_hold") {
    const effective = getEffectiveStatus(project);
    const allowed = new Set<ProjectStatus>([
      effective,
      ...baseProjectTransitions[effective],
      "canceled",
    ]);
    return [...allowed];
  }

  const baseNext = baseProjectTransitions[project.status] ?? [];
  return [...new Set<ProjectStatus>([...baseNext, "on_hold", "canceled"])];
};

const checkTransitionGuard = async (project: Project, nextStatus: ProjectStatus) => {
  const fromStatus = project.status === "on_hold" ? getEffectiveStatus(project) : project.status;
  const key = `${fromStatus}->${nextStatus}` as `${ProjectStatus}->${ProjectStatus}`;
  if (!transitionGuards[key]) return { ok: true as const };

  const requirementDocs = await platformStores.requirementDocuments.read();
  const projectDocs = await platformStores.projectDocuments.read();

  if (key === "intake->requirements_signed") {
    const latest = getLatestRequirementDocument(project.requirementId, requirementDocs);
    return latest?.status === "approved"
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  if (key === "architecture_review->system_architecture_signed") {
    const latest = getLatestProjectDocumentByType(project.id, "system", projectDocs);
    return latest?.status === "approved"
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  if (key === "software_design_review->software_design_signed") {
    const latest = getLatestProjectDocumentByType(project.id, "software", projectDocs);
    return latest?.status === "approved"
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  if (key === "system_verification->system_verification_signed") {
    const latest = getLatestProjectDocumentByType(project.id, "test", projectDocs);
    return latest?.status === "approved"
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  if (key === "system_verification_signed->delivery_review") {
    const latest = getLatestProjectDocumentByType(project.id, "delivery", projectDocs);
    return latest
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  if (key === "delivery_review->closed") {
    const latest = getLatestProjectDocumentByType(project.id, "delivery", projectDocs);
    return latest?.status === "approved"
      ? { ok: true as const }
      : { ok: false as const, reason: transitionGuards[key] };
  }

  return { ok: true as const };
};

export const listProjects = async () => {
  const projects = await normalizeProjects();
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getProjectById = async (projectId: string) => {
  const projects = await normalizeProjects();
  return projects.find((project) => project.id === projectId) ?? null;
};

export const updateProjectStatus = async (projectId: string, status: ProjectStatus) => {
  const projects = await normalizeProjects();
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) return { error: "NOT_FOUND" as const };

  const current = projects[index];
  if (current.status === status) {
    return { before: current, after: current };
  }

  const allowedNext = getAllowedNextStatuses(current);
  if (!allowedNext.includes(status)) {
    return { error: "INVALID_TRANSITION" as const, from: current.status, to: status };
  }

  const guard = await checkTransitionGuard(current, status);
  if (!guard.ok) {
    return {
      error: "GUARD_FAILED" as const,
      from: current.status,
      to: status,
      reason: guard.reason,
    };
  }

  const now = new Date().toISOString();
  const isEnteringImplementation =
    status === "implementation" &&
    current.status !== "implementation" &&
    current.status !== "on_hold";
  const nextStartDate =
    isEnteringImplementation && !current.startDate ? now : current.startDate;
  const nextEndDate = status === "closed" ? now : current.endDate;

  const nextPreviousStatus =
    status === "on_hold"
      ? getEffectiveStatus(current)
      : current.status === "on_hold"
        ? null
        : current.previousStatus ?? null;

  const updated: Project = {
    ...current,
    status,
    previousStatus: nextPreviousStatus,
    startDate: nextStartDate,
    endDate: nextEndDate,
    updatedAt: now,
  };
  projects[index] = updated;
  await platformStores.projects.write(projects);
  return { before: current, after: updated };
};

export const createProject = async (payload: { requirementId: string; name: string }) => {
  const projects = await platformStores.projects.read();
  const requirements = await platformStores.requirements.read();
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    requirementId: payload.requirementId,
    name: payload.name,
    status: "intake",
    previousStatus: null,
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  await platformStores.projects.write(projects);
  const requirementIndex = requirements.findIndex((item) => item.id === payload.requirementId);
  if (requirementIndex !== -1) {
    requirements[requirementIndex] = {
      ...requirements[requirementIndex],
      status: "converted",
      updatedAt: now,
    };
    await platformStores.requirements.write(requirements);
  }
  return project;
};

export const listProjectDocuments = async (projectId: string) => {
  const documents = await platformStores.projectDocuments.read();
  return documents
    .filter((doc) => doc.projectId === projectId)
    .sort((a, b) => b.version - a.version);
};

export const getProjectDocument = async (projectId: string, docId: string) => {
  const documents = await platformStores.projectDocuments.read();
  const document = documents.find((doc) => doc.projectId === projectId && doc.id === docId);
  if (!document) return null;
  const content = await readDocumentFile(document.contentUrl);
  return { document, content };
};

export const deleteProjectDocument = async (projectId: string, docId: string) => {
  const documents = await platformStores.projectDocuments.read();
  const index = documents.findIndex((doc) => doc.projectId === projectId && doc.id === docId);
  if (index === -1) return false;
  const [removed] = documents.splice(index, 1);
  await platformStores.projectDocuments.write(documents);
  await deleteDocumentFile(removed.contentUrl);
  return true;
};

export const deleteProject = async (projectId: string) => {
  const projects = await platformStores.projects.read();
  const index = projects.findIndex((project) => project.id === projectId);
  if (index === -1) return { error: "NOT_FOUND" as const };

  projects.splice(index, 1);
  await platformStores.projects.write(projects);

  const documents = await platformStores.projectDocuments.read();
  const [remaining, removed] = documents.reduce<[ProjectDocument[], ProjectDocument[]]>(
    (acc, doc) => {
      if (doc.projectId === projectId) {
        acc[1].push(doc);
      } else {
        acc[0].push(doc);
      }
      return acc;
    },
    [[], []]
  );
  await platformStores.projectDocuments.write(remaining);
  await Promise.all(removed.map((doc) => deleteDocumentFile(doc.contentUrl)));

  const testDocuments = await platformStores.testDocuments.read();
  const [testRemaining, testRemoved] = testDocuments.reduce<[TestDocument[], TestDocument[]]>(
    (acc, doc) => {
      if (doc.projectId === projectId) {
        acc[1].push(doc);
      } else {
        acc[0].push(doc);
      }
      return acc;
    },
    [[], []]
  );
  await platformStores.testDocuments.write(testRemaining);
  await Promise.all(testRemoved.map((doc) => deleteDocumentFile(doc.contentUrl)));

  const reports = await platformStores.qualityReports.read();
  const [reportRemaining, reportRemoved] = reports.reduce<[QualityReport[], QualityReport[]]>(
    (acc, report) => {
      if (report.projectId === projectId) {
        acc[1].push(report);
      } else {
        acc[0].push(report);
      }
      return acc;
    },
    [[], []]
  );
  await platformStores.qualityReports.write(reportRemaining);
  await Promise.all(reportRemoved.map((report) => deleteDocumentFile(report.reportUrl)));

  const aiJobs = await platformStores.aiJobs.read();
  await platformStores.aiJobs.write(aiJobs.filter((job) => job.targetId !== projectId));

  const tasks = await platformStores.tasks.read();
  const milestones = await platformStores.milestones.read();
  await platformStores.tasks.write(tasks.filter((task) => task.projectId !== projectId));
  await platformStores.milestones.write(milestones.filter((milestone) => milestone.projectId !== projectId));

  return { ok: true };
};

export const createProjectDocument = async (payload: {
  projectId: string;
  type: string;
  title: string;
  content: string;
  status?: DocumentStatus;
  versionNote?: string | null;
}) => {
  const documents = await platformStores.projectDocuments.read();
  const docType = normalizeDocType(payload.type);
  if (!docType) {
    throw new Error("Invalid document type.");
  }

  const existing = documents.filter(
    (doc) => doc.projectId === payload.projectId && doc.type === docType
  );
  const nextVersion = existing.length ? Math.max(...existing.map((doc) => doc.version)) + 1 : 1;
  const now = new Date().toISOString();
  const contentUrl = projectDocPath(payload.projectId, docType, nextVersion);
  const document: ProjectDocument = {
    id: randomUUID(),
    projectId: payload.projectId,
    type: docType,
    title: payload.title,
    version: nextVersion,
    contentUrl,
    status: payload.status ?? "draft",
    versionNote: payload.versionNote ?? null,
    reviewComment: null,
    approvedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  const updatedDocuments = documents.map<ProjectDocument>((doc) =>
    doc.projectId === payload.projectId && doc.type === docType && doc.status !== "archived"
      ? { ...doc, status: "archived", updatedAt: now }
      : doc
  );

  await writeDocumentFile(contentUrl, payload.content);
  updatedDocuments.push(document);
  await platformStores.projectDocuments.write(updatedDocuments);

  return document;
};

export const reviewProjectDocument = async (payload: {
  projectId: string;
  docId: string;
  approved?: boolean;
  reviewerId: string | null;
  comment?: string | null;
}) => {
  const documents = await platformStores.projectDocuments.read();
  const index = documents.findIndex(
    (doc) => doc.projectId === payload.projectId && doc.id === payload.docId
  );
  if (index === -1) return null;
  const now = new Date().toISOString();
  const current = documents[index];
  const nextStatus =
    typeof payload.approved === "boolean"
      ? payload.approved
        ? "approved"
        : "pending_approval"
      : current.status;
  const updated: ProjectDocument = {
    ...current,
    status: nextStatus,
    reviewComment: payload.comment ?? current.reviewComment ?? null,
    approvedBy: payload.approved ? payload.reviewerId : current.approvedBy ?? null,
    updatedAt: now,
  };
  documents[index] = updated;
  await platformStores.projectDocuments.write(documents);
  return updated;
};

export const listMatchingResults = async (requirementId?: string) => {
  const results = await platformStores.matchingResults.read();
  const filtered = requirementId
    ? results.filter((item) => item.requirementId === requirementId)
    : results;
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createMatchingResult = async (payload: {
  requirementId: string;
  teamId?: string;
  budget?: string;
  timeline?: string;
  score?: number;
}) => {
  const results = await platformStores.matchingResults.read();
  const now = new Date().toISOString();
  const result: MatchingResult = {
    id: randomUUID(),
    requirementId: payload.requirementId,
    teamId: payload.teamId ?? "team-default",
    score: payload.score ?? 80,
    budget: payload.budget ?? "待估",
    timeline: payload.timeline ?? "待估",
    status: "evaluated",
    createdAt: now,
    updatedAt: now,
  };
  results.push(result);
  await platformStores.matchingResults.write(results);
  return result;
};

export const assignMatchingResult = async (matchingId: string, teamId: string) => {
  const results = await platformStores.matchingResults.read();
  const index = results.findIndex((item) => item.id === matchingId);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const updated = {
    ...results[index],
    teamId,
    status: "assigned",
    updatedAt: now,
  };
  results[index] = updated;
  await platformStores.matchingResults.write(results);

  const requirements = await platformStores.requirements.read();
  const requirementIndex = requirements.findIndex((item) => item.id === updated.requirementId);
  if (requirementIndex !== -1) {
    requirements[requirementIndex] = {
      ...requirements[requirementIndex],
      status: "matched",
      updatedAt: now,
    };
    await platformStores.requirements.write(requirements);
  }

  return updated;
};

export const listTasks = async (projectId: string) => {
  const tasks = await platformStores.tasks.read();
  return tasks.filter((task) => task.projectId === projectId);
};

export const createTask = async (payload: {
  projectId: string;
  title: string;
  status?: TaskStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
}) => {
  const tasks = await platformStores.tasks.read();
  const now = new Date().toISOString();
  const task: Task = {
    id: randomUUID(),
    projectId: payload.projectId,
    title: payload.title,
    status: payload.status ?? "todo",
    assigneeId: payload.assigneeId ?? null,
    dueDate: payload.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  await platformStores.tasks.write(tasks);
  return task;
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  updates: Partial<Pick<Task, "title" | "status" | "assigneeId" | "dueDate">>
) => {
  const tasks = await platformStores.tasks.read();
  const index = tasks.findIndex((task) => task.id === taskId && task.projectId === projectId);
  if (index === -1) return null;
  const updated = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  tasks[index] = updated;
  await platformStores.tasks.write(tasks);
  return updated;
};

export const listMilestones = async (projectId: string) => {
  const milestones = await platformStores.milestones.read();
  return milestones.filter((milestone) => milestone.projectId === projectId);
};

export const createMilestone = async (payload: {
  projectId: string;
  title: string;
  status?: MilestoneStatus;
  dueDate?: string | null;
}) => {
  const milestones = await platformStores.milestones.read();
  const now = new Date().toISOString();
  const milestone: Milestone = {
    id: randomUUID(),
    projectId: payload.projectId,
    title: payload.title,
    status: payload.status ?? "planned",
    dueDate: payload.dueDate ?? null,
    createdAt: now,
    updatedAt: now,
  };
  milestones.push(milestone);
  await platformStores.milestones.write(milestones);
  return milestone;
};

export const updateMilestone = async (
  projectId: string,
  milestoneId: string,
  updates: Partial<Pick<Milestone, "title" | "status" | "dueDate">>
) => {
  const milestones = await platformStores.milestones.read();
  const index = milestones.findIndex(
    (milestone) => milestone.id === milestoneId && milestone.projectId === projectId
  );
  if (index === -1) return null;
  const updated = {
    ...milestones[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  milestones[index] = updated;
  await platformStores.milestones.write(milestones);
  return updated;
};

const createAIJob = async (payload: {
  type: string;
  targetId: string;
  status?: AIJob["status"];
  resultUrl?: string | null;
}) => {
  const aiJobs = await platformStores.aiJobs.read();
  const now = new Date().toISOString();
  const job: AIJob = {
    id: randomUUID(),
    type: payload.type,
    targetId: payload.targetId,
    status: payload.status ?? "queued",
    resultUrl: payload.resultUrl ?? null,
    createdAt: now,
    completedAt: payload.status === "succeeded" ? now : null,
  };
  aiJobs.push(job);
  await platformStores.aiJobs.write(aiJobs);
  return job;
};

const createTestDocument = async (projectId: string, scope: string) => {
  const documents = await platformStores.testDocuments.read();
  const existing = documents.filter((doc) => doc.projectId === projectId);
  const nextVersion = existing.length ? Math.max(...existing.map((doc) => doc.version)) + 1 : 1;
  const now = new Date().toISOString();
  const contentUrl = testDocPath(projectId, nextVersion);
  const content = [
    "# 測試文件",
    "",
    `版本：v${nextVersion}`,
    "",
    "## 範圍",
    scope || "未指定",
    "",
    "## 測試項目",
    "- 功能驗證",
    "- 邊界條件",
    "- 例外流程",
  ].join("\n");

  const document: TestDocument = {
    id: randomUUID(),
    projectId,
    version: nextVersion,
    contentUrl,
    createdAt: now,
    updatedAt: now,
  };

  await writeDocumentFile(contentUrl, content);
  documents.push(document);
  await platformStores.testDocuments.write(documents);
  return document;
};

const createQualityReport = async (payload: {
  projectId: string;
  type: string;
  summary: string;
}) => {
  const reports = await platformStores.qualityReports.read();
  const now = new Date().toISOString();
  const reportId = randomUUID();
  const reportUrl = reportDocPath(payload.projectId, reportId);
  const content = [
    "# 品質報告",
    "",
    `類型：${payload.type}`,
    "",
    "## 摘要",
    payload.summary,
  ].join("\n");

  const report: QualityReport = {
    id: reportId,
    projectId: payload.projectId,
    type: payload.type,
    status: "ready",
    summary: payload.summary,
    reportUrl,
    createdAt: now,
    updatedAt: now,
  };

  await writeDocumentFile(reportUrl, content);
  reports.push(report);
  await platformStores.qualityReports.write(reports);
  return report;
};

export const listQualityReports = async (projectId?: string) => {
  const reports = await platformStores.qualityReports.read();
  const filtered = projectId
    ? reports.filter((report) => report.projectId === projectId)
    : reports;
  return [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getQualityReport = async (reportId: string) => {
  const reports = await platformStores.qualityReports.read();
  return reports.find((report) => report.id === reportId) ?? null;
};

export const createTestingJob = async (payload: { projectId: string; scope: string }) => {
  const testDoc = await createTestDocument(payload.projectId, payload.scope);
  const report = await createQualityReport({
    projectId: payload.projectId,
    type: "testing",
    summary: `測試文件 v${testDoc.version} 已建立，待人工覆核。`,
  });
  const job = await createAIJob({
    type: "testing_generate",
    targetId: payload.projectId,
    status: "succeeded",
    resultUrl: report.reportUrl,
  });
  return { job, report };
};

export const createCodeReviewJob = async (payload: {
  projectId: string;
  repositoryUrl: string;
  commitSha: string;
}) => {
  const report = await createQualityReport({
    projectId: payload.projectId,
    type: "code_review",
    summary: `已完成 ${payload.repositoryUrl} @ ${payload.commitSha} 的初步審查。`,
  });
  const job = await createAIJob({
    type: "code_review",
    targetId: payload.projectId,
    status: "succeeded",
    resultUrl: report.reportUrl,
  });
  return { job, report };
};
