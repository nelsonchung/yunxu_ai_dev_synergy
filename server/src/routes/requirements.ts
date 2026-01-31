import type { FastifyPluginAsync } from "fastify";
import {
  approveRequirement,
  commentRequirementDocument,
  createRequirement,
  createRequirementDocument,
  deleteRequirement,
  deleteRequirementDocument,
  forceSetProjectStatus,
  getRequirementById,
  getRequirementDocument,
  listRequirementDocuments,
  listRequirements,
  listProjects,
  updateProjectStatus,
} from "../platformData.js";
import { addAuditLog, findUserById } from "../store.js";
import { listActiveUserIdsByRole, notifyUsers } from "../notificationService.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const projectStatusLabels: Record<string, string> = {
  requirements_signed: "需求簽核",
};

const normalizeAttachments = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const requirementsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/requirements", async () => {
    const requirements = await listRequirements();
    return {
      requirements: requirements.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        companyName: item.companyName,
        projectType: item.projectType,
        budgetRange: item.budgetRange,
        timeline: item.timeline,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  });

  app.get("/requirements/me", { preHandler: app.authenticate }, async (request) => {
    const requirements = await listRequirements();
    const owned = requirements.filter((item) => item.ownerId === request.user.sub);
    return {
      requirements: owned.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        companyName: item.companyName,
        projectType: item.projectType,
        budgetRange: item.budgetRange,
        timeline: item.timeline,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    };
  });

  app.post("/requirements", { preHandler: app.requirePermission("requirements.create") }, async (request, reply) => {
    const body = (request.body as Record<string, unknown>) ?? {};
    const contact = (body.contact as Record<string, unknown>) ?? {};
    const contactName = String(contact.name ?? body.contactName ?? "").trim();
    const contactEmail = String(contact.email ?? body.contactEmail ?? "").trim();
    const contactPhone = String(contact.phone ?? body.contactPhone ?? "").trim();

    const title = String(body.title ?? "").trim();
    const background = String(body.background ?? "").trim();
    const goals = String(body.goals ?? "").trim();
    const scope = String(body.scope ?? "").trim();

    if (!title || !background || !goals || !scope || !contactName || !contactEmail) {
      return reply.code(400).send({ message: "請完整填寫必要欄位。" });
    }
    if (!emailRegex.test(contactEmail)) {
      return reply.code(400).send({ message: "聯絡 Email 格式不正確。" });
    }

    const ownerId = request.user.sub;

    const result = await createRequirement({
      title,
      companyName: String(body.companyName ?? "").trim(),
      projectType: String(body.projectType ?? "").trim(),
      background,
      goals,
      scope,
      constraints: String(body.constraints ?? "").trim(),
      budgetRange: String(body.budgetRange ?? "").trim(),
      timeline: String(body.timeline ?? "").trim(),
      specDoc: String(body.specDoc ?? "").trim(),
      attachments: normalizeAttachments(body.attachments),
      contact: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
      },
      ownerId,
    });

    try {
      const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
      await notifyUsers({
        recipientIds: roleRecipients,
        actorId: request.user.sub,
        type: "requirement.created",
        title: "新需求已提交",
        message: `需求「${result.requirement.title}」已提交，請評估是否接案。`,
        link: `/requirements/${result.requirement.id}`,
      });
    } catch (error) {
      app.log.error(error);
    }

    return reply.code(201).send({
      id: result.requirement.id,
      status: result.requirement.status,
      document_id: result.document.id,
    });
  });

  app.get("/requirements/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const requirement = await getRequirementById(id);
    if (!requirement) {
      return reply.code(404).send({ message: "找不到需求。" });
    }
    return { requirement };
  });

  app.get(
    "/requirements/:id/projects",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const requirement = await getRequirementById(id);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (requirement.ownerId && request.user.role !== "admin" && requirement.ownerId !== request.user.sub) {
        return reply.code(403).send({ message: "權限不足。" });
      }
      const projects = await listProjects();
      const items = projects.filter((project) => project.requirementId === id);
      return { projects: items };
    }
  );

  app.post(
    "/requirements/:id/interest",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (request.user.role !== "developer" && request.user.role !== "admin") {
        return reply.code(403).send({ message: "權限不足。" });
      }
      const requirement = await getRequirementById(id);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (!requirement.ownerId) {
        return reply.code(400).send({ message: "需求尚未設定客戶。" });
      }

      const body = (request.body as { message?: string }) ?? {};
      const customMessage = String(body.message ?? "").trim();
      const sender = request.user?.sub ? await findUserById(request.user.sub) : null;
      const developerLabel = sender?.username?.trim() || sender?.email?.trim() || "開發商";
      const customerLabel =
        requirement.companyName?.trim() || requirement.contact?.name?.trim() || "客戶";
      const defaultMessage = `開發商「${developerLabel}」對你的需求有興趣，方便告知預計何時完成需求文件嗎？`;
      const finalMessage = customMessage || defaultMessage;

      await notifyUsers({
        recipientIds: [requirement.ownerId],
        actorId: request.user?.sub ?? null,
        type: "requirement.interest",
        title: `開發商「${developerLabel}」對需求有興趣`,
        message: `需求「${requirement.title}」：${finalMessage}`,
        link: `/my/requirements/${id}`,
      });

      if (request.user?.sub) {
        await addAuditLog({
          actorId: request.user.sub,
          targetUserId: requirement.ownerId,
          action: "REQUIREMENT_INTEREST_SENT",
          before: null,
          after: {
            requirementId: id,
            customerLabel,
            message: finalMessage,
          },
        });
      }

      return { ok: true };
    }
  );

  app.get("/requirements/:id/documents", async (request, reply) => {
    const { id } = request.params as { id: string };
    const requirement = await getRequirementById(id);
    if (!requirement) {
      return reply.code(404).send({ message: "找不到需求。" });
    }
    const documents = await listRequirementDocuments(id);
    return {
      documents: documents.map((doc) => ({
        id: doc.id,
        version: doc.version,
        status: doc.status,
        reviewComment: doc.reviewComment,
        updatedAt: doc.updatedAt,
        createdAt: doc.createdAt,
      })),
    };
  });

  app.get("/requirements/:id/documents/:docId", async (request, reply) => {
    const { id, docId } = request.params as { id: string; docId: string };
    const result = await getRequirementDocument(id, docId);
    if (!result) {
      return reply.code(404).send({ message: "找不到文件。" });
    }
    return {
      document: {
        id: result.document.id,
        version: result.document.version,
        status: result.document.status,
        reviewComment: result.document.reviewComment,
        updatedAt: result.document.updatedAt,
        createdAt: result.document.createdAt,
      },
      content: result.content,
    };
  });

  app.post(
    "/requirements/:id/documents",
    { preHandler: app.requirePermission("requirements.documents.manage") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { content?: string }) ?? {};
      const content = String(body.content ?? "").trim();
      if (!content) {
        return reply.code(400).send({ message: "請提供文件內容。" });
      }

      const requirement = await getRequirementById(id);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (request.user.role !== "admin" && requirement.ownerId !== request.user.sub) {
        return reply.code(403).send({ message: "僅需求提出者可編修需求文件。" });
      }

      const document = await createRequirementDocument({ requirementId: id, content });
      if (!document) {
        return reply.code(404).send({ message: "找不到需求。" });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "REQUIREMENT_DOCUMENT_CREATED",
        before: null,
        after: { requirementId: id, documentId: document.id, version: document.version },
      });

      let rollbackCount = 0;
      try {
        const projects = (await listProjects()).filter((project) => project.requirementId === id);
        for (const project of projects) {
          if (project.status === "closed" || project.status === "canceled") continue;
          const result = await forceSetProjectStatus(project.id, "requirements_signed");
          if ("error" in result) continue;
          if (result.before.status !== result.after.status) {
            rollbackCount += 1;
            await addAuditLog({
              actorId: request.user.sub,
              targetUserId: null,
              action: "PROJECT_STATUS_UPDATED",
              before: { projectId: project.id, status: result.before.status },
              after: { projectId: project.id, status: result.after.status },
            });
          }
        }
      } catch (error) {
        app.log.error(error);
      }

      try {
        const requirement = await getRequirementById(id);
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          requirement?.ownerId ?? "",
        ].filter(Boolean);
        const rollbackNote = rollbackCount > 0 ? "專案已回到需求簽核，請重新確認。" : "";
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "requirement.document.updated",
          title: "需求文件已更新",
          message: `需求「${requirement?.title ?? id}」已更新文件版本 v${document.version}。${rollbackNote}`,
          link: `/requirements/${id}`,
          linkByRole: {
            customer: `/my/requirements/${id}`,
          },
        });
      } catch (error) {
        app.log.error(error);
      }

      return reply.code(201).send({ document_id: document.id, version: document.version });
    }
  );

  app.post(
    "/requirements/:id/approve",
    { preHandler: app.requirePermission("requirements.documents.review") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { approved?: boolean; comment?: string }) ?? {};
      if (typeof body.approved !== "boolean") {
        return reply.code(400).send({ message: "請提供 approved 旗標。" });
      }

      const requirement = await getRequirementById(id);
      if (!requirement) {
        return reply.code(404).send({ message: "找不到需求。" });
      }
      if (request.user.role !== "admin" && requirement.ownerId !== request.user.sub) {
        return reply.code(403).send({ message: "僅需求提出者可簽核需求文件。" });
      }

      const updated = await approveRequirement(id, body.approved, request.user.sub, body.comment);
      if (!updated) {
        return reply.code(404).send({ message: "找不到需求。" });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: body.approved ? "REQUIREMENT_APPROVED" : "REQUIREMENT_REJECTED",
        before: null,
        after: { requirementId: id, comment: body.comment ?? "" },
      });

      let autoTransitioned = 0;
      if (body.approved) {
        const projects = (await listProjects()).filter((project) => project.requirementId === id);
        const eligible = projects.filter(
          (project) =>
            project.status === "intake" ||
            (project.status === "on_hold" && project.previousStatus === "intake")
        );
        for (const project of eligible) {
          const result = await updateProjectStatus(project.id, "requirements_signed");
          if ("error" in result) continue;
          autoTransitioned += 1;
          await addAuditLog({
            actorId: request.user.sub,
            targetUserId: null,
            action: "PROJECT_STATUS_UPDATED",
            before: { projectId: project.id, status: result.before.status },
            after: { projectId: project.id, status: result.after.status },
          });
        }
      }

      try {
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          updated.ownerId ?? "",
        ].filter(Boolean);
        const customerLabel =
          updated.companyName?.trim() || updated.contact?.name?.trim() || "客戶";
        const autoNote =
          autoTransitioned > 0
            ? `，並已自動推進 ${autoTransitioned} 個專案至「${
                projectStatusLabels.requirements_signed
              }」`
            : "";
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "requirement.reviewed",
          title: body.approved
            ? `客戶「${customerLabel}」需求已核准`
            : `客戶「${customerLabel}」需求已退回`,
          message: `客戶「${customerLabel}」的需求「${updated.title}」${
            body.approved ? "已核准" : "已退回"
          }${autoNote}。`,
          link: `/requirements/${id}`,
          linkByRole: {
            customer: `/my/requirements/${id}`,
          },
        });
      } catch (error) {
        app.log.error(error);
      }

      return { status: updated.status, approved_at: updated.updatedAt };
    }
  );

  app.post(
    "/requirements/:id/documents/:docId/comment",
    { preHandler: app.requirePermission("requirements.documents.review") },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const body = (request.body as { comment?: string }) ?? {};
      const comment = String(body.comment ?? "").trim();
      if (!comment) {
        return reply.code(400).send({ message: "請提供留言內容。" });
      }

      const updated = await commentRequirementDocument({
        requirementId: id,
        docId,
        comment,
      });
      if (!updated) {
        return reply.code(404).send({ message: "找不到文件。" });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "REQUIREMENT_DOCUMENT_COMMENTED",
        before: null,
        after: { requirementId: id, documentId: docId },
      });

      try {
        const requirement = await getRequirementById(id);
        const roleRecipients = await listActiveUserIdsByRole(["developer", "admin"]);
        const recipients = [
          ...roleRecipients,
          requirement?.ownerId ?? "",
        ].filter(Boolean);
        const customerLabel =
          requirement?.companyName?.trim() || requirement?.contact?.name?.trim() || "客戶";
        await notifyUsers({
          recipientIds: recipients,
          actorId: request.user.sub,
          type: "requirement.document.commented",
          title: `客戶「${customerLabel}」在需求文件有新留言`,
          message: `客戶「${customerLabel}」在需求「${requirement?.title ?? id}」留下新的留言或回覆。`,
          link: `/requirements/${id}`,
          linkByRole: {
            customer: `/my/requirements/${id}`,
          },
        });
      } catch (error) {
        app.log.error(error);
      }

      return { ok: true };
    }
  );

  app.delete(
    "/requirements/:id/documents/:docId",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const deleted = await deleteRequirementDocument(id, docId);
      if (!deleted) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "REQUIREMENT_DOCUMENT_DELETED",
        before: null,
        after: { requirementId: id, documentId: docId },
      });
      return { ok: true };
    }
  );

  app.delete(
    "/requirements/:id",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await deleteRequirement(id);
      if ("error" in result) {
        if (result.error === "HAS_PROJECTS") {
          return reply.code(409).send({ message: "已有專案建立，無法刪除需求。" });
        }
        return reply.code(404).send({ message: "找不到需求。" });
      }
      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "REQUIREMENT_DELETED",
        before: null,
        after: { requirementId: id },
      });
      return { ok: true };
    }
  );
};

export default requirementsRoutes;
