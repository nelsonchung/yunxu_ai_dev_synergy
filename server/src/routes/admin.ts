import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import {
  addAuditLog,
  listUsers,
  toPublicUser,
  updateUser,
  updateUserPassword,
} from "../store.js";

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get("/users", { preHandler: app.requireAdmin }, async () => {
    const users = await listUsers();
    const sorted = [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { users: sorted.map(toPublicUser) };
  });

  app.patch("/users/:id/role", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role?: "customer" | "developer" | "admin" };

    if (!role) {
      return reply.code(400).send({ message: "請提供角色。" });
    }

    const updated = await updateUser(id, { role });
    if (!updated) {
      return reply.code(404).send({ message: "找不到使用者。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: id,
      action: "ROLE_CHANGED",
      before: { role: updated.before.role },
      after: { role: updated.after.role },
    });

    return { user: toPublicUser(updated.after) };
  });

  app.patch("/users/:id/status", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status?: "pending" | "active" | "suspended" };

    if (!status) {
      return reply.code(400).send({ message: "請提供狀態。" });
    }

    const updated = await updateUser(id, { status });
    if (!updated) {
      return reply.code(404).send({ message: "找不到使用者。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: id,
      action: "STATUS_CHANGED",
      before: { status: updated.before.status },
      after: { status: updated.after.status },
    });

    return { user: toPublicUser(updated.after) };
  });

  app.patch("/users/:id/password", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password?: string };

    if (!password || password.length < 8) {
      return reply.code(400).send({ message: "密碼至少 8 碼。" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await updateUserPassword(id, passwordHash);
    if (!updated) {
      return reply.code(404).send({ message: "找不到使用者。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: id,
      action: "PASSWORD_RESET",
      before: null,
      after: null,
    });

    return reply.send({ message: "密碼已重設。" });
  });
};

export default adminRoutes;
