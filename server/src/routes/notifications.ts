import type { FastifyPluginAsync } from "fastify";
import { broadcastUnreadCount } from "../notificationHub.js";
import {
  countUnreadNotifications,
  listNotificationsByRecipient,
  markAllNotificationsRead,
  markNotificationRead,
} from "../notificationsStore.js";
import { notifyUsers } from "../notificationService.js";
import { addAuditLog, findUserById } from "../store.js";

const notificationsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/notifications", { preHandler: app.authenticate }, async (request) => {
    const { status } = request.query as { status?: "unread" };
    const notifications = await listNotificationsByRecipient(request.user.sub, { status });
    return { notifications };
  });

  app.get("/notifications/unread-count", { preHandler: app.authenticate }, async (request) => {
    const count = await countUnreadNotifications(request.user.sub);
    return { count };
  });

  app.post(
    "/notifications/:id/read",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const updated = await markNotificationRead(request.user.sub, id);
      if (!updated) {
        return reply.code(404).send({ message: "找不到通知。" });
      }
      try {
        await broadcastUnreadCount(request.user.sub);
      } catch (error) {
        app.log.error(error);
      }
      return { ok: true };
    }
  );

  app.post(
    "/notifications/read-all",
    { preHandler: app.authenticate },
    async (request) => {
      const updated = await markAllNotificationsRead(request.user.sub);
      try {
        await broadcastUnreadCount(request.user.sub);
      } catch (error) {
        app.log.error(error);
      }
      return { updated };
    }
  );

  app.post(
    "/notifications/:id/reply",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as { message?: string }) ?? {};
      const message = String(body.message ?? "").trim();
      if (!message) {
        return reply.code(400).send({ message: "請提供回覆內容。" });
      }

      const notifications = await listNotificationsByRecipient(request.user.sub);
      const notification = notifications.find((item) => item.id === id);
      if (!notification) {
        return reply.code(404).send({ message: "找不到通知。" });
      }
      if (!notification.actorId) {
        return reply.code(400).send({ message: "此通知無法回覆。" });
      }
      if (notification.type !== "requirement.interest") {
        return reply.code(400).send({ message: "此通知不支援回覆。" });
      }

      const sender = await findUserById(request.user.sub);
      const senderLabel = sender?.username?.trim() || sender?.email?.trim() || "客戶";
      const requirementMatch = notification.message.match(/需求「([^」]+)」/);
      const requirementLabel = requirementMatch?.[1] ?? "需求";
      const requirementIdMatch = notification.link?.match(/\/my\/requirements\/([^/?#]+)/);
      const requirementId = requirementIdMatch?.[1] ?? null;
      const link = requirementId ? `/requirements/${requirementId}` : null;

      await notifyUsers({
        recipientIds: [notification.actorId],
        actorId: request.user.sub,
        type: "requirement.interest.reply",
        title: `客戶「${senderLabel}」回覆需求興趣`,
        message: `需求「${requirementLabel}」回覆：${message}`,
        link,
      });

      if (request.user?.sub) {
        await addAuditLog({
          actorId: request.user.sub,
          targetUserId: notification.actorId,
          action: "REQUIREMENT_INTEREST_REPLIED",
          before: null,
          after: {
            notificationId: id,
            requirementId,
            message,
          },
        });
      }

      return { ok: true };
    }
  );
};

export default notificationsRoutes;
