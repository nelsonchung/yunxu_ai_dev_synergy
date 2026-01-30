import type { FastifyPluginAsync } from "fastify";
import { createSupportMessage, listSupportMessages, listSupportThreads } from "../platformData.js";
import { findUserById, listUsers } from "../store.js";
import { listActiveUserIdsByRole, notifyUsers } from "../notificationService.js";

const roleLabels: Record<string, string> = {
  customer: "客戶",
  developer: "開發者",
  admin: "管理員",
};

const formatUserLabel = (user: { username: string; email: string; role: string } | null, fallbackRole: string) => {
  const roleLabel = roleLabels[user?.role ?? fallbackRole] ?? fallbackRole;
  const name = user?.username || user?.email || "未知";
  return `${roleLabel}「${name}」`;
};

const supportRoutes: FastifyPluginAsync = async (app) => {
  app.get("/support/threads", { preHandler: app.requireAdmin }, async () => {
    const [threads, users] = await Promise.all([listSupportThreads(), listUsers()]);
    const userMap = new Map(users.map((user) => [user.id, user]));
    const data = threads.map((thread) => {
      const user = userMap.get(thread.threadId) ?? null;
      return {
        ...thread,
        user: user
          ? { id: user.id, username: user.username, email: user.email, role: user.role }
          : null,
      };
    });
    return { threads: data };
  });

  app.get("/support/messages", { preHandler: app.authenticate }, async (request, reply) => {
    const { thread_id } = request.query as { thread_id?: string };
    const isAdmin = request.user.role === "admin";
    const threadId = isAdmin ? String(thread_id ?? "").trim() : request.user.sub;
    if (isAdmin && !threadId) {
      return reply.code(400).send({ message: "請提供 thread_id。" });
    }
    const messages = await listSupportMessages(threadId);
    return { messages };
  });

  app.post("/support/messages", { preHandler: app.authenticate }, async (request, reply) => {
    const body = (request.body as { thread_id?: string; message?: string }) ?? {};
    const messageText = String(body.message ?? "").trim();
    if (!messageText) {
      return reply.code(400).send({ message: "請提供訊息內容。" });
    }

    const isAdmin = request.user.role === "admin";
    const threadId = isAdmin ? String(body.thread_id ?? "").trim() : request.user.sub;
    if (!threadId) {
      return reply.code(400).send({ message: "請提供 thread_id。" });
    }

    const senderId = request.user.sub;
    const senderRole = request.user.role;
    let recipientId: string | null = null;
    let recipientRole: "customer" | "developer" | "admin" = "admin";

    if (isAdmin) {
      recipientId = threadId;
      const recipientUser = await findUserById(threadId);
      recipientRole = recipientUser?.role ?? "customer";
    }

    const created = await createSupportMessage({
      threadId,
      senderId,
      senderRole,
      recipientId,
      recipientRole,
      message: messageText,
    });

    try {
      if (isAdmin) {
        await notifyUsers({
          recipientIds: [threadId],
          actorId: senderId,
          type: "support.message",
          title: "客服回覆",
          message: `客服已回覆：${messageText}`,
          link: "/support",
        });
      } else {
        const senderUser = await findUserById(senderId);
        const senderLabel = formatUserLabel(senderUser, senderRole);
        const adminRecipients = await listActiveUserIdsByRole(["admin"]);
        if (adminRecipients.length) {
          await notifyUsers({
            recipientIds: adminRecipients,
            actorId: senderId,
            type: "support.message",
            title: `${senderLabel} 有新客服訊息`,
            message: `${senderLabel}：${messageText}`,
            link: `/support?thread=${threadId}`,
          });
        }
      }
    } catch (error) {
      app.log.error(error);
    }

    return reply.code(201).send({ message: created });
  });
};

export default supportRoutes;
