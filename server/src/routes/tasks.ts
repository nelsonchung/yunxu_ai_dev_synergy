import type { FastifyPluginAsync } from "fastify";
import { createTask, listTasks, updateTask } from "../platformData.js";
import { addAuditLog } from "../store.js";

const tasksRoutes: FastifyPluginAsync = async (app) => {
  app.get("/projects/:id/tasks", { preHandler: app.authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const tasks = await listTasks(id);
    return { tasks };
  });

  app.post(
    "/projects/:id/tasks",
    { preHandler: app.requirePermission("projects.tasks.manage") },
    async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as {
      title?: string;
      status?: "todo" | "in_progress" | "review" | "done";
      assignee_id?: string;
      due_date?: string;
    }) ?? {};
    const title = String(body.title ?? "").trim();
    if (!title) {
      return reply.code(400).send({ message: "請提供任務標題。" });
    }

    const task = await createTask({
      projectId: id,
      title,
      status: body.status,
      assigneeId: body.assignee_id ?? null,
      dueDate: body.due_date ?? null,
    });

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "TASK_CREATED",
      before: null,
      after: { taskId: task.id, projectId: id, status: task.status },
    });
    return reply.code(201).send({ task });
  });

  app.patch(
    "/projects/:id/tasks/:taskId",
    { preHandler: app.requirePermission("projects.tasks.manage") },
    async (request, reply) => {
    const { id, taskId } = request.params as { id: string; taskId: string };
    const body = (request.body as {
      title?: string;
      status?: "todo" | "in_progress" | "review" | "done";
      assignee_id?: string | null;
      due_date?: string | null;
    }) ?? {};

    const updated = await updateTask(id, taskId, {
      title: body.title,
      status: body.status,
      assigneeId: body.assignee_id ?? undefined,
      dueDate: body.due_date ?? undefined,
    });

    if (!updated) {
      return reply.code(404).send({ message: "找不到任務。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: null,
      action: "TASK_UPDATED",
      before: null,
      after: { taskId, projectId: id, status: updated.status },
    });
    return reply.send({ task: updated });
  });
};

export default tasksRoutes;
