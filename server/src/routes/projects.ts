import type { FastifyPluginAsync } from "fastify";
import {
  createProject,
  createProjectDocument,
  deleteProject,
  deleteProjectDocument,
  getDevelopmentChecklist,
  getProjectById,
  getProjectDocument,
  getQuotationReview,
  getRequirementById,
  listProjectDocuments,
  listProjects,
  reviewProjectDocument,
  reviewQuotationReview,
  submitQuotationReview,
  updateDevelopmentChecklistItem,
  upsertDevelopmentChecklist,
  upsertQuotationReview,
  updateProjectStatus,
} from "../platformData.js";
import { addAuditLog } from "../store.js";
import { hasPermission } from "../permissionsStore.js";
import { listActiveUserIdsByRole, notifyUsers } from "../notificationService.js";
import type { ProjectStatus } from "../platformStore.js";

const projectDocumentPermissionMap: Record<string, string> = {
  requirement: "projects.documents.requirement",
  system: "projects.documents.system",
  software: "projects.documents.software",
  test: "projects.documents.test",
  delivery: "projects.documents.delivery",
};
const allowedProjectDocumentTypes = new Set(Object.keys(projectDocumentPermissionMap));
const projectStatusLabels: Record<ProjectStatus, string> = {
  intake: "需求受理",
  requirements_signed: "需求簽核",
  architecture_review: "架構審查",
  system_architecture_signed: "架構簽核",
  software_design_review: "設計審查",
  software_design_signed: "設計簽核",
  implementation: "實作開發",
  system_verification: "系統驗證",
  system_verification_signed: "系統驗證簽核",
  delivery_review: "交付審查",
  on_hold: "暫停中",
  canceled: "已取消",
  closed: "已結案",
};
const allowedProjectStatuses = new Set<ProjectStatus>(
  Object.keys(projectStatusLabels) as ProjectStatus[]
);

