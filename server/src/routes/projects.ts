import type { FastifyPluginAsync } from "fastify";
import {
  createProject,
  createProjectDocument,
  deleteProject,
  deleteProjectDocument,
  getProjectById,
  getProjectDocument,
  getRequirementById,
  listProjectDocuments,
  listProjects,
  reviewProjectDocument,
} from "../platformData.js";
import { addAuditLog } from "../store.js";
import { hasPermission } from "../permissionsStore.js";
import { listActiveUserIdsByRole, notifyUsers } from "../notificationService.js";

const projectDocumentPermissionMap: Record<string, string> = {
  requirement: "projects.documents.requirement",
  system: "projects.documents.system",
  software: "projects.documents.software",
  test: "projects.documents.test",
  delivery: "projects.documents.delivery",
};
const allowedProjectDocumentTypes = new Set(Object.keys(projectDocumentPermissionMap));

const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async () => {
    const projects = await listProjects();
    return {
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        requirementId: project.requirementId,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    };
  });

  app.post("/projects", { preHandler: app.requirePermission("projects.create") }, async (request, reply) => {
    const body = (request.body as { requirementId?: string; name?: string }) ?? {};
    const requirementId = String(body.requirementId ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!requirementId || !name) {
      return reply.code(400).send({ message: "請提供 requirementId 與 name。" });
    }

    const project = await createProject({ requirementId, name });
    if (request.user?.sub) {
      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "PROJECT_CREATED",
        before: null,
        after: { projectId: project.id, requirementId },
      });
    }
    try {
      const requirement = await getRequirementById(requirementId);
      const roleRecipients = await listActiveUserIdsByRole(["admin"]);
      const recipients = [
        ...roleRecipients,
        requirement?.ownerId ?? "",
      ].filter(Boolean);
      await notifyUsers({
        recipientIds: recipients,
        actorId: request.user?.sub ?? null,
        type: "project.created",
        title: "需求已建立專案",
        message: `需求「${requirement?.title ?? requirementId}」已建立專案「${project.name}」。`,
        link: `/workspace`,
      });
    } catch (error) {
      app.log.error(error);
    }
    return reply.code(201).send({ project_id: project.id, status: project.status });
  });

  app.get("/projects/:id/documents", async (request, reply) => {
    const { id } = request.params as { id: string };
    const documents = await listProjectDocuments(id);
    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        version: doc.version,
        status: doc.status,
        versionNote: doc.versionNote,
        reviewComment: doc.reviewComment ?? null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    };
  });

  app.get("/projects/:id/documents/:docId", async (request, reply) => {
    const { id, docId } = request.params as { id: string; docId: string };
    const result = await getProjectDocument(id, docId);
    if (!result) {
      return reply.code(404).send({ message: "找不到文件。" });
    }
    return {
      document: {
        id: result.document.id,
        type: result.document.type,
        title: result.document.title,
        version: result.document.version,
        status: result.document.status,
        versionNote: result.document.versionNote,
        reviewComment: result.document.reviewComment ?? null,
        createdAt: result.document.createdAt,
        updatedAt: result.document.updatedAt,
      },
      content: result.content,
    };
  });

  app.post("/projects/:id/documents", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as {
      type?: string;
      title?: string;
      content?: string;
      version_note?: string;
      status?: "draft" | "pending_approval" | "approved" | "archived";
    }) ?? {};
    const type = String(body.type ?? "").trim();
    const title = String(body.title ?? "").trim();
    const content = String(body.content ?? "").trim();

    if (!type || !title || !content) {
      return reply.code(400).send({ message: "請提供 type、title 與 content。" });
    }
    if (!allowedProjectDocumentTypes.has(type)) {
      return reply.code(400).send({ message: "不支援的文件類型。" });
    }

    const permissionId = projectDocumentPermissionMap[type];
    const allowed = await hasPermission(request.user.role, permissionId);
    if (!allowed) {
      return reply.code(403).send({ message: "權限不足，無法建立此類型文件。" });
    }

    let document;
    try {
      document = await createProjectDocument({
        projectId: id,
        type,
        title,
        content,
        status: body.status,
        versionNote: body.version_note ?? null,
      });
    } catch (error) {
      return reply
        .code(400)
        .send({ message: error instanceof Error ? error.message : "文件建立失敗。" });
    }

    if (request.user?.sub) {
      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "PROJECT_DOCUMENT_CREATED",
        before: null,
        after: { projectId: id, documentId: document.id, version: document.version },
      });
    }
    try {
      const project = await getProjectById(id);
      const requirement = project ? await getRequirementById(project.requirementId) : null;
      const roleRecipients = await listActiveUserIdsByRole(["admin"]);
      const recipients = [
        ...roleRecipients,
        requirement?.ownerId ?? "",
      ].filter(Boolean);
      await notifyUsers({
        recipientIds: recipients,
        actorId: request.user?.sub ?? null,
        type: "project.document.created",
        title: "專案文件已更新",
        message: `專案「${project?.name ?? id}」新增 ${type} 文件版本 v${document.version}。`,
        link: `/workspace`,
      });
    } catch (error) {
      app.log.error(error);
    }
    return reply.code(201).send({ document_id: document.id, version: document.version });
  });

  app.post(
    "/projects/:id/documents/:docId/review",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const body = (request.body as { approved?: boolean; comment?: string }) ?? {};
      const comment = body.comment ? String(body.comment).trim() : null;

      const updated = await reviewProjectDocument({
        projectId: id,
        docId,
        approved: typeof body.approved === "boolean" ? body.approved : undefined,
        reviewerId: request.user.sub,
        comment,
      });
      if (!updated) {
        return reply.code(404).send({ message: "找不到文件。" });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "PROJECT_DOCUMENT_REVIEWED",
        before: null,
        after: { projectId: id, documentId: docId, status: updated.status },
      });

      try {
        const project = await getProjectById(id);
        const requirement = project ? await getRequirementById(project.requirementId) : null;
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          requirement?.ownerId ?? "",
        ].filter(Boolean);
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "project.document.reviewed",
          title: body.approved === false ? "專案文件需調整" : "專案文件已簽核",
          message: `專案「${project?.name ?? id}」的文件已完成簽核回覆。`,
          link: `/workspace`,
        });
      } catch (error) {
        app.log.error(error);
      }

      return { status: updated.status };
    }
  );

  app.delete(
    "/projects/:id/documents/:docId",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const deleted = await deleteProjectDocument(id, docId);
      if (!deleted) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "PROJECT_DOCUMENT_DELETED",
        before: null,
        after: { projectId: id, documentId: docId },
      });
      return { ok: true };
    }
  );

  app.delete("/projects/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await deleteProject(id);
    if ("error" in result) {
      return reply.code(404).send({ message: "找不到專案。" });
    }
    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "PROJECT_DELETED",
      before: null,
      after: { projectId: id },
    });
    return { ok: true };
  });
};

export default projectsRoutes;
