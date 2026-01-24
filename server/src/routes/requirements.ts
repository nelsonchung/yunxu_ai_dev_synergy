import type { FastifyPluginAsync } from "fastify";
import {
  approveRequirement,
  createRequirement,
  deleteRequirement,
  deleteRequirementDocument,
  getRequirementById,
  getRequirementDocument,
  listRequirementDocuments,
  listRequirements,
} from "../platformData.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  app.post("/requirements", async (request, reply) => {
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

    let ownerId: string | null = null;
    try {
      await request.jwtVerify();
      ownerId = request.user.sub;
    } catch {
      ownerId = null;
    }

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
    "/requirements/:id/approve",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { approved?: boolean; comment?: string }) ?? {};
      if (typeof body.approved !== "boolean") {
        return reply.code(400).send({ message: "請提供 approved 旗標。" });
      }

      const updated = await approveRequirement(id, body.approved, request.user.sub, body.comment);
      if (!updated) {
        return reply.code(404).send({ message: "找不到需求。" });
      }

      return { status: updated.status, approved_at: updated.updatedAt };
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
      return { ok: true };
    }
  );
};

export default requirementsRoutes;
