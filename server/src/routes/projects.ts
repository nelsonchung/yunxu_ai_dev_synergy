import type { FastifyPluginAsync } from "fastify";
import {
  createProject,
  createProjectDocument,
  deleteProjectDocument,
  getProjectDocument,
  listProjectDocuments,
  listProjects,
} from "../platformData.js";

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

  app.post("/projects", async (request, reply) => {
    const body = (request.body as { requirementId?: string; name?: string }) ?? {};
    const requirementId = String(body.requirementId ?? "").trim();
    const name = String(body.name ?? "").trim();

    if (!requirementId || !name) {
      return reply.code(400).send({ message: "請提供 requirementId 與 name。" });
    }

    const project = await createProject({ requirementId, name });
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
        createdAt: result.document.createdAt,
        updatedAt: result.document.updatedAt,
      },
      content: result.content,
    };
  });

  app.post("/projects/:id/documents", async (request, reply) => {
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

    return reply.code(201).send({ document_id: document.id, version: document.version });
  });

  app.delete(
    "/projects/:id/documents/:docId",
    { preHandler: app.requireAdmin },
    async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      const deleted = await deleteProjectDocument(id, docId);
      if (!deleted) {
        return reply.code(404).send({ message: "找不到文件。" });
      }
      return { ok: true };
    }
  );
};

export default projectsRoutes;