const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects", async () => {
    const projects = await listProjects();
    return {
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        requirementId: project.requirementId,
        status: project.status,
        previousStatus: project.previousStatus,
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
        link: `/workspace?project=${project.id}`,
        linkByRole: {
          customer: `/my/requirements/${requirementId}`,
        },
      });
    } catch (error) {
      app.log.error(error);
    }
    return reply.code(201).send({ project_id: project.id, status: project.status });
  });

  app.patch(
    "/projects/:id/status",
    { preHandler: app.requirePermission("projects.status.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { status?: string }) ?? {};
      const nextStatus = String(body.status ?? "").trim() as ProjectStatus;

      if (!allowedProjectStatuses.has(nextStatus)) {
        return reply.code(400).send({ message: "不支援的專案狀態。" });
      }

      const result = await updateProjectStatus(id, nextStatus);
      if ("error" in result) {
        if (result.error === "NOT_FOUND") {
          return reply.code(404).send({ message: "找不到專案。" });
        }
        if (result.error === "GUARD_FAILED") {
          return reply.code(409).send({
            message: result.reason ?? "尚未滿足狀態轉換條件。",
          });
        }
        return reply.code(409).send({
          message: `狀態無法由 ${result.from} 轉換為 ${result.to}。`,
        });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "PROJECT_STATUS_UPDATED",
        before: { projectId: id, status: result.before.status },
        after: { projectId: id, status: result.after.status },
      });

      try {
        const requirement = await getRequirementById(result.after.requirementId);
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          requirement?.ownerId ?? "",
        ].filter(Boolean);
        const beforeLabel = projectStatusLabels[result.before.status] ?? result.before.status;
        const afterLabel = projectStatusLabels[result.after.status] ?? result.after.status;
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "project.status.updated",
          title: "專案狀態已更新",
          message: `專案「${result.after.name}」狀態由「${beforeLabel}」變更為「${afterLabel}」。`,
          link: `/workspace?project=${result.after.id}`,
          linkByRole: {
            customer: `/my/requirements/${result.after.requirementId}`,
          },
        });
      } catch (error) {
        app.log.error(error);
      }

      return { project: result.after };
    }
  );

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

  app.get(
    "/projects/:id/documents/:docId/quotation",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const review = await getQuotationReview(id, docId);
      if (request.user.role === "customer" && review?.status === "draft") {
        return { quotation: null };
      }
      return { quotation: review };
    }
  );

  app.post(
    "/projects/:id/documents/:docId/quotation",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      if (request.user.role === "customer") {
        return reply.code(403).send({ message: "僅開發者或管理者可建立報價。" });
      }
      const body = (request.body as {
        currency?: string;
        items?: Array<{
          key?: string;
          path?: string;
          h1?: string;
          h2?: string | null;
          h3?: string;
          price?: number | null;
        }>;
      }) ?? {};

      const documentResult = await getProjectDocument(id, docId);
      if (!documentResult) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      if (documentResult.document.type !== "software") {
        return reply.code(400).send({ message: "僅軟體設計文件可建立審查報價。" });
      }

      const items = Array.isArray(body.items)
        ? body.items.map((item) => ({
            key: String(item.key ?? "").trim(),
            path: String(item.path ?? "").trim(),
            h1: String(item.h1 ?? "").trim(),
            h2: item.h2 ? String(item.h2).trim() : null,
            h3: String(item.h3 ?? "").trim(),
            price:
              typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null,
          }))
        : [];

      if (!items.length) {
        return reply.code(400).send({ message: "請提供報價項目。" });
      }

      const review = await upsertQuotationReview({
        projectId: id,
        documentId: docId,
        documentVersion: documentResult.document.version,
        currency: body.currency,
        items,
        actorId: request.user?.sub ?? null,
      });

      if (request.user?.sub) {
        await addAuditLog({
          actorId: request.user.sub,
          targetUserId: null,
          action: "PROJECT_DOCUMENT_QUOTATION_UPDATED",
          before: null,
          after: { projectId: id, documentId: docId, total: review.total },
        });
      }

      return { quotation: review };
    }
  );

  app.post(
    "/projects/:id/documents/:docId/quotation/submit",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      if (request.user.role === "customer") {
        return reply.code(403).send({ message: "僅開發者或管理者可提交報價。" });
      }
      const documentResult = await getProjectDocument(id, docId);
      if (!documentResult) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      if (documentResult.document.type !== "software") {
        return reply.code(400).send({ message: "僅軟體設計文件可提交報價。" });
      }

      const updated = await submitQuotationReview({
        projectId: id,
        documentId: docId,
        actorId: request.user?.sub ?? null,
      });
      if (!updated) {
        return reply.code(400).send({ message: "請先儲存報價內容。" });
      }

      if (request.user?.sub) {
        await addAuditLog({
          actorId: request.user.sub,
          targetUserId: null,
          action: "PROJECT_DOCUMENT_QUOTATION_SUBMITTED",
          before: null,
          after: { projectId: id, documentId: docId, total: updated.total },
        });
      }

      return { quotation: updated };
    }
  );

  app.post(
    "/projects/:id/documents/:docId/quotation/review",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const body = (request.body as { approved?: boolean; comment?: string }) ?? {};
      if (request.user.role !== "customer" && request.user.role !== "admin") {
        return reply.code(403).send({ message: "僅客戶或管理者可審核報價。" });
      }
      if (typeof body.approved !== "boolean") {
        return reply.code(400).send({ message: "請提供 approved。" });
      }

      const project = await getProjectById(id);
      if (!project) {
        return reply.code(404).send({ message: "找不到專案。" });
      }
      const requirement = await getRequirementById(project.requirementId);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (request.user.role === "customer" && requirement.ownerId !== request.user.sub) {
        return reply.code(403).send({ message: "僅需求提出者可審核報價。" });
      }
      if (!body.approved && !String(body.comment ?? "").trim()) {
        return reply.code(400).send({ message: "請提供修改建議。" });
      }

      const review = await getQuotationReview(id, docId);
      if (!review || review.status !== "submitted") {
        return reply.code(400).send({ message: "報價尚未提交。" });
      }

      const docResult = await getProjectDocument(id, docId);
      if (!docResult) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      if (docResult.document.type !== "software") {
        return reply.code(400).send({ message: "僅軟體設計文件可審核報價。" });
      }

      const updated = await reviewQuotationReview({
        projectId: id,
        documentId: docId,
        approved: body.approved,
        comment: body.comment ? String(body.comment).trim() : null,
        actorId: request.user?.sub ?? null,
      });
      if (!updated) {
        return reply.code(404).send({ message: "找不到報價。" });
      }

      if (body.approved) {
        await upsertDevelopmentChecklist({
          projectId: id,
          documentId: docId,
          documentVersion: docResult.document.version,
          content: docResult.content,
          actorId: request.user?.sub ?? null,
        });
      }

      if (request.user?.sub) {
        await addAuditLog({
          actorId: request.user.sub,
          targetUserId: null,
          action: "PROJECT_DOCUMENT_QUOTATION_REVIEWED",
          before: null,
          after: {
            projectId: id,
            documentId: docId,
            status: updated.status,
          },
        });
      }

      return { quotation: updated };
    }
  );

  app.get(
    "/projects/:id/checklist",
    { preHandler: app.requirePermission("projects.documents.review") },
    async (request) => {
      const { id } = request.params as { id: string };
      const checklist = await getDevelopmentChecklist(id);
      return { checklist };
    }
  );

  app.patch(
    "/projects/:id/checklist",
    { preHandler: app.requirePermission("projects.tasks.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { item_id?: string; done?: boolean }) ?? {};
      if (!body.item_id || typeof body.done !== "boolean") {
        return reply.code(400).send({ message: "請提供 item_id 與 done。" });
      }
      const updated = await updateDevelopmentChecklistItem({
        projectId: id,
        itemId: String(body.item_id),
        done: body.done,
        actorId: request.user?.sub ?? null,
      });
      if (!updated) {
        return reply.code(404).send({ message: "找不到 checklist。" });
      }
      return { checklist: updated };
    }
  );

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
      const requirementId = requirement?.id ?? project?.requirementId ?? "";
      await notifyUsers({
        recipientIds: recipients,
        actorId: request.user?.sub ?? null,
        type: "project.document.created",
        title: "專案文件已更新",
        message: `專案「${project?.name ?? id}」新增 ${type} 文件版本 v${document.version}。`,
        link: `/workspace?project=${id}`,
        linkByRole: requirementId
          ? {
              customer: `/my/requirements/${requirementId}`,
            }
          : undefined,
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

      const project = await getProjectById(id);
      if (!project) {
        return reply.code(404).send({ message: "找不到專案。" });
      }
      const requirement = await getRequirementById(project.requirementId);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (typeof body.approved === "boolean" && request.user.role !== "admin") {
        if (requirement.ownerId !== request.user.sub) {
          return reply.code(403).send({ message: "僅需求提出者可簽核專案文件。" });
        }
      }

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

      let autoTransitionTo: ProjectStatus | null = null;
      if (body.approved === true) {
        const autoTransitionByDocType: Record<string, { from: ProjectStatus; to: ProjectStatus }> = {
          system: { from: "architecture_review", to: "system_architecture_signed" },
          software: { from: "software_design_review", to: "software_design_signed" },
          test: { from: "system_verification", to: "system_verification_signed" },
          delivery: { from: "delivery_review", to: "closed" },
        };
        const target = autoTransitionByDocType[updated.type];
        if (target) {
          const currentProject = await getProjectById(id);
          const matchesFrom =
            currentProject &&
            (currentProject.status === target.from ||
              (currentProject.status === "on_hold" && currentProject.previousStatus === target.from));
          if (matchesFrom) {
            const result = await updateProjectStatus(id, target.to);
            if (!("error" in result)) {
              autoTransitionTo = result.after.status;
              await addAuditLog({
                actorId: request.user.sub,
                targetUserId: null,
                action: "PROJECT_STATUS_UPDATED",
                before: { projectId: id, status: result.before.status },
                after: { projectId: id, status: result.after.status },
              });
            }
          }
        }
      }

      try {
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          requirement?.ownerId ?? "",
        ].filter(Boolean);
        const autoNote = autoTransitionTo
          ? `，專案狀態已自動更新為「${projectStatusLabels[autoTransitionTo] ?? autoTransitionTo}」`
          : "";
        const reviewMessage =
          body.approved === false
            ? `專案「${project?.name ?? id}」的文件已被退回，請依簽核意見調整。`
            : `專案「${project?.name ?? id}」的文件已完成簽核${autoNote}。`;
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "project.document.reviewed",
          title: body.approved === false ? "專案文件需調整" : "專案文件已簽核",
          message: reviewMessage,
          link: `/workspace?project=${id}`,
          linkByRole: {
            customer: `/my/requirements/${project.requirementId}`,
          },
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
