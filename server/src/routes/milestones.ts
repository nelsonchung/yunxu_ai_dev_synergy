import type { FastifyPluginAsync } from "fastify";
import { createMilestone, listMilestones, updateMilestone } from "../platformData.js";
import { addAuditLog } from "../store.js";

const milestonesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects/:id/milestones", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const milestones = await listMilestones(id);
    return { milestones };
  });

  app.post("/projects/:id/milestones", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as {
      title?: string;
      status?: "planned" | "active" | "done";
      due_date?: string;
    }) ?? {};
    const title = String(body.title ?? "").trim();
    if (!title) {
      return reply.code(400).send({ message: "請提供里程碑標題。" });
    }

    const milestone = await createMilestone({
      projectId: id,
      title,
      status: body.status,
      dueDate: body.due_date ?? null,
    });

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "MILESTONE_CREATED",
      before: null,
      after: { milestoneId: milestone.id, projectId: id, status: milestone.status },
    });
    return reply.code(201).send({ milestone });
  });

  app.patch(
    "/projects/:id/milestones/:milestoneId",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id, milestoneId } = request.params as { id: string; milestoneId: string };
      const body = (request.body as {
        title?: string;
        status?: "planned" | "active" | "done";
        due_date?: string | null;
      }) ?? {};

      const updated = await updateMilestone(id, milestoneId, {
        title: body.title,
        status: body.status,
        dueDate: body.due_date ?? undefined,
      });

      if (!updated) {
        return reply.code(404).send({ message: "找不到里程碑。" });
      }

      await addAuditLog({
        actorId: request.user.sub,
        targetUserId: null,
        action: "MILESTONE_UPDATED",
        before: null,
        after: { milestoneId, projectId: id, status: updated.status },
      });
      return reply.send({ milestone: updated });
    }
  );
};

export default milestonesRoutes;
