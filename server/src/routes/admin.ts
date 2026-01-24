import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import {
  addAuditLog,
  deleteUser,
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

  app.delete("/users/:id", { preHandler: app.requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    if (request.user.sub === id) {
      return reply.code(400).send({ message: "不可刪除自己的帳號。" });
    }

    const removed = await deleteUser(id);
    if (!removed) {
      return reply.code(404).send({ message: "找不到使用者。" });
    }

    await addAuditLog({
      actorId: request.user.sub,
      targetUserId: id,
      action: "USER_DELETED",
      before: {
        id: removed.id,
        username: removed.username,
        email: removed.email,
        role: removed.role,
        status: removed.status,
      },
      after: null,
    });

    return reply.send({ message: "使用者已刪除。" });
  });
};

export default adminRoutes;
