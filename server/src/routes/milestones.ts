import type { FastifyPluginAsync } from "fastify";
import { createMilestone, getProjectById, getRequirementById, listMilestones, updateMilestone } from "../platformData.js";
import { addAuditLog } from "../store.js";
import { notifyUsers } from "../notificationService.js";

const milestonesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects/:id/milestones", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const milestones = await listMilestones(id);
    return { milestones };
  });

  app.post(
    "/projects/:id/milestones",
    { preHandler: app.requirePermission("projects.milestones.manage") },
    async (request, reply) => {
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

    try {
      const project = await getProjectById(id);
      const requirement = project ? await getRequirementById(project.requirementId) : null;
      if (requirement?.ownerId) {
        await notifyUsers({
          recipientIds: [requirement.ownerId],
          actorId: request.user?.sub ?? null,
          type: "collaboration.milestone.created",
          title: "新增里程碑",
          message: `新增里程碑：「${milestone.title}」。`,
          link: `/my/requirements/${project?.requirementId ?? ""}?tab=collaboration`,
        });
      }
    } catch (error) {
      request.log.error(error);
    }
    return reply.code(201).send({ milestone });
  });

  app.patch(
    "/projects/:id/milestones/:milestoneId",
    { preHandler: app.requirePermission("projects.milestones.manage") },
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

      try {
        const project = await getProjectById(id);
        const requirement = project ? await getRequirementById(project.requirementId) : null;
        if (requirement?.ownerId) {
          await notifyUsers({
            recipientIds: [requirement.ownerId],
            actorId: request.user?.sub ?? null,
            type: "collaboration.milestone.updated",
            title: "里程碑已更新",
            message: `里程碑「${updated.title}」狀態更新為 ${updated.status}。`,
            link: `/my/requirements/${project?.requirementId ?? ""}?tab=collaboration`,
          });
        }
      } catch (error) {
        request.log.error(error);
      }
      return reply.send({ milestone: updated });
    }
  );
};

export default milestonesRoutes;
