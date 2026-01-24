import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  platformStores,
  type DocumentStatus,
  type Project,
  type ProjectDocument,
  type Requirement,
  type RequirementDocument,
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

export const getRequirementDocument = async (requirementId: string, docId: string) => {
  const documents = await platformStores.requirementDocuments.read();
  const document = documents.find((doc) => doc.requirementId === requirementId && doc.id === docId);
  if (!document) return null;
  const content = await readDocumentFile(document.contentUrl);
  return { document, content };
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
  const status = approved ? "approved" : "rejected";
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

export const listProjects = async () => {
  const projects = await platformStores.projects.read();
  return [...projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createProject = async (payload: { requirementId: string; name: string }) => {
  const projects = await platformStores.projects.read();
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    requirementId: payload.requirementId,
    name: payload.name,
    status: "planned",
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  await platformStores.projects.write(projects);
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
    createdAt: now,
    updatedAt: now,
  };

  const updatedDocuments = documents.map((doc) =>
    doc.projectId === payload.projectId && doc.type === docType && doc.status !== "archived"
      ? { ...doc, status: "archived", updatedAt: now }
      : doc
  );

  await writeDocumentFile(contentUrl, payload.content);
  updatedDocuments.push(document);
  await platformStores.projectDocuments.write(updatedDocuments);

  return document;
};
